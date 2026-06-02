import {
  ResourcePlanningDialog,
  type AppointmentResourceDialogPreviewItem,
  type WeekResourcePreviewItem,
} from "@/components/ResourcePlanningDialog";
import type { DialogBaseStep } from "@/components/ui/dialog-base";
import type { ReactNode } from "react";

interface TourEmployeeCascadeDialogProps {
  open: boolean;
  variant?: "week" | "appointment";
  mode?: "add" | "remove";
  employeeId?: number | string;
  employeeName?: string;
  title?: string;
  description?: string;
  weekLabel?: string | null;
  previewItems: Array<WeekResourcePreviewItem | AppointmentResourceDialogPreviewItem>;
  selectedIds?: number[];
  selectedAppointmentIds?: number[];
  isSubmitting: boolean;
  onSelectedIdsChange?: (ids: number[]) => void;
  onSelectedAppointmentIdsChange?: (ids: number[]) => void;
  onConfirm: () => void;
  onClose: () => void;
  confirmLabel?: string;
  resolutionMode?: "additive" | "replace";
  onResolutionModeChange?: (mode: "additive" | "replace") => void;
  showResolutionMode?: boolean;
  resolutionNotice?: ReactNode;
  summary?: ReactNode;
  executionMessage?: ReactNode;
  error?: unknown;
  steps?: DialogBaseStep[];
}

export function TourEmployeeCascadeDialog(props: TourEmployeeCascadeDialogProps) {
  return <ResourcePlanningDialog {...props} testId="dialog-tour-employee-cascade" />;
}
