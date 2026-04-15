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
  CalendarRange,
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
  employeeAbsences: CalendarRange,
  monitoring: ShieldAlert,
  journal: History,
  reports: FileText,
  admin: Settings,
} satisfies Record<string, ComponentType<{ className?: string }>>;
