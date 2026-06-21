import { defineConfig, defineProject, mergeConfig } from "vitest/config";
import path from "path";
import baseConfig from "./vitest.config";

const alias = {
  "@": path.resolve(import.meta.dirname, "client", "src"),
  "@shared": path.resolve(import.meta.dirname, "shared"),
  "@assets": path.resolve(import.meta.dirname, "attached_assets"),
};

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      projects: [
        defineProject({
          resolve: { alias },
          test: {
            name: "unit",
            include: [
              "tests/unit/**/*.test.ts",
              "tests/unit/**/*.test.tsx",
            ],
            exclude: ["tests/integration/**", "tests/e2e/**", "tests/e2e-browser/**"],
            setupFiles: ["./tests/setup.unit.ts"],
            // AP11 (MS-64): Unit-Tests nutzen keine DB, kein echtes Dateisystem und keinen
            // Browser; sie sind prozessisoliert (forks-Pool) und koennen datei-parallel laufen.
            // fileParallelism ist in dieser Vitest-Version eine Root-Option und laesst sich NICHT
            // pro Projekt ueberschreiben (empirisch belegt: per-Projekt-Wert wird ignoriert).
            // Die Unit-Parallelitaet wird daher in der eigenstaendigen test:unit-Invocation per
            // CLI-Flag --fileParallelism auf Root-Ebene erzwungen (package.json). Integration/E2E
            // laufen als separate Invocations weiter seriell (Basis-Config fileParallelism=false).
            // Tests innerhalb einer Datei bleiben seriell (sequence.concurrent=false).
            // AP-fix: testTimeout auf 30 s erhoeht, weil der erste vi.importActual()-Lauf auf
            // einem Cold-Vite-Cache (nach Quellaenderungen) 5-11 s dauern kann. Das Standard-
            // Limit von 5000 ms fuehrt dann zu Timeouts und zu Leaked-Render-Korruption in
            // Folgetests. Nach dem ersten Lauf (Warm-Cache) sind alle Importe < 200 ms.
            testTimeout: 30000,
          },
        }),
        defineProject({
          resolve: { alias },
          test: {
            name: "integration",
            include: [
              "tests/integration/**/*.test.ts",
              "tests/integration/**/*.test.tsx",
            ],
            exclude: ["tests/unit/**", "tests/e2e/**", "tests/e2e-browser/**"],
            // AP10 (MS-64): setup.worker-db.ts MUSS vor setup.integration.ts laufen, damit die
            // Worker-DB-URL gesetzt ist, bevor runtimeEnv/server/db initialisieren. Im seriellen
            // Modus (ohne MUGPLAN_WORKER_DB=1) ist setup.worker-db.ts ein No-op.
            setupFiles: ["./tests/setup.worker-db.ts", "./tests/setup.integration.ts"],
          },
        }),
        defineProject({
          resolve: { alias },
          test: {
            name: "e2e",
            include: [
              "tests/e2e/**/*.test.ts",
            ],
            exclude: ["tests/unit/**", "tests/integration/**", "tests/e2e-browser/**"],
            setupFiles: ["./tests/setup.integration.ts"],
          },
        }),
      ],
    },
  }),
);
