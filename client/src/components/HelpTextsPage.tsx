import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/RichTextEditor";
import { EntityCard } from "@/components/ui/entity-card";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSettings } from "@/hooks/useSettings";
import { HelpCircle, Pencil, Search, Plus, LayoutGrid, Table2, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { HelpText } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "board" | "table";
type HelpTextSortKey = "helpKey" | "hasContent";
type SortDirection = "asc" | "desc";

function parseViewMode(value: unknown): ViewMode {
  return value === "table" ? "table" : "board";
}

function hasHelpTextContent(helpText: HelpText): boolean {
  return helpText.body.trim().length > 0;
}

function formatDate(date: Date | string | null) {
  if (!date) return "";
  const parsed = typeof date === "string" ? new Date(date) : date;
  return format(parsed, "dd.MM.yyyy", { locale: de });
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc") return <ArrowUp className="w-3.5 h-3.5" />;
  if (direction === "desc") return <ArrowDown className="w-3.5 h-3.5" />;
  return <ArrowUpDown className="w-3.5 h-3.5" />;
}

export function HelpTextsPage() {
  const { toast } = useToast();
  const { settingsByKey, setSetting } = useSettings();
  const viewModeKey = "helptexts";
  const settingsViewModeKey = `${viewModeKey}.viewMode`;
  const resolvedViewMode = parseViewMode(settingsByKey.get(settingsViewModeKey)?.resolvedValue);

  const [viewMode, setViewMode] = useState<ViewMode>(resolvedViewMode);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHelpText, setEditingHelpText] = useState<HelpText | null>(null);
  const [formHelpKey, setFormHelpKey] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<HelpTextSortKey>("helpKey");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    setViewMode(resolvedViewMode);
  }, [resolvedViewMode]);

  const { data: helpTexts = [], isLoading } = useQuery<HelpText[]>({
    queryKey: ["/api/help-texts", searchQuery],
    queryFn: async () => {
      const url = searchQuery ? `/api/help-texts?query=${encodeURIComponent(searchQuery)}` : "/api/help-texts";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Fehler beim Laden");
      return response.json();
    },
  });

  const sortedHelpTexts = useMemo(() => {
    const data = [...helpTexts];
    data.sort((a, b) => {
      const multiplier = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "hasContent") {
        const left = hasHelpTextContent(a) ? 1 : 0;
        const right = hasHelpTextContent(b) ? 1 : 0;
        if (left !== right) return (left - right) * multiplier;
        return a.helpKey.localeCompare(b.helpKey, "de") * multiplier;
      }

      return a.helpKey.localeCompare(b.helpKey, "de") * multiplier;
    });
    return data;
  }, [helpTexts, sortDirection, sortKey]);

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
        description: error.message.includes("409") ? "Der Hilfe-Schluessel ist bereits vergeben" : error.message,
        variant: "destructive",
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
        description: error.message.includes("409") ? "Der Hilfe-Schluessel ist bereits vergeben" : error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/help-texts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/help-texts"] });
      toast({ title: "Hilfetext geloescht" });
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

  const handleDelete = (helpText: HelpText) => {
    if (window.confirm(`Wollen Sie den Hilfetext ${helpText.title} wirklich loeschen?`)) {
      deleteMutation.mutate(helpText.id);
    }
  };

  const handleViewModeChange = (next: string) => {
    if (next !== "board" && next !== "table") return;
    if (next === viewMode) return;

    const nextMode = next as ViewMode;
    setViewMode(nextMode);

    void setSetting({
      key: settingsViewModeKey,
      scopeType: "USER",
      value: nextMode,
    }).catch((error: unknown) => {
      setViewMode(resolvedViewMode);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ansichtsmodus konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    });
  };

  const handleSortToggle = (key: HelpTextSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortHeader = (label: string, key: HelpTextSortKey) => {
    const isActive = sortKey === key;
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-wide"
        onClick={() => handleSortToggle(key)}
      >
        <span>{label}</span>
        <SortIcon direction={isActive ? sortDirection : null} />
      </button>
    );
  };

  const tableColumns = useMemo<TableViewColumnDef<HelpText>[]>(
    () => [
      {
        id: "helpKey",
        header: renderSortHeader("Key", "helpKey"),
        accessor: (row) => row.helpKey,
        minWidth: 220,
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-mono text-sm">{row.helpKey}</p>
            <p className="text-xs text-muted-foreground">{row.title}</p>
          </div>
        ),
      },
      {
        id: "hasContent",
        header: renderSortHeader("Inhalt vorhanden", "hasContent"),
        accessor: (row) => hasHelpTextContent(row),
        width: 180,
        align: "center",
        cell: ({ row }) => (
          <span className={hasHelpTextContent(row) ? "text-emerald-700" : "text-muted-foreground"}>
            {hasHelpTextContent(row) ? "Ja" : "Nein"}
          </span>
        ),
      },
    ],
    [sortDirection, sortKey],
  );

  const filterPanel = (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
      <Input
        placeholder="Suchen (Schluessel oder Titel)..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-8 h-8 w-64"
        data-testid="input-search-helptexts"
      />
    </div>
  );

  return (
    <>
      <ListLayout
        title="Hilfetexte"
        icon={<HelpCircle className="w-5 h-5" />}
        viewModeKey={viewModeKey}
        isLoading={isLoading}
        filterSlot={filterPanel}
        viewModeToggle={
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={handleViewModeChange}
            variant="outline"
            size="sm"
            data-testid="toggle-helptexts-view-mode"
          >
            <ToggleGroupItem value="board" aria-label="Board-Ansicht" data-testid="toggle-helptexts-board">
              <LayoutGrid className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Tabellen-Ansicht" data-testid="toggle-helptexts-table">
              <Table2 className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        }
        footerSlot={
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handleOpenCreate}
              disabled={createMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-new-helptext"
            >
              <Plus className="w-4 h-4" />
              Neuer Hilfetext
            </Button>
          </div>
        }
        contentSlot={
          viewMode === "board" ? (
            <BoardView
              gridTestId="list-helptexts"
              gridCols="2"
              isEmpty={helpTexts.length === 0}
              emptyState={
                <p className="text-sm text-slate-400 text-center py-8 col-span-2">
                  {searchQuery ? "Keine Hilfetexte gefunden" : "Keine Hilfetexte vorhanden"}
                </p>
              }
            >
              {helpTexts.map((helpText) => (
                <EntityCard
                  key={helpText.id}
                  testId={`helptext-card-${helpText.id}`}
                  title={helpText.title}
                  icon={<HelpCircle className="w-4 h-4" />}
                  className={!helpText.isActive ? "opacity-60" : ""}
                  onDelete={() => handleDelete(helpText)}
                  isDeleting={deleteMutation.isPending}
                  onDoubleClick={() => handleOpenEdit(helpText)}
                  footer={
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(helpText);
                      }}
                      data-testid={`button-edit-helptext-${helpText.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  }
                >
                  <div className="space-y-2">
                    <p className="font-medium text-sm" data-testid={`text-helptext-title-${helpText.id}`}>
                      {helpText.title}
                    </p>
                    {helpText.body && (
                      <div
                        className="text-sm text-slate-600 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: helpText.body }}
                        data-testid={`text-helptext-body-${helpText.id}`}
                      />
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      {!helpText.isActive && (
                        <Badge variant="secondary" className="text-xs">Inaktiv</Badge>
                      )}
                      <span className="text-xs text-slate-400" data-testid={`text-helptext-date-${helpText.id}`}>
                        Aktualisiert: {formatDate(helpText.updatedAt)}
                      </span>
                    </div>
                  </div>
                </EntityCard>
              ))}
            </BoardView>
          ) : (
            <TableView
              testId="table-helptexts"
              columns={tableColumns}
              rows={sortedHelpTexts}
              rowKey={(row) => row.id}
              onRowDoubleClick={(row) => handleOpenEdit(row)}
              rowPreviewRenderer={(row) => (
                <div className="rounded-md border border-border bg-card p-3 max-w-[420px] space-y-2">
                  <p className="font-semibold text-sm">{row.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">{row.helpKey}</p>
                  {row.body.trim().length > 0 ? (
                    <div className="text-sm text-slate-700 max-h-48 overflow-auto" dangerouslySetInnerHTML={{ __html: row.body }} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Kein Inhalt vorhanden.</p>
                  )}
                </div>
              )}
              emptyState={
                <p className="text-sm text-slate-400 py-4">
                  {searchQuery ? "Keine Hilfetexte gefunden" : "Keine Hilfetexte vorhanden"}
                </p>
              }
              stickyHeader
            />
          )
        }
      />

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
              <Label htmlFor="helptext-key">Hilfe-Schluessel *</Label>
              <Input
                id="helptext-key"
                value={formHelpKey}
                onChange={(e) => setFormHelpKey(e.target.value)}
                placeholder="z.B. kunde-stammdaten, termin-bearbeiten..."
                className="font-mono"
                data-testid="input-helptext-key"
              />
              <p className="text-xs text-slate-500">
                Eindeutiger Schluessel zur Identifizierung im UI (Beispiel: kunde-stammdaten)
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
                Aktiv <span className="text-xs">(nur durch Administrator aenderbar)</span>
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
