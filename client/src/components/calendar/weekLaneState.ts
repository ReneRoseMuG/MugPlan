export type WeekLaneStateInput = {
  laneKeys: string[];
  persistedExpandedLaneId: string | null;
};

export type WeekLaneStateResolution = {
  effectiveExpandedLaneId: string | null;
  requiresCorrection: boolean;
};

export function normalizeExpandedLaneId(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveCollapsedLaneSelection(input: WeekLaneStateInput): WeekLaneStateResolution {
  if (input.laneKeys.length === 0) {
    return {
      effectiveExpandedLaneId: null,
      requiresCorrection: false,
    };
  }

  if (input.persistedExpandedLaneId && input.laneKeys.includes(input.persistedExpandedLaneId)) {
    return {
      effectiveExpandedLaneId: input.persistedExpandedLaneId,
      requiresCorrection: false,
    };
  }

  return {
    effectiveExpandedLaneId: input.laneKeys[0],
    requiresCorrection: true,
  };
}

export function isLaneCollapsed(params: {
  isCollapsedMode: boolean;
  laneKey: string;
  effectiveExpandedLaneId: string | null;
}): boolean {
  if (!params.isCollapsedMode) {
    return false;
  }
  return params.laneKey !== params.effectiveExpandedLaneId;
}
