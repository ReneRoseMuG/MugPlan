import type { ComponentType } from "react";
import {
  FileText,
  FolderKanban,
  MapPin,
  Settings,
  Table2,
  UserRound,
  UsersRound,
  Layers,
  ShieldAlert,
  History,
} from "lucide-react";

export const domainIcons = {
  projects: FolderKanban,
  employees: UsersRound,
  customers: UserRound,
  appointmentsList: Table2,
  tours: MapPin,
  teams: Layers,
  monitoring: ShieldAlert,
  journal: History,
  reports: FileText,
  admin: Settings,
} satisfies Record<string, ComponentType<{ className?: string }>>;
