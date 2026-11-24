import type { AdoptionDao } from "../data/adoption.dao.js";
import type { FishDao } from "../data/fish.dao.js";
import { AppError } from "../errors/app-error.js";
import type { AdoptionFilters, AdoptionRequest } from "../models/adoption-request.js";
import type { Notification, Notifier } from "../notifications/notifier.js";

export type AdoptionForm = { adopterName: string; adopterEmail: string; message?: string };

// Les règles du Récif pour les adoptions : 404 si absent, 409 si ce n'est plus possible.
// Après chaque opération réussie, l'adoptant est prévenu.
export class AdoptionService {
  constructor(
    private readonly adoptions: AdoptionDao,
    private readonly fishes: FishDao,
    private readonly notifier: Notifier,
  ) {}

  async request(fishId: number, form: AdoptionForm): Promise<AdoptionRequest> {
    const fish = await this.fishes.findById(fishId);
    if (!fish) throw new AppError(404, "NOT_FOUND", `Poisson ${fishId} introuvable`);
    if (fish.status !== "disponible") throw new AppError(409, "CONFLICT", "Ce poisson n'est plus disponible");
    const request = await this.adoptions.create({ fishId, ...form });
    await this.notify({
      to: request.adopterEmail,
      subject: `Demande reçue pour ${fish.name}`,
      body: `Bonjour ${request.adopterName}, nous avons bien reçu votre demande d'adoption pour ${fish.name}. Nous revenons vers vous très vite.`,
    });
    return request;
  }

  list(filters: AdoptionFilters = {}): Promise<AdoptionRequest[]> {
    return this.adoptions.findAll(filters);
  }

  async accept(id: number): Promise<AdoptionRequest> {
    await this.pending(id);
    const request = await this.adoptions.accept(id);
    const name = await this.fishName(request.fishId);
    await this.notify({
      to: request.adopterEmail,
      subject: `Demande acceptée pour ${name}`,
      body: `Bonne nouvelle ${request.adopterName} : votre demande pour ${name} est acceptée ! Nous vous contactons pour organiser son arrivée.`,
    });
    return request;
  }

  async refuse(id: number): Promise<AdoptionRequest> {
    await this.pending(id);
    const request = await this.adoptions.refuse(id);
    const name = await this.fishName(request.fishId);
    await this.notify({
      to: request.adopterEmail,
      subject: `Demande refusée pour ${name}`,
      body: `Bonjour ${request.adopterName}, nous sommes désolés : votre demande pour ${name} est refusée. D'autres poissons attendent peut-être votre aquarium !`,
    });
    return request;
  }

  // Une demande ne peut être décidée qu'une fois, et seulement si elle existe
  private async pending(id: number): Promise<AdoptionRequest> {
    const request = await this.adoptions.findById(id);
    if (!request) throw new AppError(404, "NOT_FOUND", `Demande ${id} introuvable`);
    if (request.status !== "en_attente") throw new AppError(409, "CONFLICT", "Demande déjà traitée");
    return request;
  }

  private async fishName(fishId: number): Promise<string> {
    return (await this.fishes.findById(fishId))?.name ?? `poisson n°${fishId}`;
  }

  // Une panne d'envoi ne doit pas faire échouer la demande, déjà enregistrée : on la journalise
  private async notify(notification: Notification): Promise<void> {
    try {
      await this.notifier.send(notification);
    } catch (err) {
      console.error(`Notification non envoyée à ${notification.to} :`, err);
    }
  }
}