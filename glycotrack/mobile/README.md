# GlycoTrack mobile

Expo SDK 58 app (React Native 0.88, React 19.3, TypeScript 6). Project overview, safety rules
and docs live in the [repository README](../README.md).

```bash
npm install
npx expo start                      # dev server (use a development build on devices)
npm run check                       # typecheck + lint + Jest
npm run export:web && npm run e2e   # web build + Playwright/axe end-to-end suite
```

Source map: `src/app` routes · `src/features` feature UI · `src/ui` design system ·
`src/domain` pure logic · `src/data` store & persistence · `src/services` platform services.
