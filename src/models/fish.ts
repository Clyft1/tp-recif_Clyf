// Les types du domaine « poisson », en camelCase : c'est le vocabulaire de l'application
export const SPECIES = ["koi", "betta", "poisson-rouge", "guppy"] as const;
export const FISH_STATUSES = ["disponible", "reserve", "adopte"] as const;

export type Species = (typeof SPECIES)[number];
export type FishStatus = (typeof FISH_STATUSES)[number];

export type Fish = {
  id: number;
  name: string;
  species: Species;
  breed: string | null;
  birthDate: string | null;
  description: string;
  internalNotes: string;
  status: FishStatus;
  createdAt: string;
};

// Ce qu'il faut pour créer un poisson (le reste est fixé par l'application)
export type NewFish = {
  name: string;
  species: Species;
  breed?: string | null;
  birthDate?: string | null;
  description?: string;
  internalNotes?: string;
};

// Une modification : n'importe quel sous-ensemble des champs de création
export type FishChanges = Partial<NewFish>;

export type FishFilters = { species?: Species; status?: FishStatus };