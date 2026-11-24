import type { RequestHandler } from "express";
import type { FishChanges, FishFilters, NewFish } from "../models/fish.js";
import { parseId } from "../schemas/common.js";
import { fishSchema } from "../schemas/fish.schema.js";
import { parse } from "../schemas/validation.js";
import type { FishService } from "../services/fish.service.js";

// Le contrôleur traduit HTTP ↔ service : il lit la requête, appelle le service, répond.
// Méthodes fléchées : `this` reste lié quand Express les appelle.
export class FishController {
  constructor(private readonly fishes: FishService) {}

  list: RequestHandler = async (req, res) => {
    res.json(await this.fishes.list(req.query as FishFilters));
  };

  getOne: RequestHandler = async (req, res) => {
    res.json(await this.fishes.get(parseId(req.params.id)));
  };

  create: RequestHandler = async (req, res) => {
    res.status(201).json(await this.fishes.create(parse<NewFish>(fishSchema, req.body)));
  };

  update: RequestHandler = async (req, res) => {
    const id = parseId(req.params.id);
    res.json(await this.fishes.update(id, parse<FishChanges>(fishSchema, req.body, { partial: true })));
  };

  remove: RequestHandler = async (req, res) => {
    await this.fishes.remove(parseId(req.params.id));
    res.status(204).end();
  };
}