import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityCard } from "@/components/ui/entity-card";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HelpTextsFilterPanel } from "@/components/ui/filter-panels/help-texts-filter-panel";
import { HelpTextsImportExportDialog } from "@/components/HelpTextsImportExportDialog";
import { useSetting, useSettings } from "@/hooks/useSettings";
import { HelpCircle, Plus, LayoutGrid, Table2, ArrowDown, ArrowUp, ArrowUpDown, Upload } from "lucide-react";
import type { HelpText } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface HelpTextsPageProps {
  onCreateHelpText: () => void;
  onEditHelpText: (id: number) => void;
}

type ViewMode = "board" | "table";
type HelpTextSortKey = "helpKey" | "hasContent";
type SortDirection = "asc" | "desc";
type HelpTextPreviewSize = "small" | "medium" | "large";

function parseViewMode(value: unknown): ViewMode {
  return value === "table" ? "table" : "board";
}

function parseHelpTextPreviewSize(value: unknown): HelpTextPreviewSize {
  if (value === "small" || value === "medium" || value === "large") {
    return value;
  }
  return "large";
}

function hasHelpTextContent(helpText: HelpText): boolean {
  return helpText.body.trim().length > 0;
}

function resolvePreviewClass(size: HelpTextPreviewSize) {
  if (size === "small") {
    return {
      shell: "rounded-md border border-border bg-card p-3 max-w-[360px] space-y-2",
      content: "text-sm text-slate-700 max-h-40 overflow-auto",
    };
  }
  if (size === "large") {
    return {
      shell: "rounded-md border border-border bg-card p-3 max-w-[720px] space-y-2",
      content: "text-sm text-slate-700 max-h-96 overflow-auto",
    };
  }
  return {
    shell: "rounded-md border border-border bg-card p-3 max-w-[480px] space-y-2",
    content: "text-sm text-slate-700 max-h-60 overflow-auto",
  };
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc") return <ArrowUp className="w-3.5 h-3.5" />;
  if (direction === "desc") return <ArrowDown className="w-3.5 h-3.5" />;
  return <ArrowUpDown className="w-3.5 h-3.5" />;
}

export function shouldBlockHelpTextsLayout(params: {
  isLoading: boolean;
  searchQuery: string;
  helpTextsCount: number;
}): boolean {
  return params.isLoading && params.searchQuery.trim().length === 0 && params.helpTextsCount === 0;
}

export function HelpTextsPage({ onCreateHelpText, onEditHelpText }: HelpTextsPageProps) {
  const { toast } = useToast();
  const { settingsByKey, setSetting } = useSettings();
  const viewModeKey = "helptexts";
  const settingsViewModeKey = `${viewModeKey}.viewMode`;
  const resolvedViewMode = parseViewMode(settingsByKey.get(settingsViewModeKey)?.resolvedValue);
  const helpTextPreviewSize = parseHelpTextPreviewSize(useSetting("helpTextPreviewSize"));
  const previewClass = resolvePreviewClass(helpTextPreviewSize);

  const [viewMode, setViewMode] = useState<ViewMode>(resolvedViewMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<HelpTextSortKey>("helpKey");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [importExportDialogOpen, setImportExportDialogOpen] = useState(false);

  const extractApiCode = (error: unknown): string | null => {
    if (!(error instanceof Error)) return null;
    const match = error.message.match(/"code"\s*:\s*"([A-Z_]+)"/);
    return match?.[1] ?? null;
  };

  useEffect(() => {
    setViewMode(resolvedViewMode);
  }, [resolvedViewMode]);

  useEffect(() => {
    let isMounted = true;
    const seedMissingHelpTexts = async () => {
      try {
        await apiRequest("POST", "/api/help-texts/seed-missing-from-frontend");
        if (!isMounted) return;
        await queryClient.invalidateQueries({ queryKey: ["/api/help-texts"] });
      } catch (error) {
        if (!isMounted) return;
        toast({
          title: "Fehler",
          description: error instanceof Error ? error.message : "Hilfetext-Seed konnte nicht ausgefuehrt werden.",
          variant: "destructive",
        });
      }
    };
    void seedMissingHelpTexts();
    return () => {
      isMounted = false;
    };
  }, [toast]);

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

  const deleteMutation = useMutation({
    mutationFn: async ({ id, version }: { id: number; version: number }) => {
      return apiRequest("DELETE", `/api/help-texts/${id}`, { version });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/help-texts"] });
      toast({ title: "Hilfetext geloescht" });
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({
          title: "Loeschen nicht moeglich",
          description: "Datensatz wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
      }
    },
  });

  const handleDelete = (helpText: HelpText) => {
    if (window.confirm(`Wollen Sie den Hilfetext ${helpText.title} wirklich loeschen?`)) {
      deleteMutation.mutate({ id: helpText.id, version: helpText.version });
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
        className="inline-flex items-center gap-1 text-xs tracking-wide"
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
            <p className="text-sm">{row.helpKey}</p>
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
  const emptyState = searchQuery.trim().length > 0 ? (
    <ListEmptyState
      helpKey="helptexts.emptyFiltered"
      fallbackTitle="Keine Treffer gefunden."
      fallbackBody="Fuer die gewaehlte Filtereinstellung konnten keine Treffer ermittelt werden."
    />
  ) : (
    <ListEmptyState
      helpKey="helptexts.empty"
      fallbackTitle="Keine Hilfetexte vorhanden."
      fallbackBody="Es sind aktuell keine Hilfetexte in dieser Liste vorhanden."
    />
  );
  const tableFooter = (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setImportExportDialogOpen(true)}
          className="flex items-center gap-2"
          data-testid="button-helptexts-import-export"
        >
          <Upload className="w-4 h-4" />
          Import/Export
        </Button>
        <Button
          variant="outline"
          onClick={onCreateHelpText}
          className="flex items-center gap-2"
          data-testid="button-new-helptext"
        >
          <Plus className="w-4 h-4" />
          Neuer Hilfetext
        </Button>
      </div>
    </div>
  );
  const layoutFooter = viewMode === "board" ? tableFooter : undefined;
  const blockLayoutWhileLoading = shouldBlockHelpTextsLayout({
    isLoading,
    searchQuery,
    helpTextsCount: helpTexts.length,
  });

  return (
    <>
      <ListLayout
        title="Hilfetexte"
        icon={<HelpCircle className="w-5 h-5" />}
        viewModeKey={viewModeKey}
        isLoading={blockLayoutWhileLoading}
        filterSlot={(
          <HelpTextsFilterPanel
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        )}
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
        footerSlot={layoutFooter}
        contentSlot={
          viewMode === "board" ? (
            <BoardView
              gridTestId="list-helptexts"
              dynamicMinCols={3}
              isEmpty={helpTexts.length === 0}
              emptyState={emptyState}
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
                  onDoubleClick={() => onEditHelpText(helpText.id)}
                >
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground" data-testid={`text-helptext-key-${helpText.id}`}>
                      Key: {helpText.helpKey}
                    </p>
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
                    {!helpText.isActive ? (
                      <div className="pt-1">
                        <Badge variant="secondary" className="text-xs">Inaktiv</Badge>
                      </div>
                    ) : null}
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
              onRowDoubleClick={(row) => onEditHelpText(row.id)}
              rowPreviewRenderer={(row) => (
                <div className={previewClass.shell}>
                  <p className="font-semibold text-sm">{row.title}</p>
                  <p className="text-xs text-muted-foreground">{row.helpKey}</p>
                  {row.body.trim().length > 0 ? (
                    <div className={previewClass.content} dangerouslySetInnerHTML={{ __html: row.body }} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Kein Inhalt vorhanden.</p>
                  )}
                </div>
              )}
              emptyState={emptyState}
              footerSlot={tableFooter}
              stickyHeader
            />
          )
        }
      />

      <HelpTextsImportExportDialog
        open={importExportDialogOpen}
        onOpenChange={setImportExportDialogOpen}
        totalHelpTextsCount={helpTexts.length}
        onImportApplied={() => {
          void queryClient.invalidateQueries({ queryKey: ["/api/help-texts"] });
        }}
      />
    </>
  );
}
