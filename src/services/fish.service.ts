import type { FishDao } from "../data/fish.dao.js";
import { AppError } from "../errors/app-error.js";
import type { Fish, FishChanges, FishFilters, NewFish } from "../models/fish.js";

// Les règles du Récif pour les poissons. Aucune trace d'Express ici : pas de requête ni de réponse HTTP.
export class FishService {
  constructor(private readonly fishes: FishDao) {}

  list(filters: FishFilters = {}): Promise<Fish[]> {
    return this.fishes.findAll(filters);
  }

  async get(id: number): Promise<Fish> {
    const fish = await this.fishes.findById(id);
    if (!fish) throw new AppError(404, "NOT_FOUND", `Poisson ${id} introuvable`);
    return fish;
  }

  create(data: NewFish): Promise<Fish> {
    return this.fishes.create(data);
  }

  async update(id: number, changes: FishChanges): Promise<Fish> {
    const fish = await this.fishes.update(id, changes);
    if (!fish) throw new AppError(404, "NOT_FOUND", `Poisson ${id} introuvable`);
    return fish;
  }

  async remove(id: number): Promise<void> {
    if (!(await this.fishes.delete(id))) throw new AppError(404, "NOT_FOUND", `Poisson ${id} introuvable`);
  }
}