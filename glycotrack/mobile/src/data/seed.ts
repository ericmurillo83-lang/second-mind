import { addDays, combine, startOfWeek, toDateKey } from '@/domain/dates';
import type {
  AppData,
  Appointment,
  DoseLog,
  GlucoseContext,
  GlucoseReading,
  HealthRecord,
  MealLog,
  MealPlanEntry,
  MealSlot,
  MedicalNote,
  Medication,
  Recipe,
} from '@/domain/types';

/**
 * FICTIONAL SAMPLE DATA — for demonstration only.
 *
 * Every person, clinic, reading, lab value, recipe carb count and prescription below is
 * invented. All records carry `demo: true` so the UI can label them and the user can remove
 * them in one tap. Nothing here is medical guidance.
 */

export const DEMO_LABEL = 'Fictional sample data';

/** Deterministic PRNG so sample data (and tests) are stable for a given day. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type DemoCollections = Pick<
  AppData,
  | 'glucose'
  | 'recipes'
  | 'meals'
  | 'mealPlan'
  | 'medications'
  | 'doseLogs'
  | 'appointments'
  | 'notes'
  | 'records'
>;

export function createDemoData(now: Date): DemoCollections {
  const today = toDateKey(now);
  const rand = mulberry32(Number(today.replaceAll('-', '')));
  const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const created = addDays(now, -90).toISOString();
  let seq = 0;
  const base = (prefix: string) => ({
    id: `demo_${prefix}_${++seq}`,
    createdAt: created,
    updatedAt: created,
    demo: true as const,
  });

  // ---- Recipes ----
  const recipeDefs: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'demo'>[] = [
    {
      name: 'Greek Yogurt Berry Bowl',
      description: 'Plain Greek yogurt with mixed berries, walnuts and cinnamon.',
      servings: 1,
      carbsPerServing: 24,
      prepMinutes: 5,
      tags: ['Breakfast', 'Quick', 'High protein'],
      ingredients: ['¾ cup plain Greek yogurt', '½ cup mixed berries', '1 tbsp chopped walnuts', 'Pinch of cinnamon'],
      steps: ['Spoon yogurt into a bowl.', 'Top with berries, walnuts and cinnamon.'],
      favorite: true,
    },
    {
      name: 'Spinach & Feta Omelet',
      description: 'Fluffy two-egg omelet folded with wilted spinach and feta.',
      servings: 1,
      carbsPerServing: 6,
      prepMinutes: 10,
      tags: ['Breakfast', 'Lower carb', 'Quick'],
      ingredients: ['2 eggs', '1 cup baby spinach', '2 tbsp crumbled feta', '1 tsp olive oil', 'Salt and pepper'],
      steps: ['Wilt spinach in olive oil.', 'Pour in beaten eggs and cook gently.', 'Add feta, fold and serve.'],
      favorite: false,
    },
    {
      name: 'Overnight Oats with Chia',
      description: 'Make-ahead oats with chia seeds, unsweetened almond milk and sliced almonds.',
      servings: 2,
      carbsPerServing: 34,
      prepMinutes: 5,
      tags: ['Breakfast', 'Meal prep'],
      ingredients: ['1 cup rolled oats', '2 tbsp chia seeds', '1½ cups unsweetened almond milk', '2 tbsp sliced almonds'],
      steps: ['Stir everything together in a jar.', 'Refrigerate overnight.', 'Divide into two servings.'],
      favorite: true,
    },
    {
      name: 'Turkey Lettuce Wraps',
      description: 'Savory ground turkey with water chestnuts in crisp butter lettuce cups.',
      servings: 3,
      carbsPerServing: 9,
      prepMinutes: 15,
      tags: ['Lunch', 'Lower carb', 'Quick'],
      ingredients: ['1 lb ground turkey', '1 can water chestnuts, diced', '2 tbsp low-sodium soy sauce', '1 head butter lettuce'],
      steps: ['Brown the turkey.', 'Stir in water chestnuts and soy sauce.', 'Spoon into lettuce leaves.'],
      favorite: false,
    },
    {
      name: 'Lentil & Vegetable Soup',
      description: 'Hearty soup with green lentils, carrots, celery and tomatoes.',
      servings: 6,
      carbsPerServing: 28,
      prepMinutes: 40,
      tags: ['Lunch', 'Vegetarian', 'Meal prep'],
      ingredients: ['1½ cups green lentils', '2 carrots', '2 celery stalks', '1 can diced tomatoes', '6 cups vegetable broth'],
      steps: ['Sauté chopped vegetables.', 'Add lentils, tomatoes and broth.', 'Simmer 30 minutes until tender.'],
      favorite: true,
    },
    {
      name: 'Chickpea Salad Bowl',
      description: 'Chickpeas, cucumber, tomato and herbs with a lemon-tahini dressing.',
      servings: 2,
      carbsPerServing: 30,
      prepMinutes: 15,
      tags: ['Lunch', 'Vegetarian'],
      ingredients: ['1 can chickpeas, rinsed', '1 cucumber', '1 cup cherry tomatoes', '2 tbsp tahini', '1 lemon'],
      steps: ['Chop vegetables.', 'Whisk tahini with lemon juice.', 'Toss everything together.'],
      favorite: false,
    },
    {
      name: 'Lemon Herb Chicken with Quinoa',
      description: 'Roasted chicken breast with herbs over fluffy quinoa and greens.',
      servings: 4,
      carbsPerServing: 32,
      prepMinutes: 35,
      tags: ['Dinner', 'High protein'],
      ingredients: ['4 chicken breasts', '1 cup dry quinoa', '2 lemons', 'Fresh parsley and thyme', '4 cups mixed greens'],
      steps: ['Marinate chicken in lemon and herbs.', 'Roast at 425°F for 22 minutes.', 'Cook quinoa and serve together.'],
      favorite: true,
    },
    {
      name: 'Salmon, Broccoli & Brown Rice',
      description: 'Sheet-pan salmon and broccoli with a side of brown rice.',
      servings: 2,
      carbsPerServing: 38,
      prepMinutes: 30,
      tags: ['Dinner', 'High protein'],
      ingredients: ['2 salmon fillets', '3 cups broccoli florets', '⅔ cup cooked brown rice per serving', 'Olive oil, garlic'],
      steps: ['Roast salmon and broccoli at 400°F for 15 minutes.', 'Serve with brown rice.'],
      favorite: false,
    },
    {
      name: 'Zucchini Noodle Bolognese',
      description: 'Classic meat sauce over spiralized zucchini.',
      servings: 4,
      carbsPerServing: 14,
      prepMinutes: 30,
      tags: ['Dinner', 'Lower carb'],
      ingredients: ['1 lb lean ground beef', '1 jar marinara (no added sugar)', '4 medium zucchini', 'Parmesan'],
      steps: ['Brown the beef and add marinara.', 'Spiralize and lightly sauté zucchini.', 'Top with sauce and Parmesan.'],
      favorite: false,
    },
    {
      name: 'Apple Slices & Almond Butter',
      description: 'A crisp, simple snack.',
      servings: 1,
      carbsPerServing: 19,
      prepMinutes: 3,
      tags: ['Snack', 'Quick'],
      ingredients: ['1 small apple', '1 tbsp almond butter'],
      steps: ['Slice the apple and serve with almond butter.'],
      favorite: false,
    },
  ];
  const recipes: Recipe[] = recipeDefs.map((r) => ({ ...base('recipe'), ...r }));
  const bySlot = (tag: string) => recipes.filter((r) => r.tags.includes(tag));
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];

  // ---- Glucose readings (manual fingerstick-style log, 45 days) ----
  const glucose: GlucoseReading[] = [];
  const slots: { context: GlucoseContext; time: [number, number]; range: [number, number]; p: number }[] = [
    { context: 'fasting', time: [6.5, 7.5], range: [92, 138], p: 0.95 },
    { context: 'after_meal', time: [9, 10], range: [128, 196], p: 0.5 },
    { context: 'before_meal', time: [11.75, 12.5], range: [88, 142], p: 0.7 },
    { context: 'after_meal', time: [14, 15], range: [118, 205], p: 0.55 },
    { context: 'before_meal', time: [17.5, 18.5], range: [90, 150], p: 0.6 },
    { context: 'after_meal', time: [20, 21], range: [130, 215], p: 0.6 },
    { context: 'bedtime', time: [22, 23], range: [104, 168], p: 0.75 },
  ];
  for (let d = 44; d >= 0; d--) {
    const day = toDateKey(addDays(now, -d));
    for (const s of slots) {
      if (rand() > s.p) continue;
      const hours = between(s.time[0], s.time[1]);
      const at = combine(day, '00:00');
      at.setMinutes(Math.round(hours * 60));
      if (at.getTime() > now.getTime()) continue;
      let value = between(s.range[0], s.range[1]);
      const roll = rand();
      if (roll < 0.035) value = between(58, 68); // occasional below-range value
      else if (roll > 0.965) value = between(232, 268); // occasional above-range value
      glucose.push({
        ...base('glucose'),
        createdAt: at.toISOString(),
        updatedAt: at.toISOString(),
        valueMgdl: Math.round(value),
        takenAt: at.toISOString(),
        context: s.context,
        source: 'manual',
        note: rand() < 0.06 ? pick(['After a 30-minute walk', 'Late dinner', 'Felt great today', 'Busy day at work']) : undefined,
      });
    }
  }

  // ---- Meal logs (past 7 days up to now) ----
  const meals: MealLog[] = [];
  const mealTimes: { slot: MealSlot; tag: string; time: string }[] = [
    { slot: 'breakfast', tag: 'Breakfast', time: '07:40' },
    { slot: 'lunch', tag: 'Lunch', time: '12:30' },
    { slot: 'snack', tag: 'Snack', time: '15:30' },
    { slot: 'dinner', tag: 'Dinner', time: '18:45' },
  ];
  for (let d = 6; d >= 0; d--) {
    const day = toDateKey(addDays(now, -d));
    for (const m of mealTimes) {
      if (m.slot === 'snack' && rand() < 0.5) continue;
      const at = combine(day, m.time);
      if (at.getTime() > now.getTime()) continue;
      const recipe = pick(bySlot(m.tag));
      const servings = m.slot === 'snack' || recipe.servings === 1 ? 1 : pick([1, 1, 1.5]);
      meals.push({
        ...base('meal'),
        eatenAt: at.toISOString(),
        slot: m.slot,
        title: recipe.name,
        carbs: Math.round(recipe.carbsPerServing * servings * 10) / 10,
        recipeId: recipe.id,
        servings,
      });
    }
  }

  // ---- Meal plan (this week) ----
  const mealPlan: MealPlanEntry[] = [];
  const weekStart = startOfWeek(now);
  for (let i = 0; i < 7; i++) {
    const date = toDateKey(addDays(weekStart, i));
    for (const [slot, tag] of [
      ['breakfast', 'Breakfast'],
      ['lunch', 'Lunch'],
      ['dinner', 'Dinner'],
    ] as const) {
      if (rand() < 0.15) continue; // leave a few open slots to plan
      mealPlan.push({ ...base('plan'), date, slot, recipeId: pick(bySlot(tag)).id, servings: 1 });
    }
  }

  // ---- Medications (fictional prescriptions; no insulin, no dosing logic) ----
  const prescriber = 'Dr. Jordan Rivera (fictional)';
  const medications: Medication[] = [
    {
      ...base('med'),
      name: 'Metformin',
      strength: '500 mg',
      form: 'tablet',
      instructions: 'Sample instruction: take with breakfast and dinner, as prescribed.',
      times: ['08:00', '19:00'],
      remindersOn: true,
      active: true,
      prescriber,
      refillOn: toDateKey(addDays(now, 5)),
    },
    {
      ...base('med'),
      name: 'Atorvastatin',
      strength: '20 mg',
      form: 'tablet',
      instructions: 'Sample instruction: once daily in the evening.',
      times: ['21:00'],
      remindersOn: true,
      active: true,
      prescriber,
      refillOn: toDateKey(addDays(now, 19)),
    },
    {
      ...base('med'),
      name: 'Vitamin D3',
      strength: '1,000 IU',
      form: 'capsule',
      instructions: 'Sample instruction: once daily with food.',
      times: ['08:00'],
      remindersOn: false,
      active: true,
    },
  ];

  // ---- Dose logs (last 7 days, mostly taken) ----
  const doseLogs: DoseLog[] = [];
  for (let d = 7; d >= 0; d--) {
    const day = toDateKey(addDays(now, -d));
    for (const med of medications) {
      for (const time of med.times) {
        const at = combine(day, time);
        // Leave today's most recent doses unlogged so the checklist has something to do.
        if (at.getTime() > now.getTime() - (d === 0 ? 3 * 3_600_000 : 0)) continue;
        const roll = rand();
        if (roll < 0.05) continue; // not logged
        doseLogs.push({
          ...base('dose'),
          medicationId: med.id,
          date: day,
          time,
          status: roll < 0.1 ? 'skipped' : 'taken',
        });
      }
    }
  }

  // ---- Appointments ----
  const appt = (
    days: number,
    time: string,
    a: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'demo' | 'startsAt'>,
  ): Appointment => ({
    ...base('appt'),
    startsAt: combine(toDateKey(addDays(now, days)), time).toISOString(),
    ...a,
  });
  const appointments: Appointment[] = [
    appt(6, '10:30', {
      title: 'Endocrinology follow-up',
      provider: prescriber,
      specialty: 'Endocrinology',
      location: 'Sample Health Clinic, Suite 200',
      durationMinutes: 30,
      notes: 'Bring: glucose log export, medication list.\nAsk about: recent after-dinner readings.',
    }),
    appt(20, '14:00', {
      title: 'Diabetic eye exam',
      provider: 'Dr. Priya Shah (fictional)',
      specialty: 'Ophthalmology',
      location: 'Example Eye Center',
      durationMinutes: 60,
      notes: 'Pupils may be dilated. Arrange a ride home.',
    }),
    appt(34, '09:00', {
      title: 'Nutrition coaching',
      provider: 'Sam Lee, RD (fictional)',
      specialty: 'Nutrition',
      location: 'Video visit',
      durationMinutes: 45,
      notes: 'Share this week’s meal plan.',
    }),
    appt(-12, '08:00', {
      title: 'Lab work: A1C & lipid panel',
      provider: 'Sample Lab Services',
      specialty: 'Laboratory',
      location: 'Sample Lab, 1st floor',
      durationMinutes: 15,
      notes: 'Fasting from midnight (sample instruction).',
    }),
    appt(-45, '15:30', {
      title: 'Foot exam',
      provider: 'Dr. Morgan Ellis (fictional)',
      specialty: 'Podiatry',
      location: 'Sample Health Clinic, Suite 110',
      durationMinutes: 30,
      notes: '',
    }),
  ];

  // ---- Medical notes ----
  const note = (days: number, n: Omit<MedicalNote, 'id' | 'createdAt' | 'updatedAt' | 'demo'>): MedicalNote => {
    const at = addDays(now, -days).toISOString();
    return { ...base('note'), createdAt: at, updatedAt: at, ...n };
  };
  const notes: MedicalNote[] = [
    note(1, {
      title: 'Questions for endocrinology visit',
      body: '• Are my after-dinner readings something to discuss?\n• Should I change when I check before bed?\n• Refill timing for Metformin.',
      tags: ['Appointment prep'],
    }),
    note(4, {
      title: 'Walking after dinner',
      body: 'Started a 20-minute walk after dinner this week. Logging how I feel.',
      tags: ['Activity'],
    }),
    note(12, {
      title: 'Lab visit',
      body: 'Blood draw went smoothly. Results posted to the patient portal two days later.',
      tags: ['Labs'],
    }),
  ];

  // ---- Health records (fictional lab results) ----
  const rec = (days: number, r: Omit<HealthRecord, 'id' | 'createdAt' | 'updatedAt' | 'demo' | 'recordedOn'>): HealthRecord => ({
    ...base('record'),
    recordedOn: toDateKey(addDays(now, -days)),
    ...r,
  });
  const records: HealthRecord[] = [
    rec(10, { name: 'A1C', value: '6.9', unit: '%', notes: 'Fictional value for demonstration.' }),
    rec(10, { name: 'LDL cholesterol', value: '96', unit: 'mg/dL', notes: '' }),
    rec(10, { name: 'eGFR', value: '92', unit: 'mL/min/1.73m²', notes: '' }),
    rec(10, { name: 'Blood pressure', value: '124/78', unit: 'mmHg', notes: 'Taken at lab visit.' }),
    rec(101, { name: 'A1C', value: '7.2', unit: '%', notes: 'Fictional value for demonstration.' }),
  ];

  return { glucose, recipes, meals, mealPlan, medications, doseLogs, appointments, notes, records };
}
