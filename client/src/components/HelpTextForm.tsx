import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { HelpCircle } from "lucide-react";
import { EntityFormLayout } from "@/components/ui/entity-form-layout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { HelpText } from "@shared/schema";

interface HelpTextFormProps {
  helpTextId?: number;
  onCancel?: () => void;
  onSaved?: () => void;
}

function extractApiCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const match = error.message.match(/"code"\s*:\s*"([A-Z_]+)"/);
  return match?.[1] ?? null;
}

export function HelpTextForm({ helpTextId, onCancel, onSaved }: HelpTextFormProps) {
  const { toast } = useToast();
  const isEditing = Number.isInteger(helpTextId) && (helpTextId as number) > 0;

  const [helpKey, setHelpKey] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: helpText, isLoading } = useQuery<HelpText>({
    queryKey: ["/api/help-texts/by-id", helpTextId],
    queryFn: async () => {
      const response = await fetch(`/api/help-texts/by-id/${helpTextId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Hilfetext konnte nicht geladen werden.");
      }
      return response.json();
    },
    enabled: isEditing,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (!helpText) return;
    setHelpKey(helpText.helpKey);
    setTitle(helpText.title);
    setBody(helpText.body);
  }, [helpText]);

  const createMutation = useMutation({
    mutationFn: async (payload: { helpKey: string; title: string; body: string; isActive: boolean }) => {
      await apiRequest("POST", "/api/help-texts", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/help-texts"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/help-texts/by-id", helpTextId] });
      toast({ title: "Hilfetext erstellt" });
      onSaved?.();
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Hilfetext konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: number; helpKey: string; title: string; body: string; version: number }) => {
      await apiRequest("PUT", `/api/help-texts/${payload.id}`, {
        helpKey: payload.helpKey,
        title: payload.title,
        body: payload.body,
        isActive: true,
        version: payload.version,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/help-texts"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/help-texts/by-id", helpTextId] });
      toast({ title: "Hilfetext aktualisiert" });
      onSaved?.();
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Speichern nicht möglich",
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Hilfetext konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (payload: { id: number; version: number }) => {
      await apiRequest("DELETE", `/api/help-texts/${payload.id}`, { version: payload.version });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/help-texts"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/help-texts/by-id", helpTextId] });
      toast({ title: "Hilfetext gelöscht" });
      onSaved?.();
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Löschen nicht möglich",
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Hilfetext konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const isBusy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const isSaveDisabled = useMemo(
    () => !helpKey.trim() || !title.trim() || isBusy || (isEditing && !helpText),
    [helpKey, title, isBusy, isEditing, helpText],
  );

  const handleSubmit = async () => {
    if (!helpKey.trim() || !title.trim()) {
      toast({
        title: "Bitte Pflichtfelder ausfüllen",
        variant: "destructive",
      });
      throw new Error("VALIDATION_ERROR");
    }

    if (isEditing) {
      if (!helpText) {
        throw new Error("NOT_FOUND");
      }
      await updateMutation.mutateAsync({
        id: helpText.id,
        helpKey: helpKey.trim(),
        title: title.trim(),
        body,
        version: helpText.version,
      });
      return;
    }

    await createMutation.mutateAsync({
      helpKey: helpKey.trim(),
      title: title.trim(),
      body,
      isActive: true,
    });
  };

  return (
    <EntityFormLayout
      title={isEditing ? "Hilfetext bearbeiten" : "Neuer Hilfetext"}
      icon={<HelpCircle className="w-6 h-6" />}
      onClose={onCancel}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      isSaving={isBusy}
      saveLabel="Speichern"
      testIdPrefix="helptext"
      footerActions={isEditing && helpText ? (
        <Button
          variant="destructive"
          onClick={() => {
            if (!helpText) return;
            if (!window.confirm(`Wollen Sie den Hilfetext ${helpText.title} wirklich löschen?`)) return;
            deleteMutation.mutate({ id: helpText.id, version: helpText.version });
          }}
          disabled={isBusy}
          data-testid="button-delete-helptext"
        >
          Hilfetext löschen
        </Button>
      ) : undefined}
    >
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Hilfetext wird geladen...</div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor={isEditing ? undefined : "helptext-key"}>Hilfe-Schlüssel</Label>
            {isEditing ? (
              <div
                className="h-10 rounded-md border border-border/50 bg-[hsl(var(--sub-panel-background))] px-3 flex items-center text-sm"
                data-testid="text-helptext-key"
              >
                {helpKey}
              </div>
            ) : (
              <Input
                id="helptext-key"
                value={helpKey}
                onChange={(event) => setHelpKey(event.target.value)}
                placeholder="z.B. kunde-stammdaten"
                data-testid="input-helptext-key"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="helptext-title">Titel *</Label>
            <Input
              id="helptext-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titel des Hilfetextes"
              data-testid="input-helptext-title"
            />
          </div>

          <div className="space-y-2">
            <Label>Inhalt</Label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Hilfetext-Inhalt eingeben..."
              className="min-h-[220px]"
            />
          </div>
        </div>
      )}
      {isSaveDisabled ? <div className="sr-only" data-testid="helptext-save-disabled" /> : null}
    </EntityFormLayout>
  );
}


