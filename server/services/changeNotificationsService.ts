import type { Response } from "express";
import type { ChangeNotificationEvent } from "@shared/routes";
import * as journalRepository from "../repositories/journalRepository";

type ChangeNotificationSubscriber = {
  id: number;
  send: (event: ChangeNotificationEvent) => void;
};

let nextSubscriberId = 1;
const subscribers = new Map<number, ChangeNotificationSubscriber>();

function writeSseChunk(res: Response, chunk: string): void {
  res.write(chunk);
}

function serializeSseEvent(event: ChangeNotificationEvent): string {
  return `event: change\nid: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function writeSseHandshake(res: Response): void {
  writeSseChunk(res, "retry: 5000\n");
  writeSseChunk(res, ": connected\n\n");
}

export function writeSseHeartbeat(res: Response): void {
  writeSseChunk(res, ": keep-alive\n\n");
}

export function subscribeToChangeNotifications(send: (event: ChangeNotificationEvent) => void): () => void {
  const subscriberId = nextSubscriberId++;
  subscribers.set(subscriberId, {
    id: subscriberId,
    send,
  });

  return () => {
    subscribers.delete(subscriberId);
  };
}

export function publishChangeNotification(event: ChangeNotificationEvent): void {
  subscribers.forEach((subscriber) => {
    subscriber.send(event);
  });
}

export async function listReplayChangeNotifications(lastEventId: number): Promise<ChangeNotificationEvent[]> {
  const rows = await journalRepository.listJournalChangeNotificationsAfterId(lastEventId);
  return rows.map((row) => ({
    id: row.id,
    actorUserId: row.actorUserId,
    triggerKey: row.triggerKey,
    createdAt: row.createdAt,
  }));
}

export function writeChangeNotification(res: Response, event: ChangeNotificationEvent): void {
  writeSseChunk(res, serializeSseEvent(event));
}
