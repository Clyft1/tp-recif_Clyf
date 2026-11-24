import { ADOPTION_STATUSES, type AdoptionRequest } from "../models/adoption-request.js";
import { email, oneOf, optional, text, type Schema } from "./validation.js";

// ---------------------------------------------------------------- ENTRÉE

export const adoptionSchema: Schema = {
  adopterName: text(1, 80),
  adopterEmail: email,
  message: optional(text(0, 500)),
};

export const adoptionFiltersSchema: Schema = {
  status: optional(oneOf(ADOPTION_STATUSES)),
};

// ---------------------------------------------------------------- SORTIE

// L'adoptant reçoit juste l'accusé de réception de sa demande
export type AdoptionPublicDto = Pick<AdoptionRequest, "id" | "fishId" | "status" | "createdAt">;
// Le personnel voit la demande complète
export type AdoptionStaffDto = AdoptionRequest;

export const toAdoptionPublicDto = (r: AdoptionRequest): AdoptionPublicDto => ({
  id: r.id,
  fishId: r.fishId,
  status: r.status,
  createdAt: r.createdAt,
});

export const toAdoptionStaffDto = (r: AdoptionRequest): AdoptionStaffDto => ({
  id: r.id,
  fishId: r.fishId,
  adopterName: r.adopterName,
  adopterEmail: r.adopterEmail,
  message: r.message,
  status: r.status,
  createdAt: r.createdAt,
  decidedAt: r.decidedAt,
});