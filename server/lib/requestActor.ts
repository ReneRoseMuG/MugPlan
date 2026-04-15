import type { Request } from "express";

export type RequestActor = {
  userId: number | null;
  name: string | null;
};

export function getRequestActor(req: Request): RequestActor {
  return {
    userId: req.userContext?.userId ?? null,
    name: req.userContext?.displayName ?? null,
  };
}
