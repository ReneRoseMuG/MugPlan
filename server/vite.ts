import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  // Paralleler Browser-Testmodus: jeder Worker-Server nutzt einen eigenen Vite-cacheDir, damit die
  // gleichzeitig startenden Server nicht um denselben node_modules/.vite/deps konkurrieren
  // (Rename-Race -> EPERM -> der error-Logger unten ruft process.exit(1) -> Server-Crash).
  // Ohne die Env-Variable (Normalbetrieb, serieller Test) bleibt der Vite-Default erhalten.
  const workerViteCacheDir = process.env.MUGPLAN_VITE_CACHE_DIR;
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    ...(workerViteCacheDir ? { cacheDir: workerViteCacheDir } : {}),
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("/{*path}", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
