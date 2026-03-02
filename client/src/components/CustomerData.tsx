import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EntityFormLayout } from "@/components/ui/entity-form-layout";
import { User, Phone, MapPin, Mail } from "lucide-react";
import { NotesSection } from "@/components/NotesSection";
import { LinkedProjectsPanel } from "@/components/LinkedProjectsPanel";
import { CustomerAppointmentsPanel } from "@/components/CustomerAppointmentsPanel";
import { CustomerAttachmentsPanel } from "@/components/CustomerAttachmentsPanel";
import { DocumentExtractionDropzone } from "@/components/DocumentExtractionDropzone";
import {
  DocumentExtractionDialog,
  type ExtractionCustomerDraft,
  type ExtractionDialogData,
} from "@/components/DocumentExtractionDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Customer, Note } from "@shared/schema";

interface CustomerDataProps {
  customerId?: number | null;
  onCancel?: () => void;
  onSave?: () => void;
  onOpenProject?: (id: number) => void;
}

type CustomerSubmitPayload = {
  customerNumber: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
};

export function CustomerData({ customerId, onCancel, onSave, onOpenProject }: CustomerDataProps) {
  const { toast } = useToast();
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";
  const invalidateAppointmentProjectionQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["calendarAppointments"],
    });
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const firstKey = query.queryKey[0];
        return firstKey === "appointments-list"
          || firstKey === "customers-page-appointments"
          || firstKey === "employees-page-appointments"
          || firstKey === "projects-page-appointments"
          || firstKey === "customerAppointments"
          || firstKey === "entityAppointments"
          || firstKey === "projectAppointments";
      },
    });
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const firstKey = query.queryKey[0];
        return typeof firstKey === "string" && firstKey.includes("/current-appointments?");
      },
    });
  };
  
  const [formData, setFormData] = useState({
    customerNumber: "",
    firstName: "",
    lastName: "",
    company: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    city: "",
    isActive: true,
  });
  const [documentExtractionOpen, setDocumentExtractionOpen] = useState(false);
  const [documentExtractionLoading, setDocumentExtractionLoading] = useState(false);
  const [documentExtractionData, setDocumentExtractionData] = useState<ExtractionDialogData | null>(null);

  const isEditMode = !!customerId;
  const normalizeOptionalInput = (value: string): string | null => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ['/api/customers', customerId],
    enabled: isEditMode,
  });

  const { data: notes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ['/api/customers', customerId, 'notes'],
    enabled: isEditMode && !!customerId,
  });

  const createNoteMutation = useMutation({
    mutationFn: async ({ title, body, templateId }: { title: string; body: string; templateId?: number }) => {
      const res = await apiRequest('POST', `/api/customers/${customerId}/notes`, { title, body, templateId });
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'notes'] });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const getNoteVersion = (noteId: number): number => {
    const note = notes.find((entry) => entry.id === noteId);
    if (!note || !Number.isInteger(note.version) || note.version < 1) {
      throw new Error("422: {\"code\":\"VALIDATION_ERROR\"}");
    }
    return note.version;
  };

  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned, version }: { noteId: number; isPinned: boolean; version: number }) => {
      const res = await apiRequest('PATCH', `/api/notes/${noteId}/pin`, { isPinned, version });
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'notes'] });
    },
    onError: (error: Error) => {
      const code = extractErrorCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Notiz konnte nicht aktualisiert werden",
          description: "Datensatz wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async ({ noteId, version }: { noteId: number; version: number }) => {
      await apiRequest('DELETE', `/api/customers/${customerId}/notes/${noteId}`, { version });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'notes'] });
    },
    onError: (error: Error) => {
      const code = extractErrorCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Notiz konnte nicht geloescht werden",
          description: "Datensatz wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        customerNumber: customer.customerNumber || "",
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        company: customer.company || "",
        email: customer.email || "",
        phone: customer.phone || "",
        addressLine1: customer.addressLine1 || "",
        addressLine2: customer.addressLine2 || "",
        postalCode: customer.postalCode || "",
        city: customer.city || "",
        isActive: customer.isActive ?? true,
      });
    }
  }, [customer]);

  const extractErrorCode = (error: unknown): string | null => {
    if (!(error instanceof Error)) return null;
    const match = error.message.match(/"code"\s*:\s*"([A-Z_]+)"/);
    return match?.[1] ?? null;
  };

  const createMutation = useMutation({
    mutationFn: async (data: CustomerSubmitPayload) => {
      const res = await apiRequest('POST', '/api/customers', data);
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      void invalidateAppointmentProjectionQueries();
      toast({ title: "Kunde angelegt", description: "Der Kunde wurde erfolgreich angelegt." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CustomerSubmitPayload & { isActive: boolean }) => {
      if (!customer || !Number.isInteger(customer.version) || customer.version < 1) {
        throw new Error("422: {\"code\":\"VALIDATION_ERROR\"}");
      }
      const payload = {
        ...data,
        version: customer.version,
        isActive: isAdmin ? data.isActive : undefined,
      };
      const res = await apiRequest('PATCH', `/api/customers/${customerId}`, payload);
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] });
      void invalidateAppointmentProjectionQueries();
      toast({ title: "Gespeichert", description: "Die Kundendaten wurden erfolgreich aktualisiert." });
    },
    onError: (error: Error) => {
      const code = extractErrorCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({ title: "Speichern nicht moeglich", description: "Kunde wurde zwischenzeitlich geaendert. Bitte neu laden.", variant: "destructive" });
        return;
      }
      if (code === "FORBIDDEN") {
        toast({ title: "Speichern nicht moeglich", description: "Aenderung des Aktiv-Status ist nur fuer Admin erlaubt.", variant: "destructive" });
        return;
      }
      if (code === "VALIDATION_ERROR") {
        toast({ title: "Speichern nicht moeglich", description: "Ungueltige Kundendaten. Bitte neu laden.", variant: "destructive" });
        return;
      }
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = async () => {
    if (!formData.customerNumber.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte fuellen Sie die Kundennummer aus.",
        variant: "destructive",
      });
      throw new Error("validation");
    }

    const trimmedEmail = formData.email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie eine gueltige E-Mail-Adresse ein.",
        variant: "destructive",
      });
      throw new Error("validation");
    }

    const submitData: CustomerSubmitPayload & { isActive: boolean } = {
      customerNumber: formData.customerNumber.trim(),
      firstName: normalizeOptionalInput(formData.firstName),
      lastName: normalizeOptionalInput(formData.lastName),
      company: normalizeOptionalInput(formData.company),
      email: normalizeOptionalInput(formData.email),
      phone: normalizeOptionalInput(formData.phone),
      addressLine1: normalizeOptionalInput(formData.addressLine1),
      addressLine2: normalizeOptionalInput(formData.addressLine2),
      postalCode: normalizeOptionalInput(formData.postalCode),
      city: normalizeOptionalInput(formData.city),
      isActive: formData.isActive,
    };

    if (isEditMode) {
      await updateMutation.mutateAsync(submitData);
    } else {
      await createMutation.mutateAsync(submitData);
    }

    if (onSave && onSave !== onCancel) {
      onSave();
    }
  };

  const handleAddNote = ({ title, body, templateId }: { title: string; body: string; templateId?: number }) => {
    if (!isEditMode || !customerId) {
      toast({ title: "Notiz noch nicht verfügbar", description: "Bitte speichern Sie den Kunden zuerst." });
      return;
    }
    createNoteMutation.mutate({ title, body, templateId });
  };

  const handleTogglePin = (noteId: number, isPinned: boolean) => {
    const version = getNoteVersion(noteId);
    togglePinMutation.mutate({ noteId, isPinned, version });
  };

  const handleDeleteNote = (noteId: number) => {
    if (isEditMode && customerId) {
      const version = getNoteVersion(noteId);
      deleteNoteMutation.mutate({ noteId, version });
    }
  };

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

  const runDocumentExtractionCustomer = async (file: File) => {
    setDocumentExtractionLoading(true);
    try {
      const multipart = new FormData();
      multipart.append("file", file);
      const response = await fetch("/api/document-extraction/extract?scope=customer_form", {
        method: "POST",
        credentials: "include",
        body: multipart,
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

  const applyExtractedCustomerDraft = async ({ customer }: { customer: ExtractionCustomerDraft }) => {
    try {
      if (!customer.customerNumber.trim()) {
        throw new Error("Kundennummer ist erforderlich.");
      }
      const resolution = await resolveCustomerByNumber(customer.customerNumber);
      if (resolution.resolution !== "none") {
        throw new Error("Kundennummer ist bereits vergeben.");
      }
      setFormData((prev) => ({
        ...prev,
        customerNumber: customer.customerNumber.trim(),
        firstName: (customer.firstName ?? "").trim(),
        lastName: (customer.lastName ?? "").trim(),
        company: (customer.company ?? "").trim(),
        email: (customer.email ?? "").trim(),
        phone: (customer.phone ?? "").trim(),
        addressLine1: (customer.addressLine1 ?? "").trim(),
        addressLine2: (customer.addressLine2 ?? "").trim(),
        postalCode: (customer.postalCode ?? "").trim(),
        city: (customer.city ?? "").trim(),
      }));
      setDocumentExtractionOpen(false);
      toast({ title: "Kundendaten übernommen" });
    } catch (error) {
      toast({
        title: "Kundendaten konnten nicht übernommen werden",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    }
  };

  if (isEditMode && isLoading) {
    return (
      <div className="h-full p-6 overflow-auto">
        <Card className="max-w-6xl mx-auto">
          <CardHeader className="border-b border-border">
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <EntityFormLayout
      title={isEditMode ? "Kundendaten bearbeiten" : "Neuer Kunde"}
      icon={<User className="w-6 h-6" />}
      onClose={onCancel}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      testIdPrefix="customer"
    >
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Stammdaten
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="customerNumber" data-testid="label-customernumber">Kundennummer *</Label>
                  <Input 
                    id="customerNumber" 
                    value={formData.customerNumber}
                    onChange={(e) => setFormData({ ...formData, customerNumber: e.target.value })}
                    readOnly={isEditMode}
                    className="max-w-[200px]"
                    data-testid="input-customernumber"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" data-testid="label-firstname">Vorname</Label>
                    <Input 
                      id="firstName" 
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      data-testid="input-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" data-testid="label-lastname">Nachname</Label>
                    <Input 
                      id="lastName" 
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      data-testid="input-lastname"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" data-testid="label-company">Firma</Label>
                  <Input 
                    id="company" 
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    data-testid="input-company"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Kontakt
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="phone" data-testid="label-phone">Telefon</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" data-testid="label-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    E-Mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Adresse
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="addressLine1" data-testid="label-addressline1">Straße</Label>
                  <Input 
                    id="addressLine1" 
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    data-testid="input-addressline1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine2" data-testid="label-addressline2">Adresszusatz</Label>
                  <Input 
                    id="addressLine2" 
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    data-testid="input-addressline2"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode" data-testid="label-postalcode">PLZ</Label>
                    <Input 
                      id="postalCode" 
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      data-testid="input-postalcode"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="city" data-testid="label-city">Ort</Label>
                    <Input 
                      id="city" 
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      data-testid="input-city"
                    />
                  </div>
                </div>
              </div>

              {!isEditMode ? (
                <DocumentExtractionDropzone
                  onFileSelected={(file) => {
                    void runDocumentExtractionCustomer(file);
                  }}
                  isProcessing={documentExtractionLoading}
                />
              ) : null}

              {isEditMode && isAdmin && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold tracking-wider text-primary">
                    Status
                  </h3>
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="isActive" 
                      checked={formData.isActive}
                      disabled={!isAdmin}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked === true }))}
                      data-testid="checkbox-active" 
                    />
                    <Label htmlFor="isActive" className="text-slate-500" data-testid="label-active">
                      Kunde ist aktiv {isAdmin ? "" : "(nur durch Administrator aenderbar)"}
                    </Label>
                  </div>
                </div>
              )}

          <NotesSection
            notes={notes}
            isLoading={notesLoading}
            onAdd={handleAddNote}
            onTogglePin={isEditMode ? handleTogglePin : undefined}
            onDelete={isEditMode ? handleDeleteNote : undefined}
          />
        </div>

        <div className="space-y-6">
          <LinkedProjectsPanel customerId={customerId} onOpenProject={onOpenProject} />

          <CustomerAppointmentsPanel customerId={customerId} />

          {isEditMode && <CustomerAttachmentsPanel customerId={customerId} />}
        </div>
      </div>

      <DocumentExtractionDialog
        open={documentExtractionOpen}
        onOpenChange={setDocumentExtractionOpen}
        data={documentExtractionData}
        isBusy={documentExtractionLoading}
        showProjectSection={false}
        customerApplyLabel="Kundendaten übernehmen"
        onApplyCustomer={applyExtractedCustomerDraft}
      />
    </EntityFormLayout>
  );
}
