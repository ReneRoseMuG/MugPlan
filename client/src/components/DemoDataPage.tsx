import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type SeedRunType = "base" | "appointments" | "legacy";

type ProjectStatusSeedForm = {
  title: string;
  color: string;
  description?: string;
};

type BaseSeedConfig = {
  runType: "base";
  employees: number;
  customers: number;
  projects: number;
  generateAttachments: boolean;
  projectStatuses: Array<{
    title: string;
    color: string;
    description?: string | null;
  }>;
  randomSeed?: number;
  locale?: string;
};

type AppointmentSeedConfig = {
  runType: "appointments";
  baseSeedRunId: string;
  appointmentsPerProject: number;
  randomSeed?: number;
  seedWindowDaysMin?: number;
  seedWindowDaysMax?: number;
  reklDelayDaysMin?: number;
  reklDelayDaysMax?: number;
  reklShare?: number;
  locale?: string;
};

type SeedConfig = BaseSeedConfig | AppointmentSeedConfig;

type SeedSummary = {
  seedRunId: string;
  createdAt: string;
  runType: SeedRunType;
  baseSeedRunId?: string;
  requested: {
    employees: number;
    customers: number;
    projects: number;
    appointmentsPerProject: number;
    generateAttachments: boolean;
    seedWindowDaysMin: number;
    seedWindowDaysMax: number;
    reklDelayDaysMin: number;
    reklDelayDaysMax: number;
    reklShare: number;
    locale: string;
  };
  created: {
    employees: number;
    customers: number;
    projects: number;
    projectStatusRelations: number;
    appointments: number;
    mountAppointments: number;
    reklAppointments: number;
    teams: number;
    tours: number;
    attachments: number;
  };
  reductions: {
    appointments: number;
    reklMissingOven: number;
    reklSkippedConstraints: number;
  };
  warnings: string[];
};

type SeedRunListItem = {
  seedRunId: string;
  createdAt: string;
  runType?: SeedRunType;
  baseSeedRunId?: string;
  dependentRunIds?: string[];
  config: Record<string, unknown>;
  summary: SeedSummary;
};

type ResetDatabaseResponse = {
  ok: true;
  deleted: {
    noteTemplates: number;
    helpTexts: number;
    userSettingsValues: number;
    projects: number;
    customers: number;
    employees: number;
    projectStatuses: number;
    teams: number;
    tours: number;
    notes: number;
    seedRuns: number;
    seedRunEntities: number;
  };
  attachments: {
    filesDeleted: number;
    filesMissing: number;
  };
  durationMs: number;
};

function runTypeLabel(runType: SeedRunType | undefined) {
  if (runType === "base") return "Basisdaten";
  if (runType === "appointments") return "Termine";
  return "Legacy";
}

function formatCounts(summary: SeedSummary, runType: SeedRunType | undefined) {
  if (runType === "appointments") {
    return `Termine=${summary.created.appointments}, Mount=${summary.created.mountAppointments}, Rekla=${summary.created.reklAppointments} (Projekte stammen aus Basis-Run)`;
  }
  return `E=${summary.created.employees}, K=${summary.created.customers}, P=${summary.created.projects}, Termine=${summary.created.appointments}, Mount=${summary.created.mountAppointments}, Rekla=${summary.created.reklAppointments}, Teams=${summary.created.teams}, Touren=${summary.created.tours}, Dateien=${summary.created.attachments}`;
}

export function DemoDataPage() {
  const { toast } = useToast();

  const [baseEmployees, setBaseEmployees] = useState(20);
  const [baseCustomers, setBaseCustomers] = useState(10);
  const [baseProjects, setBaseProjects] = useState(30);
  const [baseGenerateAttachments, setBaseGenerateAttachments] = useState(true);
  const [baseRandomSeed, setBaseRandomSeed] = useState("");
  const [baseLocale, setBaseLocale] = useState("de");
  const [baseProjectStatuses, setBaseProjectStatuses] = useState<ProjectStatusSeedForm[]>([
    { title: "Neu", color: "#2563eb", description: "" },
    { title: "In Arbeit", color: "#d97706", description: "" },
    { title: "Erledigt", color: "#16a34a", description: "" },
  ]);

  const [appointmentBaseSeedRunId, setAppointmentBaseSeedRunId] = useState("");
  const [appointmentsPerProject, setAppointmentsPerProject] = useState(1);
  const [appointmentsRandomSeed, setAppointmentsRandomSeed] = useState("");
  const [seedWindowDaysMin, setSeedWindowDaysMin] = useState(60);
  const [seedWindowDaysMax, setSeedWindowDaysMax] = useState(90);
  const [reklDelayDaysMin, setReklDelayDaysMin] = useState(14);
  const [reklDelayDaysMax, setReklDelayDaysMax] = useState(42);
  const [reklShare, setReklShare] = useState(0.33);
  const [appointmentsLocale, setAppointmentsLocale] = useState("de");

  const [lastResult, setLastResult] = useState<SeedSummary | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmPhrase, setResetConfirmPhrase] = useState("");

  const { data: runs = [], isLoading } = useQuery<SeedRunListItem[]>({
    queryKey: [api.demoSeed.listRuns.path],
  });

  const baseRuns = useMemo(
    () => runs.filter((run) => (run.runType ?? run.summary.runType) === "base"),
    [runs],
  );

  const createMutation = useMutation({
    mutationFn: async (config: SeedConfig) => {
      const response = await apiRequest("POST", api.demoSeed.createRun.path, config);
      return (await response.json()) as SeedSummary;
    },
    onSuccess: (result) => {
      setLastResult(result);
      if (result.runType === "base") {
        setAppointmentBaseSeedRunId(result.seedRunId);
      }
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      toast({
        title: "Seeder fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const purgeMutation = useMutation({
    mutationFn: async (seedRunId: string) => {
      const response = await apiRequest(
        "DELETE",
        api.demoSeed.purgeRun.path.replace(":seedRunId", seedRunId),
      );
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      toast({
        title: "Loeschen fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetDatabaseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", api.admin.resetDatabase.path, {
        confirmed: true,
        confirmPhrase: resetConfirmPhrase,
      });
      return (await response.json()) as ResetDatabaseResponse;
    },
    onSuccess: (result) => {
      setLastResult(null);
      setResetDialogOpen(false);
      setResetConfirmPhrase("");
      void queryClient.invalidateQueries();
      toast({
        title: "Datenbank zurueckgesetzt",
        description: `Projekte: ${result.deleted.projects}, Kunden: ${result.deleted.customers}, Mitarbeitende: ${result.deleted.employees}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reset fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const latestRunId = useMemo(() => {
    if (runs.length === 0) return null;
    return runs[runs.length - 1].seedRunId;
  }, [runs]);

  const submitBaseConfig = () => {
    const numericSeed = baseRandomSeed.trim() === "" ? undefined : Number(baseRandomSeed);
    const normalizedStatuses = baseProjectStatuses
      .map((status) => ({
        title: status.title.trim(),
        color: status.color.trim(),
        description: status.description?.trim() || null,
      }))
      .filter((status) => status.title.length > 0 && status.color.length > 0);
    if (normalizedStatuses.length === 0) {
      toast({
        title: "Projekt-Status fehlt",
        description: "Bitte mindestens einen gueltigen Projekt-Status hinterlegen.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({
      runType: "base",
      employees: baseEmployees,
      customers: baseCustomers,
      projects: baseProjects,
      generateAttachments: baseGenerateAttachments,
      projectStatuses: normalizedStatuses,
      randomSeed: Number.isFinite(numericSeed) ? numericSeed : undefined,
      locale: baseLocale,
    });
  };

  const submitAppointmentsConfig = () => {
    if (!appointmentBaseSeedRunId) {
      toast({
        title: "Basis-Run fehlt",
        description: "Bitte zuerst einen Basisdaten-Run auswaehlen.",
        variant: "destructive",
      });
      return;
    }
    const numericSeed = appointmentsRandomSeed.trim() === "" ? undefined : Number(appointmentsRandomSeed);
    createMutation.mutate({
      runType: "appointments",
      baseSeedRunId: appointmentBaseSeedRunId,
      appointmentsPerProject,
      randomSeed: Number.isFinite(numericSeed) ? numericSeed : undefined,
      seedWindowDaysMin,
      seedWindowDaysMax,
      reklDelayDaysMin,
      reklDelayDaysMax,
      reklShare,
      locale: appointmentsLocale,
    });
  };

  const canConfirmReset = resetConfirmPhrase === "RESET" && !resetDatabaseMutation.isPending;

  return (
    <div className="h-full rounded-lg border-2 border-foreground bg-white p-6 overflow-auto">
      <h3 className="text-xl font-black uppercase tracking-tight text-primary">Demo-Daten</h3>
      <p className="mt-1 text-sm text-slate-500">Basisdaten und Termine getrennt seeden und gezielt purgen.</p>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-md border border-slate-200 p-4">
          <h4 className="font-bold text-slate-900">Basisdaten</h4>
          <p className="text-xs text-slate-500 mt-1">Mitarbeitende, Kunden, Projekte, Teams und Touren.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="seed-base-employees">Mitarbeitende</Label>
              <Input id="seed-base-employees" type="number" value={baseEmployees} onChange={(event) => setBaseEmployees(Number(event.target.value))} />
            </div>
            <div>
              <Label htmlFor="seed-base-customers">Kunden</Label>
              <Input id="seed-base-customers" type="number" value={baseCustomers} onChange={(event) => setBaseCustomers(Number(event.target.value))} />
            </div>
            <div>
              <Label htmlFor="seed-base-projects">Projekte</Label>
              <Input id="seed-base-projects" type="number" value={baseProjects} onChange={(event) => setBaseProjects(Number(event.target.value))} />
            </div>
            <div>
              <Label htmlFor="seed-base-random">Random Seed (optional)</Label>
              <Input id="seed-base-random" type="number" value={baseRandomSeed} onChange={(event) => setBaseRandomSeed(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="seed-base-locale">Locale</Label>
              <Input id="seed-base-locale" value={baseLocale} onChange={(event) => setBaseLocale(event.target.value)} />
            </div>
            <div className="flex items-end gap-3 pb-2">
              <Switch id="seed-base-attachments" checked={baseGenerateAttachments} onCheckedChange={setBaseGenerateAttachments} />
              <Label htmlFor="seed-base-attachments">Anhaenge erzeugen</Label>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Projekt-Status</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setBaseProjectStatuses((prev) => [
                      ...prev,
                      { title: "", color: "#64748b", description: "" },
                    ])
                  }
                >
                  + Status
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                {baseProjectStatuses.map((status, index) => (
                  <div key={`seed-status-${index}`} className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-5"
                      placeholder="Titel"
                      value={status.title}
                      onChange={(event) =>
                        setBaseProjectStatuses((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, title: event.target.value } : row,
                          ),
                        )
                      }
                    />
                    <Input
                      className="col-span-3"
                      type="color"
                      value={status.color}
                      onChange={(event) =>
                        setBaseProjectStatuses((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, color: event.target.value } : row,
                          ),
                        )
                      }
                    />
                    <Input
                      className="col-span-3"
                      placeholder="Beschreibung (optional)"
                      value={status.description ?? ""}
                      onChange={(event) =>
                        setBaseProjectStatuses((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, description: event.target.value } : row,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      className="col-span-1"
                      variant="destructive"
                      size="sm"
                      disabled={baseProjectStatuses.length <= 1}
                      onClick={() =>
                        setBaseProjectStatuses((prev) => prev.filter((_, rowIndex) => rowIndex !== index))
                      }
                    >
                      -
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={submitBaseConfig} disabled={createMutation.isPending}>Basisdaten erzeugen</Button>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-4">
          <h4 className="font-bold text-slate-900">Termine</h4>
          <p className="text-xs text-slate-500 mt-1">Erzeugt nur Termine fuer einen ausgewaehlten Basisdaten-Run.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="seed-appointments-base">Basis-Run-ID</Label>
              <Input
                id="seed-appointments-base"
                value={appointmentBaseSeedRunId}
                onChange={(event) => setAppointmentBaseSeedRunId(event.target.value)}
                placeholder={baseRuns[0]?.seedRunId ?? "Kein Basis-Run vorhanden"}
              />
            </div>
            <div>
              <Label htmlFor="seed-appointments-per-project">Termine je Projekt</Label>
              <Input id="seed-appointments-per-project" type="number" value={appointmentsPerProject} onChange={(event) => setAppointmentsPerProject(Number(event.target.value))} />
            </div>
            <div>
              <Label htmlFor="seed-appointments-random">Random Seed (optional)</Label>
              <Input id="seed-appointments-random" type="number" value={appointmentsRandomSeed} onChange={(event) => setAppointmentsRandomSeed(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="seed-window-min">Seed Fenster Min (Tage)</Label>
              <Input id="seed-window-min" type="number" value={seedWindowDaysMin} onChange={(event) => setSeedWindowDaysMin(Number(event.target.value))} />
            </div>
            <div>
              <Label htmlFor="seed-window-max">Seed Fenster Max (Tage)</Label>
              <Input id="seed-window-max" type="number" value={seedWindowDaysMax} onChange={(event) => setSeedWindowDaysMax(Number(event.target.value))} />
            </div>
            <div>
              <Label htmlFor="rekl-delay-min">Rekla Delay Min (Tage)</Label>
              <Input id="rekl-delay-min" type="number" value={reklDelayDaysMin} onChange={(event) => setReklDelayDaysMin(Number(event.target.value))} />
            </div>
            <div>
              <Label htmlFor="rekl-delay-max">Rekla Delay Max (Tage)</Label>
              <Input id="rekl-delay-max" type="number" value={reklDelayDaysMax} onChange={(event) => setReklDelayDaysMax(Number(event.target.value))} />
            </div>
            <div>
              <Label htmlFor="rekl-share">Rekla Anteil (0..1)</Label>
              <Input id="rekl-share" type="number" step="0.01" min="0" max="1" value={reklShare} onChange={(event) => setReklShare(Number(event.target.value))} />
            </div>
            <div>
              <Label htmlFor="seed-appointments-locale">Locale</Label>
              <Input id="seed-appointments-locale" value={appointmentsLocale} onChange={(event) => setAppointmentsLocale(event.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={submitAppointmentsConfig} disabled={createMutation.isPending || baseRuns.length === 0}>Termine erzeugen</Button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <Button
          variant="destructive"
          disabled={!latestRunId || purgeMutation.isPending}
          onClick={() => latestRunId && purgeMutation.mutate(latestRunId)}
        >
          Letzten Run loeschen
        </Button>
        <Button
          variant="destructive"
          disabled={resetDatabaseMutation.isPending}
          onClick={() => setResetDialogOpen(true)}
        >
          Reset Datenbank
        </Button>
      </div>

      {lastResult && (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <div><strong>Seed-Run:</strong> {lastResult.seedRunId}</div>
          <div><strong>Typ:</strong> {runTypeLabel(lastResult.runType)}</div>
          {lastResult.baseSeedRunId && <div><strong>Basis-Run:</strong> {lastResult.baseSeedRunId}</div>}
          <div><strong>Erstellt:</strong> {lastResult.createdAt}</div>
          <div>
            <strong>Counts:</strong> {formatCounts(lastResult, lastResult.runType)}
          </div>
          <div>
            <strong>Reduktionen:</strong> Termine={lastResult.reductions.appointments}, Rekla ohne Ofen={lastResult.reductions.reklMissingOven}, Rekla-Constraints={lastResult.reductions.reklSkippedConstraints}
          </div>
          {lastResult.warnings.length > 0 && (
            <div className="mt-2 text-amber-700">{lastResult.warnings.join(" | ")}</div>
          )}
        </div>
      )}

      <div className="mt-6">
        <h4 className="font-bold text-slate-900">Vorhandene Seed-Runs</h4>
        {isLoading ? (
          <p className="text-sm text-slate-500 mt-2">Lade...</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-slate-500 mt-2">Keine Runs vorhanden.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {runs.map((run) => {
              const effectiveRunType = run.runType ?? run.summary.runType;
              const dependentRunIds = run.dependentRunIds ?? [];
              const baseDeleteBlocked = effectiveRunType === "base" && dependentRunIds.length > 0;
              return (
                <div key={run.seedRunId} className="rounded-md border border-slate-200 p-3">
                  <div className="text-sm">
                    <strong>{run.seedRunId}</strong> | {run.createdAt}
                  </div>
                  <div className="text-xs text-slate-700 mt-1">
                    Typ: {runTypeLabel(effectiveRunType)}
                    {run.baseSeedRunId ? ` | Basis: ${run.baseSeedRunId}` : ""}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {formatCounts(run.summary, effectiveRunType)}
                  </div>
                  {baseDeleteBlocked && (
                    <div className="mt-1 text-xs text-amber-700">
                      Abhaengige Termine-Runs vorhanden: {dependentRunIds.join(", ")}
                    </div>
                  )}
                  <div className="mt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={purgeMutation.isPending || baseDeleteBlocked}
                      onClick={() => purgeMutation.mutate(run.seedRunId)}
                    >
                      Rueckstandsfrei loeschen
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog
        open={resetDialogOpen}
        onOpenChange={(open) => {
          setResetDialogOpen(open);
          if (!open) {
            setResetConfirmPhrase("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Datenbank bestaetigen</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Vorgang loescht alle Domain-Daten dauerhaft. Tippe <strong>RESET</strong>, um fortzufahren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-confirm-phrase">Bestaetigungsphrase</Label>
            <Input
              id="reset-confirm-phrase"
              value={resetConfirmPhrase}
              onChange={(event) => setResetConfirmPhrase(event.target.value)}
              placeholder="RESET"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetDatabaseMutation.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground border border-destructive-border hover:bg-destructive/90"
              disabled={!canConfirmReset}
              onClick={(event) => {
                event.preventDefault();
                if (!canConfirmReset) return;
                resetDatabaseMutation.mutate();
              }}
            >
              {resetDatabaseMutation.isPending ? "Reset laeuft..." : "Endgueltig resetten"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
