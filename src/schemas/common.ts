// Un identifiant valide est un entier strictement positif : "abc", "0" ou "1.5" sont refusés
export function parseId(raw: unknown): number | null {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 ? id : null;
}