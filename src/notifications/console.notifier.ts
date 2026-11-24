import type { Notification, Notifier } from "./notifier.js";

export class ConsoleNotifier implements Notifier {
  async send({ to, subject, body }: Notification): Promise<void> {
    console.log(`📬 À ${to} — ${subject}\n${body}`);
  }
}