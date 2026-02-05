import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export type BadgeInteractionHandlers = {
  openTeamEdit?: (id: number | string) => void;
  openTourEdit?: (id: number | string) => void;
  openAppointmentEdit?: (id: number | string) => void;
  openEmployeeEdit?: (id: number | string) => void;
  openCustomerEdit?: (id: number | string) => void;
  openProjectEdit?: (id: number | string) => void;
};

const BadgeInteractionContext = createContext<BadgeInteractionHandlers | null>(null);

export function BadgeInteractionProvider({
  value,
  children,
}: {
  value: BadgeInteractionHandlers;
  children: ReactNode;
}) {
  return (
    <BadgeInteractionContext.Provider value={value}>
      {children}
    </BadgeInteractionContext.Provider>
  );
}

export function useBadgeInteractions() {
  return useContext(BadgeInteractionContext);
}
