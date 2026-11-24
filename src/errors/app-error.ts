// Une erreur « prévue » de l'application : elle connaît son statut HTTP et son code
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}