import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EntityFormLayout } from "@/components/ui/entity-form-layout";
import { User, Phone, MapPin } from "lucide-react";
import { NotesSection } from "@/components/NotesSection";
import { LinkedProjectsPanel } from "@/components/LinkedProjectsPanel";
import { CustomerAppointmentsPanel } from "@/components/CustomerAppointmentsPanel";
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

export function CustomerData({ customerId, onCancel, onSave, onOpenProject }: CustomerDataProps) {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    customerNumber: "",
    firstName: "",
    lastName: "",
    company: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    city: "",
  });

  const isEditMode = !!customerId;

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
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'notes'] });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: number; isPinned: boolean }) => {
      const res = await apiRequest('PATCH', `/api/notes/${noteId}/pin`, { isPinned });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'notes'] });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      await apiRequest('DELETE', `/api/customers/${customerId}/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'notes'] });
    },
    onError: (error: Error) => {
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
        phone: customer.phone || "",
        addressLine1: customer.addressLine1 || "",
        addressLine2: customer.addressLine2 || "",
        postalCode: customer.postalCode || "",
        city: customer.city || "",
      });
    }
  }, [customer]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest('POST', '/api/customers', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({ title: "Kunde angelegt", description: "Der Kunde wurde erfolgreich angelegt." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest('PATCH', `/api/customers/${customerId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] });
      toast({ title: "Gespeichert", description: "Die Kundendaten wurden erfolgreich aktualisiert." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = async () => {
    if (!formData.customerNumber || !formData.firstName || !formData.lastName || !formData.phone) {
      toast({ 
        title: "Fehler", 
        description: "Bitte füllen Sie alle Pflichtfelder aus (Kundennummer, Vorname, Nachname, Telefon).", 
        variant: "destructive" 
      });
      throw new Error("validation");
    }

    if (isEditMode) {
      await updateMutation.mutateAsync(formData);
    } else {
      await createMutation.mutateAsync(formData);
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
    togglePinMutation.mutate({ noteId, isPinned });
  };

  const handleDeleteNote = (noteId: number) => {
    if (isEditMode && customerId) {
      deleteNoteMutation.mutate(noteId);
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Stammdaten
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="customerNumber" data-testid="label-customernumber">Kundennummer *</Label>
                  <Input 
                    id="customerNumber" 
                    value={formData.customerNumber}
                    onChange={(e) => setFormData({ ...formData, customerNumber: e.target.value })}
                    className="max-w-[200px] font-mono"
                    data-testid="input-customernumber"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" data-testid="label-firstname">Vorname *</Label>
                    <Input 
                      id="firstName" 
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      data-testid="input-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" data-testid="label-lastname">Nachname *</Label>
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Kontakt
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="phone" data-testid="label-phone">Telefon *</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
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

              {isEditMode && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                    Status
                  </h3>
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="isActive" 
                      checked={customer?.isActive ?? true} 
                      disabled
                      data-testid="checkbox-active" 
                    />
                    <Label htmlFor="isActive" className="text-slate-500" data-testid="label-active">
                      Kunde ist aktiv (nur lesbar)
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

          <CustomerAppointmentsPanel
            customerId={customerId}
            customerName={customer?.fullName ?? null}
          />
        </div>
      </div>
    </EntityFormLayout>
  );
}
