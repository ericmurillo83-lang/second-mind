// End-to-end smoke test of the real app (web build) in Chromium.
//
// Covers onboarding, every tab, the main editors, unit/theme settings, persistence across a
// reload, delete-all, and axe-core accessibility scans. Usage:
//   npm run export:web && npm run e2e            (screenshots → e2e/artifacts)
//   E2E_SHOTS=../docs/screenshots npm run e2e    (refresh the documentation screenshots)
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = resolve(import.meta.dirname, '..');
const shots = resolve(root, process.env.E2E_SHOTS ?? 'e2e/artifacts');
mkdirSync(shots, { recursive: true });

const server = await serve(join(root, 'dist'));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const page = await context.newPage();

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('dialog', (d) => d.accept()); // web confirm() for destructive actions

const results = [];
const a11y = {};
async function step(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e?.message ?? e) });
    console.log(`  ✗ ${name}\n    ${String(e?.message ?? e).split('\n').slice(0, 4).join('\n    ')}`);
    await page.screenshot({ path: join(shots, `FAILED-${name.replace(/\W+/g, '-')}.png`) }).catch(() => {});
  }
}
const byId = (id) => page.getByTestId(id, { exact: true });
const shot = (name) => page.screenshot({ path: join(shots, `${name}.png`) });
const settle = () => page.waitForTimeout(400);

async function axe(label) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const { violations } = await page.evaluate(() =>
    // eslint-disable-next-line no-undef
    axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }),
  );
  a11y[label] = violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, sample: v.nodes[0]?.target?.join(' ') }));
  const blocking = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  assert.equal(blocking.length, 0, `${label}: ${blocking.map((v) => `${v.id} (${v.nodes.length}) e.g. ${v.nodes[0]?.target}`).join('; ')}`);
}

async function goTab(name) {
  await byId(`tab-${name}`).click();
  await byId(`${name === 'home' ? 'home' : name}-screen`).waitFor();
  await settle();
}

console.log(`GlycoTrack E2E against ${base}`);

await step('onboarding requires safety acknowledgement', async () => {
  await page.goto(base);
  await page.getByText('Welcome to GlycoTrack').waitFor();
  await shot('01-welcome');
  assert.equal(await byId('start-demo').getAttribute('aria-disabled'), 'true');
  await axe('welcome');
  await byId('ack-checkbox').click();
  await byId('name-input').fill('Alex');
  await byId('start-demo').click();
  await byId('home-screen').waitFor();
});

await step('home dashboard shows sample data clearly labelled', async () => {
  await byId('demo-banner').waitFor();
  assert.match(await byId('latest-value').innerText(), /^\d+$/);
  await page.getByText('Good', { exact: false }).first().waitFor();
  await settle();
  await shot('02-home');
  await axe('home');
});

await step('log a glucose reading', async () => {
  await byId('log-glucose').click();
  await byId('glucose-value').fill('128');
  await byId('context-before_meal').click();
  await shot('03-log-glucose');
  await axe('log-glucose');
  await byId('save-reading').click();
  await byId('home-screen').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="latest-value"]')?.textContent === '128');
});

await step('glucose history: chart, stats, periods, edit', async () => {
  await goTab('glucose');
  await byId('period-30').click();
  await settle();
  const label = await byId('glucose-chart').getAttribute('aria-label');
  assert.match(label ?? '', /last 30 days: \d+ readings/);
  await shot('04-glucose');
  await axe('glucose');
  await page.locator('[data-testid^="glucose-row-"]').first().click();
  await byId('glucose-value').waitFor();
  assert.equal(await byId('glucose-value').inputValue(), '128');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await byId('glucose-screen').waitFor();
});

await step('meals: today, weekly plan, recipes, log from recipe', async () => {
  await goTab('meals');
  const before = await byId('meals-carbs-total').innerText();
  await shot('05-meals-today');
  await axe('meals-today');
  await byId('meals-view-plan').click();
  await byId('planned-carbs').waitFor();
  await settle();
  await shot('06-meals-plan');
  await axe('meals-plan');
  await byId('meals-view-recipes').click();
  await byId('recipe-search').fill('oats');
  await settle();
  await shot('07-recipes');
  await page.locator('[data-testid^="recipe-demo_"]').first().click();
  await byId('recipe-detail').waitFor();
  await settle();
  await shot('08-recipe-detail');
  await axe('recipe-detail');
  await byId('recipe-log').click();
  await byId('meal-carbs').waitFor();
  assert.equal(await byId('meal-carbs').inputValue(), '34');
  await byId('save-meal').click();
  await byId('recipe-detail').waitFor();
  await page.goBack();
  await byId('meals-screen').waitFor();
  await byId('meals-view-today').click();
  await page.waitForFunction(
    (prev) => document.querySelector('[data-testid="meals-carbs-total"]')?.textContent !== prev,
    before,
  );
});

await step('medications: checklist and adherence', async () => {
  await goTab('meds');
  const progress = await byId('dose-progress').innerText();
  // Scope to this screen: the Home tab stays mounted (hidden) with its own dose rows.
  const takeButtons = byId('meds-screen').locator('[data-testid^="dose-take-"]');
  if ((await takeButtons.count()) > 0) {
    // Center it first so the floating tab bar doesn't cover the button.
    await takeButtons.first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await takeButtons.first().click();
    await page.waitForFunction((prev) => document.querySelector('[data-testid="dose-progress"]')?.textContent !== prev, progress);
  }
  await settle();
  await shot('09-meds');
  await axe('meds');
});

await step('care: appointments, notes, records, add a record', async () => {
  await goTab('care');
  await shot('10-care-visits');
  await axe('care');
  await byId('care-view-notes').click();
  await settle();
  await shot('11-care-notes');
  await byId('care-view-records').click();
  await settle();
  await shot('12-care-records');
  await byId('add-care').click();
  await page.getByRole('button', { name: 'A1C' }).click();
  await byId('record-value').fill('6.8');
  await byId('save-record').click();
  await byId('care-screen').waitFor();
  await page.getByText('6.8 %').first().waitFor();
});

await step('settings: privacy controls and unit switch', async () => {
  await goTab('home');
  await byId('open-settings').click();
  await byId('settings-screen').waitFor();
  await settle();
  await shot('13-settings');
  await axe('settings');
  await byId('unit-mmol/L').click();
  await byId('open-safety').click();
  await byId('safety-screen').waitFor();
  await settle();
  await shot('14-safety');
  await page.goBack();
  await byId('settings-screen').waitFor();
  await byId('theme-dark').click();
  await page.goBack();
  await byId('home-screen').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="latest-value"]')?.textContent === '7.1');
  await settle();
  await shot('15-home-dark');
  await axe('home-dark');
  await goTab('glucose');
  await shot('16-glucose-dark');
});

await step('data persists across reload', async () => {
  await page.goto(base); // fresh page load of the app root; data must come back from storage
  await byId('home-screen').waitFor();
  assert.equal(await byId('latest-value').innerText(), '7.1');
  assert.equal(await page.getByText('Welcome to GlycoTrack').count(), 0);
});

await step('delete all data returns to onboarding', async () => {
  await byId('open-settings').click();
  await byId('delete-all').click();
  await page.getByText('Welcome to GlycoTrack').waitFor();
  await page.reload();
  await page.getByText('Welcome to GlycoTrack').waitFor();
});

await step('no uncaught page errors', async () => {
  assert.deepEqual(pageErrors, []);
});

writeFileSync(join(shots, 'results.json'), JSON.stringify({ results, a11y }, null, 2));
await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} steps passed. Screenshots: ${shots}`);
process.exit(failed.length ? 1 : 0);
