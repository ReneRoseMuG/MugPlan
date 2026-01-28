import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { EntityCard } from "@/components/ui/entity-card";
import { HelpCircle, Pencil, Search } from "lucide-react";
import type { HelpText } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function HelpTextsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHelpText, setEditingHelpText] = useState<HelpText | null>(null);
  const [formHelpKey, setFormHelpKey] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: helpTexts = [], isLoading } = useQuery<HelpText[]>({
    queryKey: ["/api/help-texts", searchQuery],
    queryFn: async () => {
      const url = searchQuery ? `/api/help-texts?query=${encodeURIComponent(searchQuery)}` : "/api/help-texts";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Fehler beim Laden");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { helpKey: string; title: string; body: string; isActive: boolean }) => {
      const response = await apiRequest("POST", "/api/help-texts", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/help-texts"] });
      handleCloseDialog();
      toast({ title: "Hilfetext erstellt" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Fehler", 
        description: error.message.includes("409") ? "Der Hilfe-Schlüssel ist bereits vergeben" : error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { helpKey?: string; title?: string; body?: string; isActive?: boolean } }) => {
      const response = await apiRequest("PUT", `/api/help-texts/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/help-texts"] });
      handleCloseDialog();
      toast({ title: "Hilfetext aktualisiert" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Fehler", 
        description: error.message.includes("409") ? "Der Hilfe-Schlüssel ist bereits vergeben" : error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/help-texts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/help-texts"] });
      toast({ title: "Hilfetext gelöscht" });
    },
  });

  const handleOpenCreate = () => {
    setEditingHelpText(null);
    setFormHelpKey("");
    setFormTitle("");
    setFormBody("");
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const handleOpenEdit = (helpText: HelpText) => {
    setEditingHelpText(helpText);
    setFormHelpKey(helpText.helpKey);
    setFormTitle(helpText.title);
    setFormBody(helpText.body);
    setFormIsActive(helpText.isActive);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingHelpText(null);
    setFormHelpKey("");
    setFormTitle("");
    setFormBody("");
    setFormIsActive(true);
  };

  const handleSave = () => {
    if (!formHelpKey.trim() || !formTitle.trim()) return;

    if (editingHelpText) {
      updateMutation.mutate({
        id: editingHelpText.id,
        data: { helpKey: formHelpKey, title: formTitle, body: formBody, isActive: formIsActive },
      });
    } else {
      createMutation.mutate({ helpKey: formHelpKey, title: formTitle, body: formBody, isActive: formIsActive });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Möchten Sie diesen Hilfetext wirklich löschen?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <>
      <CardListLayout
        title="Hilfetexte"
        icon={<HelpCircle className="w-5 h-5" />}
        isLoading={isLoading}
        gridTestId="list-helptexts"
        gridCols="2"
        toolbar={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Suchen (Schlüssel oder Titel)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-64"
              data-testid="input-search-helptexts"
            />
          </div>
        }
        primaryAction={{
          label: "Neuer Hilfetext",
          onClick: handleOpenCreate,
          isPending: createMutation.isPending,
          testId: "button-new-helptext",
        }}
        isEmpty={helpTexts.length === 0}
        emptyState={
          <p className="text-sm text-slate-400 text-center py-8 col-span-2">
            {searchQuery ? "Keine Hilfetexte gefunden" : "Keine Hilfetexte vorhanden"}
          </p>
        }
      >
        {helpTexts.map((helpText) => (
          <HelpTextCard
            key={helpText.id}
            helpText={helpText}
            onEdit={() => handleOpenEdit(helpText)}
            onDelete={() => handleDelete(helpText.id)}
          />
        ))}
      </CardListLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              {editingHelpText ? "Hilfetext bearbeiten" : "Neuer Hilfetext"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="helptext-key">Hilfe-Schlüssel *</Label>
              <Input
                id="helptext-key"
                value={formHelpKey}
                onChange={(e) => setFormHelpKey(e.target.value)}
                placeholder="z.B. kunde-stammdaten, termin-bearbeiten..."
                className="font-mono"
                data-testid="input-helptext-key"
              />
              <p className="text-xs text-slate-500">
                Eindeutiger Schlüssel zur Identifizierung im UI (Beispiel: kunde-stammdaten)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="helptext-title">Titel *</Label>
              <Input
                id="helptext-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Titel des Hilfetextes..."
                data-testid="input-helptext-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Inhalt</Label>
              <RichTextEditor
                value={formBody}
                onChange={setFormBody}
                placeholder="Hilfetext-Inhalt eingeben..."
                className="min-h-[150px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="helptext-active"
                checked={formIsActive}
                disabled={true}
                className="w-4 h-4 cursor-not-allowed"
                data-testid="checkbox-helptext-active"
              />
              <Label htmlFor="helptext-active" className="text-muted-foreground">
                Aktiv <span className="text-xs">(nur durch Administrator änderbar)</span>
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseDialog} data-testid="button-cancel-helptext">
              Abbrechen
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formHelpKey.trim() || !formTitle.trim() || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-helptext"
            >
              {createMutation.isPending || updateMutation.isPending ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
