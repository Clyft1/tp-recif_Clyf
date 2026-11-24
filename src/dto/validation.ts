import { AppError } from "../errors/app-error.js";

// Boîte à outils de validation : chaque règle est écrite une seule fois.
// Une règle reçoit une valeur et renvoie un message d'erreur, ou null si tout va bien.
export type Rule = (value: unknown) => string | null;
export type Schema = Record<string, Rule>; // nom du champ → sa règle

export const text = (min: number, max: number): Rule => (value) =>
  typeof value === "string" && value.trim().length >= min && value.trim().length <= max
    ? null
    : `texte de ${min} à ${max} caractères attendu`;

export const oneOf = (values: readonly string[]): Rule => (value) =>
  typeof value === "string" && values.includes(value) ? null : "valeur inconnue";

// Une regex simple suffit : quelque chose@quelque chose.quelque chose
export const email: Rule = (value) =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : "email invalide";

// AAAA-MM-JJ, et une date qui existe vraiment (pas de 31 février)
export const isoDate: Rule = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "date AAAA-MM-JJ attendue";
  const date = new Date(`${value}T00:00:00Z`);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? null : "date inexistante";
};

// Champ facultatif : absent ou null, il est accepté ; présent, il doit respecter la règle
export const optional = (rule: Rule): Rule => (value) =>
  value === undefined || value === null ? null : rule(value);

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

export type ValidationOptions = {
  partial?: boolean; // pour une modification : les champs absents sont ignorés
  strict?: boolean; // un champ qui n'est pas dans le schéma (status, id…) est une erreur
};

export function validate<T = Record<string, any>>(schema: Schema, input: unknown, options: ValidationOptions = {}): ValidationResult<T> {
  const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  const errors: string[] = [];

  if (options.strict) {
    for (const field of Object.keys(body)) {
      if (!(field in schema)) errors.push(`${field} : champ non autorisé`);
    }
  }

  for (const [field, rule] of Object.entries(schema)) {
    const value = body[field];
    if (value === undefined && options.partial) continue; // absent d'une modification : on n'y touche pas
    const error = rule(value);
    if (error) errors.push(`${field} : ${error}`);
    else if (value !== undefined) data[field] = typeof value === "string" ? value.trim() : value;
  }
  // Les champs qui ne sont PAS dans le schéma ne sont jamais recopiés.
  return errors.length > 0 ? { ok: false, errors } : { ok: true, data: data as T };
}

// Comme validate, mais lève une AppError 400 au lieu de renvoyer la liste des erreurs
export function parse<T = Record<string, any>>(schema: Schema, input: unknown, options: ValidationOptions = {}): T {
  const result = validate<T>(schema, input, options);
  if (!result.ok) throw new AppError(400, "VALIDATION_ERROR", result.errors.join(" ; "));
  return result.data;
}