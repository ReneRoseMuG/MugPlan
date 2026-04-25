import type { NextFunction, Request, Response } from "express";
import * as changeNotificationsService from "../services/changeNotificationsService";

const SSE_HEARTBEAT_INTERVAL_MS = 20_000;

function parseLastEventId(headerValue: string | string[] | undefined): number {
  const candidate = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!candidate) {
    return 0;
  }

  const parsed = Number(candidate);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export async function streamChangeNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.userContext) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    changeNotificationsService.writeSseHandshake(res);

    const replayEvents = await changeNotificationsService.listReplayChangeNotifications(
      parseLastEventId(req.headers["last-event-id"]),
    );

    for (const event of replayEvents) {
      changeNotificationsService.writeChangeNotification(res, event);
    }

    const unsubscribe = changeNotificationsService.subscribeToChangeNotifications((event) => {
      changeNotificationsService.writeChangeNotification(res, event);
    });

    const heartbeatTimer = setInterval(() => {
      changeNotificationsService.writeSseHeartbeat(res);
    }, SSE_HEARTBEAT_INTERVAL_MS);

    req.on("close", () => {
      clearInterval(heartbeatTimer);
      unsubscribe();
      res.end();
    });
  } catch (error) {
    next(error);
  }
}
