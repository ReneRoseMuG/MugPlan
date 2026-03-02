import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Clock, FolderKanban, Route, Users } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Customer, Employee, Project, Team, Tour } from "@shared/schema";
import type { ProjectStatusRelationItem } from "@shared/routes";
import { EntityFormLayout } from "@/components/ui/entity-form-layout";
import { Button } from "@/components/ui/button";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { CustomerDetailCard } from "@/components/ui/customer-detail-card";
import { ProjectDetailCard } from "@/components/ui/project-detail-card";
import { RelationSlot } from "@/components/ui/relation-slot";
import { TeamInfoBadge } from "@/components/ui/team-info-badge";
import { TourInfoBadge } from "@/components/ui/tour-info-badge";
import { ProjectsPage } from "@/components/ProjectsPage";
import { EmployeePickerDialogList } from "@/components/EmployeePickerDialogList";
import { DocumentExtractionDropzone } from "@/components/DocumentExtractionDropzone";
import {
  DocumentExtractionDialog,
  type ExtractionCustomerDraft,
  type ExtractionDialogData,
} from "@/components/DocumentExtractionDialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatProjectStoredName } from "@/lib/project-name-format";
import {
  PROJECT_APPOINTMENTS_ALL_FROM_DATE,
  getBerlinTodayDateString,
  getProjectAppointmentsQueryKey,
} from "@/lib/project-appointments";

interface AppointmentFormProps {
  onCancel?: () => void;
  onSaved?: () => void;
  initialDate?: string;
  initialTourId?: number | null;
  projectId?: number;
  appointmentId?: number;
}

interface AppointmentDetail {
  id: number;
  version: number;
  projectId: number;
  tourId: number | null;
  title: string;
  description: string | null;
  startDate: string;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  employees: Employee[];
}

type AppointmentApiError = Error & { status?: number; code?: string };
type ApiConflictEmployee = { id?: unknown; fullName?: unknown };
type ApiErrorPayload = { message?: string; code?: string; conflictEmployees?: ApiConflictEmployee[] };
type ApiSuccessPayload = { id?: number; message?: string };

const logPrefix = "[AppointmentForm]";

const formatHourInput = (value: string) => {
  const numeric = value.replace(/\D/g, "");
  if (!numeric) return "";
  const hour = Math.max(0, Math.min(23, Number(numeric)));
  return String(hour).padStart(2, "0");
};

const buildTimeString = (hourValue: string) => {
  if (!hourValue) return null;
  return `${hourValue}:00:00`;
};

const buildApiError = (message: string, status?: number, code?: string): AppointmentApiError => {
  const error = new Error(message) as AppointmentApiError;
  error.status = status;
  error.code = code;
  return error;
};

const parseJsonBody = (rawBody: string): unknown | null => {
  const trimmedBody = rawBody.trim();
  if (
    !trimmedBody ||
    !(
      (trimmedBody.startsWith("{") && trimmedBody.endsWith("}")) ||
      (trimmedBody.startsWith("[") && trimmedBody.endsWith("]"))
    )
  ) {
    return null;
  }
  try {
    return JSON.parse(trimmedBody);
  } catch {
    return null;
  }
};

const parseErrorPayload = (rawBody: string): ApiErrorPayload | null => {
  const parsed = parseJsonBody(rawBody);
  if (!parsed || typeof parsed !== "object") return null;
  const payload = parsed as {
    message?: unknown;
    code?: unknown;
    conflictEmployees?: unknown;
  };
  return {
    message: typeof payload.message === "string" && payload.message.trim().length > 0 ? payload.message : undefined,
    code: typeof payload.code === "string" ? payload.code : undefined,
    conflictEmployees: Array.isArray(payload.conflictEmployees) ? payload.conflictEmployees as ApiConflictEmployee[] : undefined,
  };
};

const formatConflictEmployees = (conflictEmployees?: ApiConflictEmployee[]) => {
  if (!Array.isArray(conflictEmployees) || conflictEmployees.length === 0) return null;
  const names = conflictEmployees
    .map((entry) => (typeof entry.fullName === "string" ? entry.fullName.trim() : ""))
    .filter((name) => name.length > 0);
  if (names.length === 0) return null;
  return names.join(", ");
};

const isPastStartDate = (startDate: string) => {
  const startDateValue = new Date(`${startDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return startDateValue < today;
};

const fetchJson = async <T,>(url: string) => {
  console.info(`${logPrefix} request`, { url });
  const response = await fetch(url, { credentials: "include" });
  const payload = await response.json();
  console.info(`${logPrefix} response`, { url, status: response.status });
  if (!response.ok) {
    throw new Error(payload?.message ?? response.statusText);
  }
  return payload as T;
};

export function AppointmentForm({ onCancel, onSaved, initialDate, initialTourId, projectId, appointmentId }: AppointmentFormProps) {
  const { toast } = useToast();
  const projectsQueryKey = ["/api/projects?filter=all&scope=all"] as const;
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(projectId ?? null);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<string>(
    initialDate ?? new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    initialDate ?? new Date().toISOString().split("T")[0],
  );
  const [isEndDateEnabled, setIsEndDateEnabled] = useState(false);
  const [startTimeEnabled, setStartTimeEnabled] = useState(false);
  const [startTimeHour, setStartTimeHour] = useState("");
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [tourConfirmOpen, setTourConfirmOpen] = useState(false);
  const [pendingTourChange, setPendingTourChange] = useState<{
    tourId: number | null;
    employeeIds: number[];
  } | null>(null);
  const [employeeConfirmOpen, setEmployeeConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [documentExtractionOpen, setDocumentExtractionOpen] = useState(false);
  const [documentExtractionLoading, setDocumentExtractionLoading] = useState(false);
  const [documentExtractionData, setDocumentExtractionData] = useState<ExtractionDialogData | null>(null);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string | null>(null);
  const weekTourPrefillAppliedRef = useRef(false);

  const buildFormSnapshot = (input: {
    projectId: number | null;
    tourId: number | null;
    startDate: string;
    endDate: string;
    isEndDateEnabled: boolean;
    startTimeHour: string;
    startTimeEnabled: boolean;
    employeeIds: number[];
  }) =>
    JSON.stringify({
      projectId: input.projectId,
      tourId: input.tourId,
      startDate: input.startDate,
      endDate: input.isEndDateEnabled ? input.endDate : null,
      isEndDateEnabled: input.isEndDateEnabled,
      startTimeEnabled: input.startTimeEnabled,
      startTimeHour: input.startTimeEnabled ? input.startTimeHour : "",
      employeeIds: [...input.employeeIds].sort((a, b) => a - b),
    });

  const [userRole] = useState(() =>
    window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER",
  );
  const isAdmin = userRole === "ADMIN";
  const isEditing = Boolean(appointmentId);
  const projectAppointmentsUpcomingFromDate = getBerlinTodayDateString();
  const invalidateRelatedAppointmentQueries = async (projectId: number | null | undefined) => {
    if (projectId) {
      const upcomingAppointmentsQueryKey = getProjectAppointmentsQueryKey({
        projectId,
        fromDate: projectAppointmentsUpcomingFromDate,
        userRole,
      });
      const allAppointmentsQueryKey = getProjectAppointmentsQueryKey({
        projectId,
        fromDate: PROJECT_APPOINTMENTS_ALL_FROM_DATE,
        userRole,
      });
      await queryClient.invalidateQueries({ queryKey: upcomingAppointmentsQueryKey });
      await queryClient.invalidateQueries({ queryKey: allAppointmentsQueryKey });
    }
    await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
    await queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === "customerAppointments",
    });
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const firstKey = query.queryKey[0];
        return typeof firstKey === "string" && firstKey.includes("/current-appointments?");
      },
    });
  };

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: projectsQueryKey,
    queryFn: () => fetchJson<Project[]>("/api/projects?filter=all&scope=all"),
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: () => fetchJson<Customer[]>("/api/customers"),
  });

  const { data: selectedProjectStatuses = [] } = useQuery<ProjectStatusRelationItem[]>({
    queryKey: ["/api/projects", selectedProjectId, "statuses"],
    queryFn: () => fetchJson<ProjectStatusRelationItem[]>(`/api/projects/${selectedProjectId}/statuses`),
    enabled: selectedProjectId !== null,
  });

  const { data: tours = [], isLoading: toursLoading } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
    queryFn: () => fetchJson<Tour[]>("/api/tours"),
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    queryFn: () => fetchJson<Team[]>("/api/teams"),
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "active" }],
    queryFn: () => fetchJson<Employee[]>("/api/employees?scope=active"),
  });

  const { data: appointmentDetail, isLoading: appointmentLoading } = useQuery<AppointmentDetail>({
    queryKey: ["/api/appointments", appointmentId],
    queryFn: () => fetchJson<AppointmentDetail>(`/api/appointments/${appointmentId}`),
    enabled: Boolean(appointmentId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  });

  const isLoading =
    projectsLoading || customersLoading || toursLoading || teamsLoading || employeesLoading || appointmentLoading;

  useEffect(() => {
    if (!appointmentDetail) return;
    console.info(`${logPrefix} appointment detail loaded`, { appointmentId: appointmentDetail.id });
    setSelectedProjectId(appointmentDetail.projectId);
    setSelectedTourId(appointmentDetail.tourId ?? null);
    setStartDate(appointmentDetail.startDate);
    setEndDate(appointmentDetail.endDate ?? appointmentDetail.startDate);
    setIsEndDateEnabled(Boolean(appointmentDetail.endDate));
    const startHour = appointmentDetail.startTime?.slice(0, 2) ?? "";
    setStartTimeEnabled(Boolean(startHour));
    setStartTimeHour(startHour);
    const initialEmployeeIds = appointmentDetail.employees.map((employee) => employee.id);
    setAssignedEmployeeIds(initialEmployeeIds);
    setInitialFormSnapshot(
      buildFormSnapshot({
        projectId: appointmentDetail.projectId,
        tourId: appointmentDetail.tourId ?? null,
        startDate: appointmentDetail.startDate,
        endDate: appointmentDetail.endDate ?? appointmentDetail.startDate,
        isEndDateEnabled: Boolean(appointmentDetail.endDate),
        startTimeHour: startHour,
        startTimeEnabled: Boolean(startHour),
        employeeIds: initialEmployeeIds,
      }),
    );
  }, [appointmentDetail]);

  useEffect(() => {
    if (!isEditing) {
      setInitialFormSnapshot(
        buildFormSnapshot({
          projectId: selectedProjectId,
          tourId: selectedTourId,
          startDate,
          endDate,
          isEndDateEnabled,
          startTimeHour,
          startTimeEnabled,
          employeeIds: assignedEmployeeIds,
        }),
      );
    }
    // Intentionally only initialize once for create mode.
  }, [isEditing]);
  useEffect(() => {
    if (isEditing) return;
    if (initialTourId === null || initialTourId === undefined) return;
    if (weekTourPrefillAppliedRef.current) return;
    if (employeesLoading) return;

    const tourEmployeeIds = employees
      .filter((employee) => employee.tourId === initialTourId && employee.isActive)
      .map((employee) => employee.id);

    setSelectedTourId(initialTourId);
    setAssignedEmployeeIds(tourEmployeeIds);
    weekTourPrefillAppliedRef.current = true;

    console.info(`${logPrefix} week-prefill applied`, {
      tourId: initialTourId,
      employeeCount: tourEmployeeIds.length,
    });
  }, [employees, employeesLoading, initialTourId, isEditing]);

  useEffect(() => {
    if (!isEndDateEnabled) {
      setEndDate(startDate);
    }
  }, [isEndDateEnabled, startDate]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const selectedCustomer = useMemo(() => {
    if (!selectedProject) return null;
    return customers.find((customer) => customer.id === selectedProject.customerId) ?? null;
  }, [customers, selectedProject]);

  const selectedTour = useMemo(
    () => tours.find((tour) => tour.id === selectedTourId) ?? null,
    [tours, selectedTourId],
  );

  const assignedEmployeesById = useMemo(() => {
    const map = new Map<number, Employee>();
    for (const employee of employees) {
      map.set(employee.id, employee);
    }
    for (const employee of appointmentDetail?.employees ?? []) {
      if (!map.has(employee.id)) {
        map.set(employee.id, employee);
      }
    }
    return map;
  }, [employees, appointmentDetail?.employees]);

  const assignedEmployees = useMemo(
    () => assignedEmployeeIds
      .map((id) => assignedEmployeesById.get(id))
      .filter((employee): employee is Employee => Boolean(employee)),
    [assignedEmployeeIds, assignedEmployeesById],
  );

  const availableEmployees = useMemo(
    () => employees.filter((employee) => employee.isActive && !assignedEmployeeIds.includes(employee.id)),
    [employees, assignedEmployeeIds],
  );

  const teamMembersById = useMemo(() => {
    const result = new Map<number, { id: number; fullName: string }[]>();
    for (const employee of employees) {
      if (!employee.teamId) continue;
      const current = result.get(employee.teamId) ?? [];
      current.push({ id: employee.id, fullName: employee.fullName });
      result.set(employee.teamId, current);
    }
    return result;
  }, [employees]);

  const tourMembersById = useMemo(() => {
    const result = new Map<number, { id: number; fullName: string }[]>();
    for (const employee of employees) {
      if (!employee.tourId) continue;
      const current = result.get(employee.tourId) ?? [];
      current.push({ id: employee.id, fullName: employee.fullName });
      result.set(employee.tourId, current);
    }
    return result;
  }, [employees]);

  const lockedStartDate = appointmentDetail?.startDate ?? startDate;
  const isLocked = isEditing && !isAdmin && isPastStartDate(lockedStartDate);
  const isFormDirty = initialFormSnapshot !== null && buildFormSnapshot({
    projectId: selectedProjectId,
    tourId: selectedTourId,
    startDate,
    endDate,
    isEndDateEnabled,
    startTimeHour,
    startTimeEnabled,
    employeeIds: assignedEmployeeIds,
  }) !== initialFormSnapshot;
  const handleRequestClose = () => {
    if (isFormDirty && !isSaving) {
      setCloseConfirmOpen(true);
      return;
    }
    onCancel?.();
  };

  const addEmployees = (ids: number[]) => {
    setAssignedEmployeeIds((prev) => {
      const set = new Set(prev);
      ids.forEach((id) => set.add(id));
      return Array.from(set);
    });
  };

  const removeEmployee = (employeeId: number) => {
    setAssignedEmployeeIds((prev) => prev.filter((id) => id !== employeeId));
  };

  const handleAssignTeam = (team: Team) => {
    const teamEmployees = employees
      .filter((employee) => employee.teamId === team.id && employee.isActive)
      .map((employee) => employee.id);
    console.info(`${logPrefix} team add`, { teamId: team.id, employees: teamEmployees.length });
    addEmployees(teamEmployees);
  };

  const applyTourChange = (tourId: number | null, employeeIds: number[]) => {
    setSelectedTourId(tourId);
    setAssignedEmployeeIds(employeeIds);
    console.info(`${logPrefix} tour reset applied`, {
      tourId,
      employeeCount: employeeIds.length,
    });
  };

  const handleTourChange = (tourId: number | null) => {
    if (tourId === selectedTourId) return;
    const nextEmployeeIds = tourId
      ? employees.filter((employee) => employee.tourId === tourId && employee.isActive).map((employee) => employee.id)
      : [];
    if (assignedEmployeeIds.length > 0) {
      console.info(`${logPrefix} tour change requires confirmation`, { tourId });
      setPendingTourChange({ tourId, employeeIds: nextEmployeeIds });
      setTourConfirmOpen(true);
      return;
    }
    applyTourChange(tourId, nextEmployeeIds);
  };

  const handleProjectSelect = (id: number) => {
    setSelectedProjectId(id);
    setProjectPickerOpen(false);
    console.info(`${logPrefix} project selected`, { projectId: id });
  };

  const mapExtractionCustomerToPayload = (customer: ExtractionCustomerDraft) => ({
    customerNumber: customer.customerNumber.trim(),
    firstName: customer.firstName?.trim() || null,
    lastName: customer.lastName?.trim() || null,
    company: customer.company?.trim() || null,
    email: customer.email?.trim() || null,
    phone: customer.phone?.trim() || null,
    addressLine1: customer.addressLine1?.trim() || null,
    addressLine2: customer.addressLine2?.trim() || null,
    postalCode: customer.postalCode?.trim() || null,
    city: customer.city?.trim() || null,
  });

  const resolveCustomerByNumber = async (customerNumber: string) => {
    const response = await fetch("/api/document-extraction/resolve-customer-by-number", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerNumber: customerNumber.trim() }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message ?? "Kundennummer konnte nicht aufgelöst werden");
    }
    return (await response.json()) as { resolution: "none" | "single" | "multiple"; count: number; customer: Customer | null };
  };

  const createCustomerFromDraft = async (customerDraft: ExtractionCustomerDraft) => {
    const payload = mapExtractionCustomerToPayload(customerDraft);
    const response = await fetch("/api/customers", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(json?.code === "CUSTOMER_NUMBER_CONFLICT" ? "Kundennummer ist bereits vergeben." : (json?.message ?? "Kunde konnte nicht angelegt werden"));
    }
    await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    return json as Customer;
  };

  const resolveOrCreateCustomerForExtraction = async (customerDraft: ExtractionCustomerDraft): Promise<Customer | null> => {
    if (!customerDraft.customerNumber.trim()) {
      throw new Error("Kundennummer ist erforderlich");
    }
    const resolution = await resolveCustomerByNumber(customerDraft.customerNumber);
    if (resolution.resolution === "multiple") {
      throw new Error("Dateninkonsistenz: Kundennummer ist mehrfach vorhanden. Prozess wurde abgebrochen.");
    }
    if (resolution.resolution === "single") {
      if (!resolution.customer) {
        throw new Error("Dateninkonsistenz: Vorhandener Kunde konnte nicht geladen werden.");
      }
      const confirmed = window.confirm("Kundennummer existiert bereits. Vorhandenen Kunden übernehmen?");
      if (!confirmed) {
        return null;
      }
      return resolution.customer;
    }
    return createCustomerFromDraft(customerDraft);
  };

  const runDocumentExtraction = async (file: File) => {
    setDocumentExtractionLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/document-extraction/extract?scope=appointment_form", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Dokumentextraktion fehlgeschlagen");
      }
      const extraction = payload as {
        customer: ExtractionCustomerDraft;
        orderNumber: string | null;
        saunaModel: string;
        articleItems: ExtractionDialogData["articleItems"];
        categorizedItems: ExtractionDialogData["categorizedItems"];
        articleListHtml: string;
        warnings: string[];
      };
      setDocumentExtractionData({
        customer: {
          customerNumber: extraction.customer.customerNumber ?? "",
          firstName: extraction.customer.firstName ?? "",
          lastName: extraction.customer.lastName ?? "",
          company: extraction.customer.company ?? "",
          email: extraction.customer.email ?? "",
          phone: extraction.customer.phone ?? "",
          addressLine1: extraction.customer.addressLine1 ?? "",
          addressLine2: extraction.customer.addressLine2 ?? "",
          postalCode: extraction.customer.postalCode ?? "",
          city: extraction.customer.city ?? "",
        },
        orderNumber: extraction.orderNumber ?? null,
        saunaModel: extraction.saunaModel ?? "",
        articleItems: extraction.articleItems ?? [],
        categorizedItems: extraction.categorizedItems ?? [],
        articleListHtml: extraction.articleListHtml ?? "",
        warnings: extraction.warnings ?? [],
      });
      setDocumentExtractionOpen(true);
      toast({ title: "Dokument erfolgreich extrahiert" });
    } catch (error) {
      toast({
        title: "Extraktion fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setDocumentExtractionLoading(false);
    }
  };

  const applyExtractedProject = async (payload: {
    saunaModel: string;
    orderNumber: string;
    articleListHtml: string;
    customer: ExtractionCustomerDraft;
  }) => {
    try {
      if (selectedProjectId) {
        throw new Error("Projektübernahme ist nur möglich, wenn kein Projekt ausgewählt ist.");
      }

      const resolvedCustomer = await resolveOrCreateCustomerForExtraction(payload.customer);
      if (!resolvedCustomer) {
        return;
      }
      const projectResponse = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formatProjectStoredName(resolvedCustomer.customerNumber, payload.saunaModel),
          orderNumber: payload.orderNumber.trim() || null,
          customerId: resolvedCustomer.id,
          descriptionMd: payload.articleListHtml.trim(),
        }),
      });
      const projectPayload = await projectResponse.json().catch(() => null);
      if (!projectResponse.ok) {
        throw new Error(projectPayload?.message ?? "Projekt konnte nicht angelegt werden");
      }

      const createdProject = projectPayload as Project;
      queryClient.setQueryData<Project[]>(projectsQueryKey, (current) => {
        if (!Array.isArray(current)) return [createdProject];
        if (current.some((project) => project.id === createdProject.id)) {
          return current.map((project) => (project.id === createdProject.id ? createdProject : project));
        }
        return [createdProject, ...current];
      });
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      setSelectedProjectId(createdProject.id);
      toast({ title: "Projekt übernommen", description: "Neues Projekt wurde erzeugt und dem Termin zugeordnet." });
      setDocumentExtractionOpen(false);
    } catch (error) {
      toast({
        title: "Projekt konnte nicht übernommen werden",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    }
  };

  const validateForm = () => {
    if (!selectedProjectId) {
      console.info(`${logPrefix} validation blocked: project missing`);
      toast({ title: "Projekt ist erforderlich", variant: "destructive" });
      return false;
    }
    if (isEndDateEnabled && endDate < startDate) {
      console.info(`${logPrefix} validation blocked: endDate before startDate`);
      toast({ title: "Enddatum darf nicht vor dem Startdatum liegen", variant: "destructive" });
      return false;
    }
    const berlinToday = getBerlinTodayDateString();
    const isPastDateInput = startDate < berlinToday;
    if (isPastDateInput) {
      console.info(`${logPrefix} validation blocked: startDate in past`);
      toast({ title: "Datum in der Vergangenheit", variant: "destructive" });
      return false;
    }
    const currentBerlinHour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Berlin",
        hour: "2-digit",
        hour12: false,
      }).format(new Date()),
    );
    const startHour = Number(startTimeHour);
    const isPastTimeInput =
      startTimeEnabled &&
      Number.isFinite(startHour) &&
      startDate === berlinToday &&
      startHour < currentBerlinHour;
    if (isPastTimeInput) {
      console.info(`${logPrefix} validation blocked: startTime in past`);
      toast({ title: "Startzeit liegt in der Vergangenheit", variant: "destructive" });
      return false;
    }
    return true;
  };

  const submitAppointment = async () => {
    if (isLocked) {
      toast({ title: "Termin ist gesperrt", description: "Nur Admins dürfen vergangene Termine ändern.", variant: "destructive" });
      console.info(`${logPrefix} save blocked: locked appointment`);
      return;
    }
    if (!validateForm()) return;
    const berlinToday = getBerlinTodayDateString();
    const isPastDateInput = startDate < berlinToday;
    const startHour = Number(startTimeHour);
    const currentBerlinHour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Berlin",
        hour: "2-digit",
        hour12: false,
      }).format(new Date()),
    );
    const isPastTimeInput =
      startTimeEnabled &&
      Number.isFinite(startHour) &&
      startDate === berlinToday &&
      startHour < currentBerlinHour;
    // Kein Save bei historischen Eingaben.
    if (isPastDateInput || isPastTimeInput) return;

    if (assignedEmployeeIds.length === 0) {
      console.info(`${logPrefix} save requires confirmation: no employees`);
      setEmployeeConfirmOpen(true);
      return;
    }

    await persistAppointment();
  };

  const deleteAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId: targetAppointmentId }: { appointmentId: number; projectId: number | null }) => {
      const fetchFreshVersion = async (): Promise<number> => {
        const detail = await queryClient.fetchQuery({
          queryKey: ["/api/appointments", targetAppointmentId],
          queryFn: () => fetchJson<AppointmentDetail>(`/api/appointments/${targetAppointmentId}`),
          staleTime: 0,
        });
        const version = detail?.version;
        if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
          console.warn(`${logPrefix} delete blocked: missing or invalid fresh version`, {
            appointmentId: targetAppointmentId,
            version,
          });
          throw buildApiError("Termin kann derzeit nicht geloescht werden. Bitte neu laden.", 422, "VALIDATION_ERROR");
        }
        return version;
      };

      const requestDelete = async (version: number) => {
        console.info(`${logPrefix} delete request`, { appointmentId: targetAppointmentId, version });
        const response = await fetch(`/api/appointments/${targetAppointmentId}`, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ version }),
        });
        console.info(`${logPrefix} delete response`, { appointmentId: targetAppointmentId, status: response.status, version });
        if (response.ok) return;

        const rawBody = await response.text();
        const parsed = parseErrorPayload(rawBody);
        if (parsed?.code === "LOCK_VIOLATION") {
          throw buildApiError("Termin ist gesperrt.", response.status, "LOCK_VIOLATION");
        }
        if (parsed?.code === "VERSION_CONFLICT") {
          throw buildApiError("Termin wurde parallel geaendert.", response.status, "VERSION_CONFLICT");
        }
        if (parsed?.code === "VALIDATION_ERROR") {
          throw buildApiError("Ungueltige Loeschdaten (Version). Bitte neu laden.", response.status, "VALIDATION_ERROR");
        }
        throw buildApiError(parsed?.message ?? (response.statusText || "Loeschen fehlgeschlagen"), response.status, parsed?.code);
      };

      try {
        const freshVersion = await fetchFreshVersion();
        await requestDelete(freshVersion);
      } catch (error) {
        const err = error as AppointmentApiError;
        if (err.code !== "VERSION_CONFLICT") throw error;

        console.info(`${logPrefix} delete retry after VERSION_CONFLICT`, { appointmentId: targetAppointmentId });
        const freshVersion = await fetchFreshVersion();
        try {
          await requestDelete(freshVersion);
        } catch (retryError) {
          const retryErr = retryError as AppointmentApiError;
          if (retryErr.code === "VERSION_CONFLICT") {
            throw buildApiError(
              "Termin wurde parallel geaendert. Bitte Formular neu oeffnen.",
              retryErr.status,
              "VERSION_CONFLICT",
            );
          }
          throw retryError;
        }
      }

      return targetAppointmentId;
    },
    onSuccess: async (_deletedAppointmentId, variables) => {
      const projectIdForInvalidation = variables.projectId;
      await invalidateRelatedAppointmentQueries(projectIdForInvalidation);
      if (appointmentId) {
        await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId] });
      }
      toast({ title: "Termin gelöscht" });
      onSaved?.();
    },
    onError: (error) => {
      const err = error as AppointmentApiError;
      if (err.code === "LOCK_VIOLATION" || err.status === 403) {
        toast({
          title: "Löschen nicht möglich",
          description: "Termin ist gesperrt.",
          variant: "destructive",
        });
        return;
      }
      if (err.code === "VERSION_CONFLICT") {
        toast({
          title: "Löschen nicht möglich",
          description: err.message || "Termin wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      if (err.code === "VALIDATION_ERROR") {
        toast({
          title: "Löschen nicht möglich",
          description: "Ungueltige Loeschdaten. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      const message = error instanceof Error ? error.message : "Löschen fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    },
  });

  const persistAppointment = async () => {
    if (!selectedProjectId) return;
    const basePayload = {
      projectId: selectedProjectId,
      tourId: selectedTourId,
      startDate,
      endDate: isEndDateEnabled ? endDate : null,
      startTime: startTimeEnabled ? buildTimeString(startTimeHour) : null,
      employeeIds: assignedEmployeeIds,
    };

    const method = isEditing ? "PATCH" : "POST";
    const url = isEditing ? `/api/appointments/${appointmentId}` : "/api/appointments";
    const version = appointmentDetail?.version;
    if (isEditing && (typeof version !== "number" || !Number.isInteger(version) || version < 1)) {
      console.warn(`${logPrefix} submit blocked: missing or invalid version`, {
        appointmentId,
        version,
      });
      toast({
        title: "Speichern nicht moeglich",
        description: "Termin kann derzeit nicht gespeichert werden. Bitte neu laden.",
        variant: "destructive",
      });
      return;
    }
    const payload = isEditing
      ? { ...basePayload, version }
      : basePayload;

    console.info(`${logPrefix} submit`, {
      method,
      url,
      projectId: payload.projectId,
      tourId: payload.tourId,
      version: isEditing ? (payload as { version?: number }).version : undefined,
      employeeCount: payload.employeeIds.length,
      startDate: payload.startDate,
      endDate: payload.endDate,
    });

    try {
      setIsSaving(true);
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const rawBody = await response.text();
      const parsedBody = parseJsonBody(rawBody);
      const parsed = parseErrorPayload(rawBody);
      const data =
        parsedBody && typeof parsedBody === "object"
          ? (parsedBody as ApiSuccessPayload)
          : (rawBody.trim().length > 0 ? { message: rawBody } : null);
      console.info(`${logPrefix} submit response`, { status: response.status });
      if (!response.ok) {
        if (parsed?.code === "BUSINESS_CONFLICT") {
          const conflictNames = formatConflictEmployees(parsed.conflictEmployees);
          const conflictDetail = conflictNames
            ? `Konflikt mit: ${conflictNames}.`
            : "Mindestens ein Mitarbeiter ist in diesem Zeitraum bereits geplant.";
          console.info(`${logPrefix} submit blocked: BUSINESS_CONFLICT`, {
            status: response.status,
            conflictEmployees: parsed.conflictEmployees?.length ?? 0,
          });
          toast({
            title: "Speichern nicht moeglich",
            description: `${parsed.message ?? "Termin ueberschneidet sich mit bestehenden Mitarbeiter-Terminen."} ${conflictDetail}`,
            variant: "destructive",
          });
          return;
        }
        if (parsed?.code === "VERSION_CONFLICT") {
          console.info(`${logPrefix} submit blocked: VERSION_CONFLICT`, { status: response.status });
          toast({
            title: "Speichern nicht moeglich",
            description: "Termin wurde zwischenzeitlich geaendert. Bitte neu laden und erneut speichern.",
            variant: "destructive",
          });
          return;
        }
        throw new Error((data as { message?: string } | null)?.message ?? "Speichern fehlgeschlagen");
      }
      const savedAppointmentId = data?.id ?? appointmentId ?? null;
      console.info(`${logPrefix} save success`, {
        action: isEditing ? "edit" : "create",
        projectId: payload.projectId,
        appointmentId: savedAppointmentId,
      });
      const upcomingAppointmentsQueryKey = getProjectAppointmentsQueryKey({
        projectId: payload.projectId,
        fromDate: projectAppointmentsUpcomingFromDate,
        userRole,
      });
      const allAppointmentsQueryKey = getProjectAppointmentsQueryKey({
        projectId: payload.projectId,
        fromDate: PROJECT_APPOINTMENTS_ALL_FROM_DATE,
        userRole,
      });
      console.info(`${logPrefix} cache invalidate`, {
        upcomingQueryKey: upcomingAppointmentsQueryKey,
        allQueryKey: allAppointmentsQueryKey,
      });
      await invalidateRelatedAppointmentQueries(payload.projectId);
      if (isEditing && appointmentId) {
        await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId] });
      }
      toast({
        title: isEditing ? "Termin gespeichert" : "Termin erstellt",
      });
      setInitialFormSnapshot(buildFormSnapshot({
        projectId: selectedProjectId,
        tourId: selectedTourId,
        startDate,
        endDate,
        isEndDateEnabled,
        startTimeHour,
        startTimeEnabled,
        employeeIds: assignedEmployeeIds,
      }));
      onSaved?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Speichern fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EntityFormLayout
      title={isEditing ? "Termin bearbeiten" : "Neuer Termin"}
      icon={<Calendar className="w-6 h-6" />}
      onClose={handleRequestClose}
      onCancel={handleRequestClose}
      onSubmit={!isLocked ? submitAppointment : undefined}
      isSaving={isSaving}
      saveLabel={isEditing ? "Speichern" : "Termin erstellen"}
      closeOnSubmitSuccess={false}
      testIdPrefix="appointment"
      footerActions={
        isEditing && appointmentId ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={isLocked || deleteAppointmentMutation.isPending}
            data-testid="button-delete-appointment"
          >
            Termin loeschen
          </Button>
        ) : undefined
      }
    >
      {isLocked && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Termin gesperrt</AlertTitle>
          <AlertDescription>
            Historische Termine können nicht verändert werden. Kontaktieren Sie einen Admin.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <RelationSlot
            title="Projektzuordnung"
            icon={<FolderKanban className="w-4 h-4" />}
            state={isLocked ? "readonly" : selectedProject ? "active" : "empty"}
            onAdd={isLocked ? undefined : () => setProjectPickerOpen(true)}
            onRemove={isLocked ? undefined : () => setSelectedProjectId(null)}
            addLabel="Projekt auswählen"
            emptyText="Kein Projekt ausgewählt"
            testId="slot-project-relation"
            addActionTestId="button-select-project"
          >
            {selectedProject ? (
              <ProjectDetailCard
                project={selectedProject}
                customerNumber={selectedCustomer?.customerNumber ?? null}
                projectStatusTitles={selectedProjectStatuses.map((item) => item.status.title)}
                testId="badge-project"
              />
            ) : null}
          </RelationSlot>

          <RelationSlot
            title="Kunde"
            icon={<Users className="w-4 h-4" />}
            state="readonly"
            emptyText="Kunde wird über das Projekt bestimmt"
            testId="slot-customer-relation"
          >
            {selectedCustomer ? (
              <CustomerDetailCard customer={selectedCustomer} testId="badge-customer" variant="relationCompact" />
            ) : null}
          </RelationSlot>

          {selectedProjectId === null ? (
            <DocumentExtractionDropzone
              onFileSelected={(file) => {
                void runDocumentExtraction(file);
              }}
              disabled={isLocked}
              isProcessing={documentExtractionLoading}
            />
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="sub-panel space-y-3">
            <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Zeitpunkt und Dauer
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Startdatum</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  disabled={isLocked}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Enddatum</Label>
                {isEndDateEnabled ? (
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    disabled={isLocked}
                    data-testid="input-end-date"
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setIsEndDateEnabled(true)}
                    disabled={isLocked}
                    data-testid="button-enable-end-date"
                  >
                    Enddatum hinzufügen
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Startzeit (optional)</Label>
                {startTimeEnabled ? (
                  <Input
                    id="startTime"
                    inputMode="numeric"
                    value={startTimeHour}
                    onChange={(event) => setStartTimeHour(formatHourInput(event.target.value))}
                    placeholder="HH"
                    disabled={isLocked}
                    data-testid="input-start-time"
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setStartTimeEnabled(true)}
                    disabled={isLocked}
                    data-testid="button-enable-start-time"
                  >
                    Startzeit hinzufügen
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Endzeit</Label>
                <Input
                  id="endTime"
                  type="time"
                  disabled
                  value=""
                  placeholder="--:--"
                  data-testid="input-end-time"
                />
              </div>
            </div>
          </div>

          <div className="sub-panel space-y-3">
            <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
              <Route className="w-4 h-4" />
              Tourzuordnung
            </h3>

            {selectedTour ? (
              <TourInfoBadge
                id={selectedTour.id}
                name={selectedTour.name}
                color={selectedTour.color}
                members={tourMembersById.get(selectedTour.id) ?? []}
                action={isLocked ? "none" : "remove"}
                onRemove={() => handleTourChange(null)}
                fullWidth
                testId="badge-tour"
              />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-muted-foreground">
                Keine Tour ausgewählt
              </div>
            )}

            {!selectedTour && (
              <div className="flex flex-wrap gap-2">
                {tours.map((tour) => (
                  <TourInfoBadge
                    key={tour.id}
                    id={tour.id}
                    name={tour.name}
                    color={tour.color}
                    members={tourMembersById.get(tour.id) ?? []}
                    action={isLocked ? "none" : "add"}
                    onAdd={() => handleTourChange(tour.id)}
                    size="sm"
                    testId={`badge-tour-select-${tour.id}`}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="mt-8 space-y-6">
        <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
          <Users className="w-4 h-4" />
          Mitarbeiter zuweisen
        </h3>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Teams</Label>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <TeamInfoBadge
                key={team.id}
                id={team.id}
                name={team.name}
                color={team.color}
                members={teamMembersById.get(team.id) ?? []}
                action={isLocked ? "none" : "add"}
                onAdd={() => handleAssignTeam(team)}
                size="sm"
                testId={`badge-team-${team.id}`}
              />
            ))}
            {teams.length === 0 && (
              <div className="text-xs text-muted-foreground">Keine Teams vorhanden</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border p-4 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Zugewiesene Mitarbeiter</Label>
            <PlusActionButton
              onClick={() => setEmployeePickerOpen(true)}
              disabled={isLocked}
              data-testid="button-add-employee"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {assignedEmployees.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">Keine Mitarbeiter zugewiesen</div>
            ) : (
              assignedEmployees.map((employee) => (
                <EmployeeInfoBadge
                  key={employee.id}
                  id={employee.id}
                  firstName={employee.firstName}
                  lastName={employee.lastName}
                  action={isLocked ? "none" : "remove"}
                  onRemove={() => removeEmployee(employee.id)}
                  size="sm"
                  testId={`badge-employee-${employee.id}`}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <DocumentExtractionDialog
        open={documentExtractionOpen}
        onOpenChange={setDocumentExtractionOpen}
        data={documentExtractionData}
        isBusy={documentExtractionLoading}
        disableProjectApply={Boolean(selectedProjectId)}
        dataApplyLabel="Daten übernehmen"
        onApplyData={applyExtractedProject}
      />

      <Dialog open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <ProjectsPage
            showCloseButton={false}
            tableOnly
            title="Projekt auswählen"
            onSelectProject={handleProjectSelect}
            onCancel={() => setProjectPickerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <EmployeePickerDialogList
            employees={availableEmployees}
            teams={teams}
            tours={tours}
            isLoading={employeesLoading}
            title="Mitarbeiter auswählen"
            onSelectEmployee={(employeeId) => {
              addEmployees([employeeId]);
              setEmployeePickerOpen(false);
            }}
            onClose={() => setEmployeePickerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={tourConfirmOpen} onOpenChange={setTourConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mitarbeiterliste zurücksetzen?</AlertDialogTitle>
            <AlertDialogDescription>
              Beim Ändern der Tour werden die bisherigen Mitarbeiter entfernt und durch die Tour-Mitarbeiter ersetzt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingTourChange(null)}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingTourChange) {
                  applyTourChange(pendingTourChange.tourId, pendingTourChange.employeeIds);
                }
                setPendingTourChange(null);
                setTourConfirmOpen(false);
              }}
            >
              Tour übernehmen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={employeeConfirmOpen} onOpenChange={setEmployeeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ohne Mitarbeiter speichern?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Termin wird ohne zugewiesene Mitarbeiter gespeichert. Möchten Sie fortfahren?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setEmployeeConfirmOpen(false);
                void persistAppointment();
              }}
            >
              Trotzdem speichern
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Termin löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Termin wird dauerhaft gelöscht und kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground border border-destructive-border hover:bg-destructive/90"
              disabled={deleteAppointmentMutation.isPending || !appointmentId}
              onClick={() => {
                if (!appointmentId) return;
                deleteAppointmentMutation.mutate({ appointmentId, projectId: selectedProjectId });
              }}
            >
              {deleteAppointmentMutation.isPending ? "Termin löschen..." : "Termin löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Änderungen verwerfen?</AlertDialogTitle>
            <AlertDialogDescription>
              Es gibt ungespeicherte Änderungen. Möchten Sie das Formular wirklich schließen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Weiter bearbeiten</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCloseConfirmOpen(false);
                onCancel?.();
              }}
            >
              Verwerfen und schließen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading && (
        <div className="mt-6 text-sm text-muted-foreground">
          Daten werden geladen...
        </div>
      )}
    </EntityFormLayout>
  );
}
