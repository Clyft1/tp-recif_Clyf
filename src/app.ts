import express, { type Request } from "express";
import { config } from "./config.js";
import { db } from "./data/db.js";
import { buildWhere } from "./utils/query-helper.js";
import { parseId } from "./schemas/common.js";
import { validate } from "./schemas/validation.js";
import { fishSchema } from "./schemas/fish.schema.js";
import { adoptionSchema } from "./schemas/adoption.schema.js";

// La clé d'API est comparée à un seul endroit, à la valeur de la configuration
const isStaff = (req: Request) => req.get("X-Api-Key") === config.adminApiKey;

// Les noms de champs de l'API (camelCase) et les colonnes de la table (snake_case)
const FISH_COLUMNS: Record<string, string> = {
  name: "name",
  species: "species",
  breed: "breed",
  birthDate: "birth_date",
  description: "description",
  internalNotes: "internal_notes",
};

export function createApp() {
  const app = express();

  // ---------------------------------------------------------------- POISSONS

  // Liste des poissons, avec filtres ?species= et ?status=
  app.get("/fish", (req, res) => {
    try {
      const filters: any = {};
      if (req.query.species) filters.species = { op: "eq", value: req.query.species };
      if (req.query.status) filters.status = { op: "eq", value: req.query.status };
      const rows = db.prepare("SELECT * FROM fish " + buildWhere(filters) + " ORDER BY id").all();
      res.json(rows);
    } catch (e) {
      console.log(e);
      res.status(500).send("Erreur");
    }
  });

  // Détail d'un poisson, avec ses demandes d'adoption
  app.get("/fish/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ message: "Identifiant invalide" });
      return;
    }
    const fish: any = db.prepare("SELECT * FROM fish WHERE id = ?").get(id);
    if (!fish) {
      res.status(404).send("Poisson introuvable");
      return;
    }
    fish.requests = db.prepare("SELECT * FROM adoption_requests WHERE fish_id = ?").all(id);
    res.json(fish);
  });

  // Ajout d'un poisson (équipe du Récif)
  app.post("/fish", express.json(), (req, res) => {
    if (!isStaff(req)) {
      res.status(401).json({ message: "Non autorisé" });
      return;
    }
    const result = validate(fishSchema, req.body);
    if (!result.ok) {
      res.status(400).json({ message: "Données invalides", errors: result.errors });
      return;
    }
    const b = result.data;
    const info = db
      .prepare(
        "INSERT INTO fish (name, species, breed, birth_date, description, internal_notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'disponible', ?)",
      )
      .run(b.name, b.species, b.breed ?? null, b.birthDate ?? null, b.description ?? "", b.internalNotes ?? "", new Date().toISOString());
    const fish = db.prepare("SELECT * FROM fish WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(fish);
  });

  // Modification d'un poisson (équipe du Récif)
  app.put("/fish/:id", express.json(), (req, res) => {
    if (!isStaff(req)) {
      res.status(401).json({ error: "Clé API manquante" });
      return;
    }
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ message: "Identifiant invalide" });
      return;
    }
    const result = validate(fishSchema, req.body, { partial: true });
    if (!result.ok) {
      res.status(400).json({ message: "Données invalides", errors: result.errors });
      return;
    }
    const existing = db.prepare("SELECT * FROM fish WHERE id = ?").get(id);
    if (!existing) {
      res.status(404).json({ error: "Poisson introuvable" });
      return;
    }
    // On ne met à jour QUE les champs validés par le schéma, jamais les clés reçues
    const keys = Object.keys(result.data);
    if (keys.length > 0) {
      const sets = keys.map((k) => FISH_COLUMNS[k] + " = ?").join(", ");
      db.prepare("UPDATE fish SET " + sets + " WHERE id = ?").run(...keys.map((k) => result.data[k]), id);
    }
    const fish = db.prepare("SELECT * FROM fish WHERE id = ?").get(id);
    res.json(fish);
  });

  // Suppression d'un poisson (équipe du Récif)
  app.delete("/fish/:id", (req, res) => {
    if (!isStaff(req)) {
      res.status(401).send("Non autorisé");
      return;
    }
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ message: "Identifiant invalide" });
      return;
    }
    const fish = db.prepare("SELECT * FROM fish WHERE id = ?").get(id);
    if (!fish) {
      res.status(404).json({ message: "Poisson introuvable" });
      return;
    }
    db.prepare("DELETE FROM adoption_requests WHERE fish_id = ?").run(id);
    db.prepare("DELETE FROM fish WHERE id = ?").run(id);
    res.status(204).end();
  });

  // ---------------------------------------------------------------- ADOPTIONS

  // Demande d'adoption (public)
  app.post("/fish/:id/adoptions", express.json(), (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ message: "Identifiant invalide" });
      return;
    }
    const result = validate(adoptionSchema, req.body);
    if (!result.ok) {
      res.status(400).json({ message: "Données invalides", errors: result.errors });
      return;
    }
    const b = result.data;
    const fish: any = db.prepare("SELECT * FROM fish WHERE id = ?").get(id);
    if (!fish) {
      res.status(404).json({ message: "Poisson introuvable" });
      return;
    }
    if (fish.status !== "disponible") {
      res.status(409).json({ error: "Ce poisson n'est plus disponible" });
      return;
    }
    const info = db
      .prepare(
        "INSERT INTO adoption_requests (fish_id, adopter_name, adopter_email, message, status, created_at) VALUES (?, ?, ?, ?, 'en_attente', ?)",
      )
      .run(id, b.adopterName, b.adopterEmail, b.message ?? "", new Date().toISOString());
    db.prepare("UPDATE fish SET status = 'reserve' WHERE id = ?").run(id);
    const request = db.prepare("SELECT * FROM adoption_requests WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(request);
  });

  // Liste des demandes (équipe du Récif), filtre ?status=
  app.get("/adoptions", (req, res) => {
    if (!isStaff(req)) {
      res.status(401).json({ message: "Non autorisé" });
      return;
    }
    const filters: any = {};
    if (req.query.status) filters.status = { op: "eq", value: req.query.status };
    const rows = db.prepare("SELECT * FROM adoption_requests " + buildWhere(filters) + " ORDER BY id").all();
    res.json(rows);
  });

  // Accepter ou refuser : UNE seule fonction, paramétrée par la décision
  const decide = (decision: "acceptee" | "refusee") => (req: express.Request, res: express.Response) => {
    if (!isStaff(req)) {
      res.status(401).json({ message: "Non autorisé" });
      return;
    }
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ message: "Identifiant invalide" });
      return;
    }
    const request: any = db.prepare("SELECT * FROM adoption_requests WHERE id = ?").get(id);
    if (!request) {
      res.status(404).json({ message: "Demande introuvable" });
      return;
    }
    if (request.status !== "en_attente") {
      res.status(409).json({ message: "Demande déjà traitée" });
      return;
    }
    const fishStatus = decision === "acceptee" ? "adopte" : "disponible";
    db.prepare("UPDATE adoption_requests SET status = ?, decided_at = ? WHERE id = ?").run(decision, new Date().toISOString(), id);
    db.prepare("UPDATE fish SET status = ? WHERE id = ?").run(fishStatus, request.fish_id);
    const updated = db.prepare("SELECT * FROM adoption_requests WHERE id = ?").get(id);
    res.json(updated);
  };

  app.post("/adoptions/:id/accept", decide("acceptee"));
  app.post("/adoptions/:id/refuse", decide("refusee"));

  return app;
}