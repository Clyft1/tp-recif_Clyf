import { FISH_STATUSES, SPECIES, type Fish } from "../models/fish.js";
import { isoDate, oneOf, optional, text, type Schema } from "./validation.js";

// ---------------------------------------------------------------- ENTRÉE : ce qu'on accepte

// Un poisson est décrit UNE fois, pour la création comme pour la modification
export const fishSchema: Schema = {
  name: text(1, 50),
  species: oneOf(SPECIES),
  breed: optional(text(0, 50)),
  birthDate: optional(isoDate),
  description: optional(text(0, 1000)),
  internalNotes: optional(text(0, 1000)),
};

// Les filtres de la query string : ?species=…&status=…
export const fishFiltersSchema: Schema = {
  species: optional(oneOf(SPECIES)),
  status: optional(oneOf(FISH_STATUSES)),
};

// ---------------------------------------------------------------- SORTIE : ce qu'on expose

// Ce que voit le public : chaque champ est choisi explicitement
export type FishPublicDto = Pick<Fish, "id" | "name" | "species" | "breed" | "birthDate" | "description" | "status">;
// Ce que voit le personnel : la même chose + les notes internes et la date d'arrivée
export type FishStaffDto = FishPublicDto & Pick<Fish, "internalNotes" | "createdAt">;

export const toFishPublicDto = (a: Fish): FishPublicDto => ({
  id: a.id,
  name: a.name,
  species: a.species,
  breed: a.breed,
  birthDate: a.birthDate,
  description: a.description,
  status: a.status,
});

export const toFishStaffDto = (a: Fish): FishStaffDto => ({
  ...toFishPublicDto(a),
  internalNotes: a.internalNotes,
  createdAt: a.createdAt,
});