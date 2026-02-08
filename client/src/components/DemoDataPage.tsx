import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type SeedConfig = {
  employees: number;
  customers: number;
  projects: number;
  appointmentsPerProject: number;
  generateAttachments: boolean;
  randomSeed?: number;
  seedWindowDaysMin?: number;
  seedWindowDaysMax?: number;
  reklDelayDaysMin?: number;
  reklDelayDaysMax?: number;
  reklShare?: number;
  locale?: string;
};

type SeedSummary = {
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
  config: SeedConfig;
  summary: SeedSummary;
};

type SeedRunSummary = {
  seedRunId: string;
  createdAt: string;
  requested: SeedSummary["requested"];
  created: SeedSummary["created"];
  reductions: SeedSummary["reductions"];
  warnings: string[];
};

export function DemoDataPage() {
  const [employees, setEmployees] = useState(20);
  const [customers, setCustomers] = useState(10);
  const [projects, setProjects] = useState(30);
  const [appointmentsPerProject, setAppointmentsPerProject] = useState(1);
  const [generateAttachments, setGenerateAttachments] = useState(true);
  const [randomSeed, setRandomSeed] = useState("");
  const [seedWindowDaysMin, setSeedWindowDaysMin] = useState(60);
  const [seedWindowDaysMax, setSeedWindowDaysMax] = useState(90);
  const [reklDelayDaysMin, setReklDelayDaysMin] = useState(14);
  const [reklDelayDaysMax, setReklDelayDaysMax] = useState(42);
  const [reklShare, setReklShare] = useState(0.33);
  const [locale, setLocale] = useState("de");
  const [lastResult, setLastResult] = useState<SeedRunSummary | null>(null);

  const { data: runs = [], isLoading } = useQuery<SeedRunListItem[]>({
    queryKey: [api.demoSeed.listRuns.path],
  });

  const createMutation = useMutation({
    mutationFn: async (config: SeedConfig) => {
      const response = await apiRequest("POST", api.demoSeed.createRun.path, config);
      return (await response.json()) as SeedRunSummary;
    },
    onSuccess: (result) => {
      setLastResult(result);
      queryClient.invalidateQueries();
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
      queryClient.invalidateQueries();
    },
  });

  const latestRunId = useMemo(() => {
    if (runs.length === 0) return null;
    return runs[runs.length - 1].seedRunId;
  }, [runs]);

  const submitConfig = () => {
    const numericSeed = randomSeed.trim() === "" ? undefined : Number(randomSeed);
    createMutation.mutate({
      employees,
      customers,
      projects,
      appointmentsPerProject,
      generateAttachments,
      randomSeed: Number.isFinite(numericSeed) ? numericSeed : undefined,
      seedWindowDaysMin,
      seedWindowDaysMax,
      reklDelayDaysMin,
      reklDelayDaysMax,
      reklShare,
      locale,
    });
  };

  return (
    <div className="h-full rounded-lg border-2 border-foreground bg-white p-6 overflow-auto">
      <h3 className="text-xl font-black uppercase tracking-tight text-primary">Demo-Daten</h3>
      <p className="mt-1 text-sm text-slate-500">Seed-Runs erzeugen und rueckstandsfrei purgen.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="seed-employees">Mitarbeitende</Label>
          <Input id="seed-employees" type="number" value={employees} onChange={(event) => setEmployees(Number(event.target.value))} />
        </div>
        <div>
          <Label htmlFor="seed-customers">Kunden</Label>
          <Input id="seed-customers" type="number" value={customers} onChange={(event) => setCustomers(Number(event.target.value))} />
        </div>
        <div>
          <Label htmlFor="seed-projects">Projekte</Label>
          <Input id="seed-projects" type="number" value={projects} onChange={(event) => setProjects(Number(event.target.value))} />
        </div>
        <div>
          <Label htmlFor="seed-appointments">Legacy Termine je Projekt</Label>
          <Input id="seed-appointments" type="number" value={appointmentsPerProject} onChange={(event) => setAppointmentsPerProject(Number(event.target.value))} />
        </div>
        <div>
          <Label htmlFor="seed-random-seed">Random Seed (optional)</Label>
          <Input id="seed-random-seed" type="number" value={randomSeed} onChange={(event) => setRandomSeed(event.target.value)} />
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
          <Label htmlFor="seed-locale">Locale</Label>
          <Input id="seed-locale" value={locale} onChange={(event) => setLocale(event.target.value)} />
        </div>
        <div className="flex items-end gap-3 pb-2">
          <Switch id="seed-attachments" checked={generateAttachments} onCheckedChange={setGenerateAttachments} />
          <Label htmlFor="seed-attachments">Anhaenge erzeugen</Label>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <Button onClick={submitConfig} disabled={createMutation.isPending}>
          Demo-Daten erzeugen
        </Button>
        <Button
          variant="destructive"
          disabled={!latestRunId || purgeMutation.isPending}
          onClick={() => latestRunId && purgeMutation.mutate(latestRunId)}
        >
          Letzten Run loeschen
        </Button>
      </div>

      {lastResult && (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <div><strong>Seed-Run:</strong> {lastResult.seedRunId}</div>
          <div><strong>Erstellt:</strong> {lastResult.createdAt}</div>
          <div>
            <strong>Counts:</strong> E={lastResult.created.employees}, K={lastResult.created.customers}, P={lastResult.created.projects}, Termine={lastResult.created.appointments}, Mount={lastResult.created.mountAppointments}, Rekla={lastResult.created.reklAppointments}, Teams={lastResult.created.teams}, Touren={lastResult.created.tours}, Dateien={lastResult.created.attachments}
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
            {runs.map((run) => (
              <div key={run.seedRunId} className="rounded-md border border-slate-200 p-3">
                <div className="text-sm">
                  <strong>{run.seedRunId}</strong> | {run.createdAt}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  E={run.summary.created.employees}, K={run.summary.created.customers}, P={run.summary.created.projects}, Termine={run.summary.created.appointments}, Mount={run.summary.created.mountAppointments}, Rekla={run.summary.created.reklAppointments}, Dateien={run.summary.created.attachments}
                </div>
                <div className="mt-2">
                  <Button variant="destructive" size="sm" disabled={purgeMutation.isPending} onClick={() => purgeMutation.mutate(run.seedRunId)}>
                    Rueckstandsfrei loeschen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
