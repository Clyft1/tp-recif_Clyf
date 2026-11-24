import { SPECIES } from "../models/fish.js";
import { isoDate, oneOf, optional, text, type Schema } from "./validation.js";

// Un poisson est décrit UNE fois, pour la création comme pour la modification
export const fishSchema: Schema = {
  name: text(1, 50),
  species: oneOf(SPECIES),
  breed: optional(text(0, 50)),
  birthDate: optional(isoDate),
  description: optional(text(0, 1000)),
  internalNotes: optional(text(0, 1000)),
};