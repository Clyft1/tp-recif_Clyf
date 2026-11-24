import express from "express";
import { db } from "./data/db.js";
import { SqliteFishDao } from "./data/fish.dao.js";
import { SqliteAdoptionDao } from "./data/adoption.dao.js";
import { FishService } from "./services/fish.service.js";
import { AdoptionService } from "./services/adoption.service.js";
import { FishController } from "./controllers/fish.controller.js";
import { AdoptionController } from "./controllers/adoption.controller.js";
import { fishRoutes } from "./routes/fish.routes.js";
import { adoptionRoutes } from "./routes/adoption.routes.js";
import { notFound } from "./middlewares/not-found.js";
import { errorHandler } from "./middlewares/error-handler.js";

// Racine de composition : le seul endroit qui assemble les pièces.
// Données → services → contrôleurs → routes, puis les middlewares.
export function createApp() {
  // 1. La couche de données
  const fishDao = new SqliteFishDao(db);
  const adoptionDao = new SqliteAdoptionDao(db);

  // 2. Les règles du Récif
  const fishService = new FishService(fishDao);
  const adoptionService = new AdoptionService(adoptionDao, fishDao);

  // 3. HTTP
  const app = express();
  app.use(express.json());
  app.use(fishRoutes(new FishController(fishService)));
  app.use(adoptionRoutes(new AdoptionController(adoptionService)));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}