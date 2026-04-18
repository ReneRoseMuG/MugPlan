/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "Verhindert Zyklen zwischen Modulen und Layern.",
      severity: "warn",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "shared-must-stay-shared",
      comment: "shared darf nicht von app-spezifischen Client-, Server- oder Testmodulen abhängen.",
      severity: "error",
      from: {
        path: "^shared/",
      },
      to: {
        path: "^(client/src|server|tests)/",
      },
    },
    {
      name: "ui-must-not-reach-server-or-infra",
      comment: "Präsentationscode darf nicht direkt in Server-, Migrations- oder Skriptbereiche greifen.",
      severity: "error",
      from: {
        path: "^client/src/(components/ui|pages|components/[^/]+[.]tsx?$)",
      },
      to: {
        path: "^(server|migrations|script|scripts)/",
      },
    },
    {
      name: "routes-to-controllers-only",
      comment: "Server-Routen bleiben an Controller, Contracts und Infrastruktur gebunden.",
      severity: "warn",
      from: {
        path: "^server/routes/",
      },
      to: {
        path: "^server/(services|repositories)/",
      },
    },
    {
      name: "controllers-to-services-only",
      comment: "Controller dürfen Repository-Zugriffe nicht direkt überspringen.",
      severity: "error",
      from: {
        path: "^server/controllers/",
      },
      to: {
        path: "^server/repositories/",
      },
    },
    {
      name: "repositories-are-terminal",
      comment: "Repositories dürfen nicht zurück in Controller, Services oder Routen greifen.",
      severity: "warn",
      from: {
        path: "^server/repositories/",
      },
      to: {
        path: "^server/(routes|controllers|services)/",
      },
    },
    {
      name: "calendar-feature-private",
      comment: "calendar darf keine privaten Interna anderer Feature-Unterordner importieren.",
      severity: "warn",
      from: { path: "^client/src/components/calendar/" },
      to: { path: "^client/src/components/(document-extraction|filters|notes|print|reports|tags)/" },
    },
    {
      name: "document-extraction-feature-private",
      comment: "document-extraction darf keine privaten Interna anderer Feature-Unterordner importieren.",
      severity: "warn",
      from: { path: "^client/src/components/document-extraction/" },
      to: { path: "^client/src/components/(calendar|filters|notes|print|reports|tags)/" },
    },
    {
      name: "filters-feature-private",
      comment: "filters darf keine privaten Interna anderer Feature-Unterordner importieren.",
      severity: "warn",
      from: { path: "^client/src/components/filters/" },
      to: { path: "^client/src/components/(calendar|document-extraction|notes|print|reports|tags)/" },
    },
    {
      name: "notes-feature-private",
      comment: "notes darf keine privaten Interna anderer Feature-Unterordner importieren.",
      severity: "warn",
      from: { path: "^client/src/components/notes/" },
      to: { path: "^client/src/components/(calendar|document-extraction|filters|print|reports|tags)/" },
    },
    {
      name: "print-feature-private",
      comment: "print darf keine privaten Interna anderer Feature-Unterordner importieren.",
      severity: "warn",
      from: { path: "^client/src/components/print/" },
      to: { path: "^client/src/components/(calendar|document-extraction|filters|notes|reports|tags)/" },
    },
    {
      name: "reports-feature-private",
      comment: "reports darf keine privaten Interna anderer Feature-Unterordner importieren.",
      severity: "warn",
      from: { path: "^client/src/components/reports/" },
      to: { path: "^client/src/components/(calendar|document-extraction|filters|notes|print|tags)/" },
    },
    {
      name: "tags-feature-private",
      comment: "tags darf keine privaten Interna anderer Feature-Unterordner importieren.",
      severity: "warn",
      from: { path: "^client/src/components/tags/" },
      to: { path: "^client/src/components/(calendar|document-extraction|filters|notes|print|reports)/" },
    },
    {
      name: "prod-code-not-to-tests",
      comment: "Produktionscode darf nicht direkt von Tests oder Testhelfern abhängen.",
      severity: "error",
      from: {
        pathNot: "^(tests|scripts/run-semgrep[.]mjs$|scripts/prepare-analysis-output[.]mjs$)",
      },
      to: {
        path: "^tests/",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: ["node_modules"],
    },
    includeOnly: ["^(client/src|server|shared|tests)"],
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".mjs", ".d.ts", ".js"],
      mainFields: ["module", "main", "types", "typings"],
    },
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/(?:@[^/]+/[^/]+|[^/]+)",
      },
      archi: {
        collapsePattern: "^(?:client/src|server|shared|tests)/[^/]+|node_modules/(?:@[^/]+/[^/]+|[^/]+)",
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};
