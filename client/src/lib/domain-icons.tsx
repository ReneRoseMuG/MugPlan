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
} from "lucide-react";

export const domainIcons = {
  projects: FolderKanban,
  employees: UsersRound,
  customers: UserRound,
  appointmentsList: Table2,
  tours: MapPin,
  teams: Layers,
  reports: FileText,
  admin: Settings,
} satisfies Record<string, ComponentType<{ className?: string }>>;
