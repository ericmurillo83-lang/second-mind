/** Collision-resistant local IDs without native crypto dependencies. */
let counter = 0;

export function newId(prefix: string): string {
  counter = (counter + 1) % 1_000_000;
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}${counter.toString(36)}${rand}`;
}
