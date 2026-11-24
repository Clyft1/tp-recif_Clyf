import type { AdoptionDao } from "../data/adoption.dao.js";
import type { FishDao } from "../data/fish.dao.js";
import { AppError } from "../errors/app-error.js";
import type { AdoptionFilters, AdoptionRequest } from "../models/adoption-request.js";

export type AdoptionForm = { adopterName: string; adopterEmail: string; message?: string };

// Les règles du Récif pour les adoptions : 404 si absent, 409 si ce n'est plus possible
export class AdoptionService {
  constructor(
    private readonly adoptions: AdoptionDao,
    private readonly fishes: FishDao,
  ) {}

  async request(fishId: number, form: AdoptionForm): Promise<AdoptionRequest> {
    const fish = await this.fishes.findById(fishId);
    if (!fish) throw new AppError(404, "NOT_FOUND", `Poisson ${fishId} introuvable`);
    if (fish.status !== "disponible") throw new AppError(409, "CONFLICT", "Ce poisson n'est plus disponible");
    return this.adoptions.create({ fishId, ...form });
  }

  list(filters: AdoptionFilters = {}): Promise<AdoptionRequest[]> {
    return this.adoptions.findAll(filters);
  }

  async accept(id: number): Promise<AdoptionRequest> {
    await this.pending(id);
    return this.adoptions.accept(id);
  }

  async refuse(id: number): Promise<AdoptionRequest> {
    await this.pending(id);
    return this.adoptions.refuse(id);
  }

  // Une demande ne peut être décidée qu'une fois, et seulement si elle existe
  private async pending(id: number): Promise<AdoptionRequest> {
    const request = await this.adoptions.findById(id);
    if (!request) throw new AppError(404, "NOT_FOUND", `Demande ${id} introuvable`);
    if (request.status !== "en_attente") throw new AppError(409, "CONFLICT", "Demande déjà traitée");
    return request;
  }
}