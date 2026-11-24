import { config } from "../config.js";
import { ConsoleNotifier } from "./console.notifier.js";
import { FileNotifier } from "./file.notifier.js";
import type { Notifier } from "./notifier.js";

// La factory : le SEUL endroit qui connaît les classes concrètes
export function createNotifier(kind: string | undefined): Notifier {
  switch (kind ?? "console") {
    case "console":
      return new ConsoleNotifier();
    case "file":
      return new FileNotifier(config.outboxFile);
    default:
      throw new Error(`NOTIFIER inconnu : « ${kind} » (valeurs possibles : console, file)`);
  }
}