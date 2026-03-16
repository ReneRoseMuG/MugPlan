import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PreviewItem = {
  appointmentId: number;
  startDate: string;
  endDate: string | null;
  tourName: string | null;
  customerNumber: string | null;
  customerName: string | null;
  projectName: string | null;
  orderNumber: string | null;
  currentEmployees: Array<{ id: number; fullName: string }>;
  eligible: boolean;
  conflictReason: "EMPLOYEE_OVERLAP" | "ALREADY_ASSIGNED" | null;
};

interface TourEmployeeCascadeDialogProps {
  open: boolean;
  mode: "add" | "remove";
  employeeName: string;
  previewItems: PreviewItem[];
  selectedAppointmentIds: number[];
  isSubmitting: boolean;
  onSelectedAppointmentIdsChange: (appointmentIds: number[]) => void;
  onConfirm: () => void;
  onClose: () => void;
}

function conflictReasonLabel(reason: PreviewItem["conflictReason"]): string {
  switch (reason) {
    case "EMPLOYEE_OVERLAP":
      return "Ueberschneidung mit bestehendem Termin";
    case "ALREADY_ASSIGNED":
      return "Mitarbeiter ist bereits eingetragen";
    default:
      return "";
  }
}

function formatShortDate(dateValue: string): string {
  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) return dateValue;
  return `${day}.${month}.${year.slice(-2)}`;
}

function formatCustomerLabel(item: PreviewItem): string | null {
  if (!item.customerNumber) return null;
  const customerName = item.customerName?.trim();
  return customerName && customerName.length > 0
    ? `K: ${item.customerNumber} - ${customerName}`
    : `K: ${item.customerNumber}`;
}

function formatProjectLabel(item: PreviewItem): string | null {
  const orderNumber = item.orderNumber?.trim();
  const projectName = item.projectName?.trim();
  if (orderNumber && projectName) return `${orderNumber} - ${projectName}`;
  if (orderNumber) return orderNumber;
  if (projectName) return projectName;
  return null;
}

export function TourEmployeeCascadeDialog({
  open,
  mode,
  employeeName,
  previewItems,
  selectedAppointmentIds,
  isSubmitting,
  onSelectedAppointmentIdsChange,
  onConfirm,
  onClose,
}: TourEmployeeCascadeDialogProps) {
  const title = mode === "add" ? "Mitarbeiter zu Tour-Terminen hinzufügen" : "Mitarbeiter von Tour-Terminen abziehen";
  const description = mode === "add"
    ? `Wählen Sie die Termine aus, für die ${employeeName} geplant werden soll.`
    : `Wählen Sie die Termine aus, von denen ${employeeName} abgezogen werden soll.`;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-3xl" data-testid="dialog-tour-employee-cascade">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto rounded-md border" data-testid="list-tour-employee-cascade-preview">
          {previewItems.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">
              Keine zukünftigen Termine betroffen.
            </div>
          ) : (
            <div className="divide-y">
              {previewItems.map((item) => {
                const checked = selectedAppointmentIds.includes(item.appointmentId);
                const conflictText = conflictReasonLabel(item.conflictReason);
                const customerLabel = formatCustomerLabel(item);
                const projectLabel = formatProjectLabel(item);
                return (
                  <label
                    key={item.appointmentId}
                    className={`flex items-start gap-3 p-4 ${item.eligible ? "cursor-pointer" : "opacity-70"}`}
                    data-testid={`tour-employee-cascade-row-${item.appointmentId}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={!item.eligible || isSubmitting}
                      onCheckedChange={(nextChecked) => {
                        if (!item.eligible) return;
                        if (nextChecked) {
                          onSelectedAppointmentIdsChange([...selectedAppointmentIds, item.appointmentId]);
                          return;
                        }
                        onSelectedAppointmentIdsChange(
                          selectedAppointmentIds.filter((appointmentId) => appointmentId !== item.appointmentId),
                        );
                      }}
                      data-testid={`tour-employee-cascade-checkbox-${item.appointmentId}`}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{formatShortDate(item.startDate)}</span>
                        {item.endDate ? <span className="text-sm text-slate-500">bis {formatShortDate(item.endDate)}</span> : null}
                        {item.tourName ? <span className="text-sm text-slate-500">{item.tourName}</span> : null}
                      </div>
                      {projectLabel ? <div className="text-sm text-slate-600">{projectLabel}</div> : null}
                      {customerLabel ? <div className="text-sm text-slate-600">{customerLabel}</div> : null}
                      {!item.eligible && conflictText ? (
                        <div className="text-sm text-red-600" data-testid={`tour-employee-cascade-conflict-${item.appointmentId}`}>
                          {conflictText}
                        </div>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting} data-testid="button-tour-employee-cascade-confirm">
            {isSubmitting ? "Speichern..." : "Bestätigen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
