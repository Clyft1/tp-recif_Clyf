import type { Database } from "better-sqlite3";
import type { Fish, FishChanges, FishFilters, FishStatus, NewFish } from "../models/fish.js";

// Le contrat : ce qu'on peut faire avec les poissons, sans dire comment c'est stocké
export interface FishDao {
  findAll(filters?: FishFilters): Promise<Fish[]>;
  findById(id: number): Promise<Fish | null>;
  create(data: NewFish): Promise<Fish>;
  update(id: number, changes: FishChanges): Promise<Fish | null>;
  delete(id: number): Promise<boolean>;
  updateStatus(id: number, status: FishStatus): Promise<void>; // retiré à l'étape 6
}

// Une ligne telle qu'elle sort de SQLite (snake_case)
type FishRow = {
  id: number;
  name: string;
  species: Fish["species"];
  breed: string | null;
  birth_date: string | null;
  description: string;
  internal_notes: string;
  status: FishStatus;
  created_at: string;
};

// Ligne snake_case → objet Fish camelCase
const toFish = (row: FishRow): Fish => ({
  id: row.id,
  name: row.name,
  species: row.species,
  breed: row.breed,
  birthDate: row.birth_date,
  description: row.description,
  internalNotes: row.internal_notes,
  status: row.status,
  createdAt: row.created_at,
});

// Liste blanche : champ de l'API → colonne de la table. Seuls ces champs peuvent finir dans le SQL.
const COLUMNS: Record<keyof FishChanges, string> = {
  name: "name",
  species: "species",
  breed: "breed",
  birthDate: "birth_date",
  description: "description",
  internalNotes: "internal_notes",
};

export class SqliteFishDao implements FishDao {
  constructor(private readonly db: Database) {}

  async findAll(filters: FishFilters = {}): Promise<Fish[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM fish
         WHERE (@species IS NULL OR species = @species)
           AND (@status IS NULL OR status = @status)
         ORDER BY id`,
      )
      .all({ species: filters.species ?? null, status: filters.status ?? null }) as FishRow[];
    return rows.map(toFish);
  }

  async findById(id: number): Promise<Fish | null> {
    const row = this.db.prepare("SELECT * FROM fish WHERE id = ?").get(id) as FishRow | undefined;
    return row ? toFish(row) : null;
  }

  async create(data: NewFish): Promise<Fish> {
    const info = this.db
      .prepare(
        `INSERT INTO fish (name, species, breed, birth_date, description, internal_notes, status, created_at)
         VALUES (@name, @species, @breed, @birthDate, @description, @internalNotes, 'disponible', @createdAt)`,
      )
      .run({
        name: data.name,
        species: data.species,
        breed: data.breed ?? null,
        birthDate: data.birthDate ?? null,
        description: data.description ?? "",
        internalNotes: data.internalNotes ?? "",
        createdAt: new Date().toISOString(),
      });
    return (await this.findById(Number(info.lastInsertRowid)))!;
  }

  async update(id: number, changes: FishChanges): Promise<Fish | null> {
    // On ne garde que les champs connus de la liste blanche, jamais les clés reçues telles quelles
    const fields = (Object.keys(COLUMNS) as (keyof FishChanges)[]).filter((k) => changes[k] !== undefined);
    if (fields.length > 0) {
      const sets = fields.map((k) => `${COLUMNS[k]} = @${k}`).join(", ");
      const params = Object.fromEntries(fields.map((k) => [k, changes[k] ?? null]));
      this.db.prepare(`UPDATE fish SET ${sets} WHERE id = @id`).run({ ...params, id });
    }
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    return this.db.prepare("DELETE FROM fish WHERE id = ?").run(id).changes > 0;
  }

  async updateStatus(id: number, status: FishStatus): Promise<void> {
    this.db.prepare("UPDATE fish SET status = ? WHERE id = ?").run(status, id);
  }
}