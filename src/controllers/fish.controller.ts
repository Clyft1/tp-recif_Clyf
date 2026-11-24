import type { RequestHandler } from "express";
import type { FishChanges, FishFilters, NewFish } from "../models/fish.js";
import { parseId } from "../dto/common.js";
import { fishFiltersSchema, fishSchema, toFishPublicDto, toFishStaffDto } from "../dto/fish.dto.js";
import { parse } from "../dto/validation.js";
import type { FishService } from "../services/fish.service.js";

// DTO d'entrée → service → DTO de sortie : c'est la « vue » du MVC.
// Méthodes fléchées : `this` reste lié quand Express les appelle.
export class FishController {
  constructor(private readonly fishes: FishService) {}

  // Public
  list: RequestHandler = async (req, res) => {
    const filters = parse<FishFilters>(fishFiltersSchema, req.query, { partial: true });
    res.json((await this.fishes.list(filters)).map(toFishPublicDto));
  };

  getOne: RequestHandler = async (req, res) => {
    res.json(toFishPublicDto(await this.fishes.get(parseId(req.params.id))));
  };

  // Personnel
  create: RequestHandler = async (req, res) => {
    const data = parse<NewFish>(fishSchema, req.body, { strict: true });
    res.status(201).json(toFishStaffDto(await this.fishes.create(data)));
  };

  update: RequestHandler = async (req, res) => {
    const id = parseId(req.params.id);
    const changes = parse<FishChanges>(fishSchema, req.body, { partial: true, strict: true });
    res.json(toFishStaffDto(await this.fishes.update(id, changes)));
  };

  remove: RequestHandler = async (req, res) => {
    await this.fishes.remove(parseId(req.params.id));
    res.status(204).end();
  };
}