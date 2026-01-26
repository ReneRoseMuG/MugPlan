import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, Route, Loader2, Pencil, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Tour } from "@shared/schema";

interface TourMember {
  id: string;
  name: string;
}

interface TourWithMembers extends Tour {
  members: TourMember[];
}

const allEmployees: TourMember[] = [
  { id: "e1", name: "Thomas Müller" },
  { id: "e2", name: "Anna Schmidt" },
  { id: "e3", name: "Michael Weber" },
  { id: "e4", name: "Sandra Fischer" },
  { id: "e5", name: "Klaus Hoffmann" },
];

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

interface TourManagementProps {
  onCancel?: () => void;
}

function EditTourMembersDialog({
  open,
  onOpenChange,
  tour,
  onSaveMembers,
  assignedMemberIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour: TourWithMembers;
  onSaveMembers: (tourId: number, memberIds: string[]) => void;
  assignedMemberIds: string[];
}) {
  const currentMemberIds = tour.members.map(m => m.id);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(currentMemberIds);

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSave = () => {
    onSaveMembers(tour.id, selectedMembers);
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedMembers(currentMemberIds);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Route className="w-5 h-5" />
            Mitarbeiter bearbeiten - {tour.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div 
            className="px-4 py-3 rounded-lg border border-border"
            style={{ backgroundColor: tour.color }}
          >
            <span className="font-bold text-slate-700">{tour.name}</span>
          </div>
          
          <div>
            <div className="text-sm font-medium text-slate-700 mb-3">
              Mitarbeiter auswählen:
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allEmployees.map((employee) => {
                const isAssignedElsewhere = assignedMemberIds.includes(employee.id) && !currentMemberIds.includes(employee.id);
                const isSelected = selectedMembers.includes(employee.id);
                return (
                  <div
                    key={employee.id}
                    onClick={() => !isAssignedElsewhere && handleToggleMember(employee.id)}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${
                      isAssignedElsewhere ? "opacity-50 bg-slate-100 cursor-not-allowed" : isSelected ? "bg-primary/10" : "hover:bg-slate-50"
                    }`}
                    data-testid={`checkbox-tour-employee-${employee.id}`}
                  >
                    <Checkbox
                      id={`tour-employee-${employee.id}`}
                      disabled={isAssignedElsewhere}
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => handleToggleMember(employee.id)}
                    />
                    <span
                      className={`text-sm ${
                        isAssignedElsewhere ? "text-slate-400" : "text-slate-700"
                      }`}
                    >
                      {employee.name}
                      {isAssignedElsewhere && (
                        <span className="ml-2 text-xs text-slate-400">(bereits in Tour)</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} data-testid="button-save-tour-members">
              Speichern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TourCard({
  tour,
  onDelete,
  onColorChange,
  onEditMembers,
  isDeleting,
}: {
  tour: TourWithMembers;
  onDelete: () => void;
  onColorChange: (color: string) => void;
  onEditMembers: () => void;
  isDeleting: boolean;
}) {
  return (
    <div
      className="relative rounded-lg border border-border shadow-sm bg-white"
      data-testid={`card-tour-${tour.id}`}
    >
      <div 
        className="px-4 py-3 rounded-t-lg border-b border-border"
        style={{ backgroundColor: `${tour.color}50` }}
      >
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700" data-testid={`text-tour-name-${tour.id}`}>
            {tour.name}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            disabled={isDeleting}
            data-testid={`button-delete-tour-${tour.id}`}
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Mitarbeiter
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onEditMembers}
            data-testid={`button-edit-tour-members-${tour.id}`}
          >
            <Pencil className="w-3 h-3" />
          </Button>
        </div>
        <div className="space-y-1">
          {tour.members.map((member) => (
            <div 
              key={member.id} 
              className="text-sm text-slate-700 flex items-center gap-2"
              data-testid={`text-tour-member-${member.id}`}
            >
              <UserCheck className="w-3 h-3 text-primary" />
              {member.name}
            </div>
          ))}
          {tour.members.length === 0 && (
            <div className="text-sm text-slate-400 italic">
              Keine Mitarbeiter zugewiesen
            </div>
          )}
        </div>
      </div>
      <div className="px-4 pb-4">
        <label className="relative block w-full cursor-pointer">
          <input
            type="color"
            value={tour.color}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            data-testid={`input-tour-color-${tour.id}`}
          />
          <div 
            className="w-full py-2 rounded-md border border-border text-center text-sm font-medium transition-colors hover:bg-slate-50"
            style={{ backgroundColor: `${tour.color}50` }}
          >
            Farbe ändern
          </div>
        </label>
      </div>
    </div>
  );
}

export function TourManagement({ onCancel }: TourManagementProps) {
  const [tourMembers, setTourMembers] = useState<Record<number, TourMember[]>>({});
  const [editingTour, setEditingTour] = useState<TourWithMembers | null>(null);

  const { data: tours = [], isLoading } = useQuery<Tour[]>({
    queryKey: ['/api/tours'],
  });

  const toursWithMembers: TourWithMembers[] = tours.map(tour => ({
    ...tour,
    members: tourMembers[tour.id] || [],
  }));

  const assignedMemberIds = toursWithMembers.flatMap((t) => t.members.map((m) => m.id));

  const createMutation = useMutation({
    mutationFn: async () => {
      const hue = Math.floor(Math.random() * 360);
      const saturation = 40 + Math.floor(Math.random() * 30);
      const lightness = 45 + Math.floor(Math.random() * 20);
      const color = hslToHex(hue, saturation, lightness);
      return apiRequest('POST', '/api/tours', { color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, color }: { id: number; color: string }) => {
      return apiRequest('PATCH', `/api/tours/${id}`, { color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/tours/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
      setTourMembers(prev => {
        const next = { ...prev };
        delete next[deletedId];
        return next;
      });
    },
  });

  const handleColorChange = (id: number, color: string) => {
    updateMutation.mutate({ id, color });
  };

  const handleSaveMembers = (tourId: number, memberIds: string[]) => {
    const members = allEmployees.filter(e => memberIds.includes(e.id));
    setTourMembers(prev => ({
      ...prev,
      [tourId]: members,
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="bg-card">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Route className="w-5 h-5" />
              Touren
            </CardTitle>
            {onCancel && (
              <Button size="lg" variant="ghost" onClick={onCancel} data-testid="button-close-tours">
                <X className="w-6 h-6" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="list-tours">
            {toursWithMembers.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                onDelete={() => deleteMutation.mutate(tour.id)}
                onColorChange={(color) => handleColorChange(tour.id, color)}
                onEditMembers={() => setEditingTour(tour)}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-new-tour"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Neue Tour
            </Button>

            {onCancel && (
              <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-tours">
                Schließen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {editingTour && (
        <EditTourMembersDialog
          open={!!editingTour}
          onOpenChange={(open) => !open && setEditingTour(null)}
          tour={editingTour}
          onSaveMembers={handleSaveMembers}
          assignedMemberIds={assignedMemberIds}
        />
      )}
    </div>
  );
}
