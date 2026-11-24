// Le contrat : envoyer un message. Le service ne sait pas COMMENT il part.
export type Notification = { to: string; subject: string; body: string };

export interface Notifier {
  send(notification: Notification): Promise<void>;
}