import express from "express";
import { db } from "./data/db.js";
import { SqliteFishDao } from "./data/fish.dao.js";
import { SqliteAdoptionDao } from "./data/adoption.dao.js";
import { AppError } from "./errors/app-error.js";
import { requireApiKey } from "./middlewares/require-api-key.js";
import { notFound } from "./middlewares/not-found.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { parseId } from "./schemas/common.js";
import { parse } from "./schemas/validation.js";
import { fishSchema } from "./schemas/fish.schema.js";
import { adoptionSchema } from "./schemas/adoption.schema.js";
import type { FishChanges, FishFilters, NewFish } from "./models/fish.js";
import type { AdoptionFilters } from "./models/adoption-request.js";

export function createApp() {
  const app = express();
  const fishes = new SqliteFishDao(db);
  const adoptions = new SqliteAdoptionDao(db);

  app.use(express.json());

  // ---------------------------------------------------------------- POISSONS

  app.get("/fish", async (req, res) => {
    res.json(await fishes.findAll(req.query as FishFilters));
  });

  app.get("/fish/:id", async (req, res) => {
    const id = parseId(req.params.id);
    const fish = await fishes.findById(id);
    if (!fish) throw new AppError(404, "NOT_FOUND", `Poisson ${id} introuvable`);
    res.json({ ...fish, requests: await adoptions.findByFish(id) });
  });

  app.post("/fish", requireApiKey, async (req, res) => {
    const data = parse<NewFish>(fishSchema, req.body);
    res.status(201).json(await fishes.create(data));
  });

  app.put("/fish/:id", requireApiKey, async (req, res) => {
    const id = parseId(req.params.id);
    const changes = parse<FishChanges>(fishSchema, req.body, { partial: true });
    const fish = await fishes.update(id, changes);
    if (!fish) throw new AppError(404, "NOT_FOUND", `Poisson ${id} introuvable`);
    res.json(fish);
  });

  app.delete("/fish/:id", requireApiKey, async (req, res) => {
    const id = parseId(req.params.id);
    if (!(await fishes.findById(id))) throw new AppError(404, "NOT_FOUND", `Poisson ${id} introuvable`);
    await adoptions.deleteByFish(id);
    await fishes.delete(id);
    res.status(204).end();
  });

  // ---------------------------------------------------------------- ADOPTIONS

  app.post("/fish/:id/adoptions", async (req, res) => {
    const id = parseId(req.params.id);
    const form = parse(adoptionSchema, req.body);
    const fish = await fishes.findById(id);
    if (!fish) throw new AppError(404, "NOT_FOUND", `Poisson ${id} introuvable`);
    if (fish.status !== "disponible") throw new AppError(409, "CONFLICT", "Ce poisson n'est plus disponible");
    // Deux DAO appelés à la suite : c'est normal à ce stade (corrigé à l'étape 6)
    const request = await adoptions.create({ fishId: id, adopterName: form.adopterName, adopterEmail: form.adopterEmail, message: form.message });
    await fishes.updateStatus(id, "reserve");
    res.status(201).json(request);
  });

  app.get("/adoptions", requireApiKey, async (req, res) => {
    res.json(await adoptions.findAll(req.query as AdoptionFilters));
  });

  const decide = (decision: "acceptee" | "refusee"): express.RequestHandler => async (req, res) => {
    const id = parseId(req.params.id);
    const request = await adoptions.findById(id);
    if (!request) throw new AppError(404, "NOT_FOUND", `Demande ${id} introuvable`);
    if (request.status !== "en_attente") throw new AppError(409, "CONFLICT", "Demande déjà traitée");
    await adoptions.setStatus(id, decision);
    await fishes.updateStatus(request.fishId, decision === "acceptee" ? "adopte" : "disponible");
    res.json(await adoptions.findById(id));
  };

  app.post("/adoptions/:id/accept", requireApiKey, decide("acceptee"));
  app.post("/adoptions/:id/refuse", requireApiKey, decide("refusee"));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}