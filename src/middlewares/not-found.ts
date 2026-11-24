import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";

// Aucune route n'a répondu : c'est une 404, au même format que les autres erreurs
export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", `Route ${req.method} ${req.path} introuvable`));
};
