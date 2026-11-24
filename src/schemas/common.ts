import { AppError } from "../errors/app-error.js";

// Un identifiant valide est un entier strictement positif : "abc", "0" ou "1.5" sont refusés
export function parseId(raw: unknown): number {
  const id = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : 0;
  if (id <= 0) throw new AppError(400, "VALIDATION_ERROR", `Identifiant invalide : ${String(raw)}`);
  return id;
}