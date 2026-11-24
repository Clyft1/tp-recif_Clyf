import { appendFile } from "node:fs/promises";
import type { Notification, Notifier } from "./notifier.js";


export class FileNotifier implements Notifier {
  constructor(private readonly file: string) {}

  async send(notification: Notification): Promise<void> {
    const line = JSON.stringify({ ...notification, sentAt: new Date().toISOString() });
    await appendFile(this.file, line + "\n", "utf8");
  }
}