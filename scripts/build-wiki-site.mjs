#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const wikiRoot = path.join(repoRoot, "docs", "wiki");
const siteRoot = path.join(wikiRoot, "site");
const indexPath = path.join(wikiRoot, "data", "wiki-index.json");

const posix = path.posix;
const todayIso = "2026-05-09";

function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function normalizeRel(file) {
  return path.relative(wikiRoot, file).replaceAll(path.sep, "/");
}

function sourceAbs(rel) {
  return path.join(wikiRoot, ...rel.split("/"));
}

function outputAbs(rel) {
  return path.join(siteRoot, ...rel.split("/"));
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (entry.isFile()) return [full];
    return [];
  });
}

function ensureSafeOutputRoot() {
  const resolvedSite = path.resolve(siteRoot);
  const expected = path.resolve(wikiRoot, "site");
  if (resolvedSite !== expected) {
    throw new Error(`Unsicherer Ausgabeordner: ${resolvedSite}`);
  }
}

function cleanOutputRoot() {
  ensureSafeOutputRoot();
  if (fs.existsSync(siteRoot)) {
    fs.rmSync(siteRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(siteRoot, { recursive: true });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stripFirstHeading(markdown) {
  return markdown.replace(/^# .*(?:\r?\n)+/, "");
}

function firstHeading(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function sectionContent(markdown, headingNames) {
  const names = Array.isArray(headingNames) ? headingNames : [headingNames];
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^##\s+(.+?)\s*$/);
    if (!match) continue;
    const normalized = match[1].trim().toLowerCase();
    if (!names.some((name) => normalized === name.toLowerCase())) continue;
    const body = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^##\s+/.test(lines[j])) break;
      body.push(lines[j]);
    }
    return body.join("\n").trim();
  }
  return "";
}

function metaValue(markdown, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`^-\\s*${escaped}:\\s*(.+)$`, "im"));
  return match ? match[1].trim() : "";
}

function cleanMetaValue(value) {
  return String(value ?? "").replace(/^`|`$/g, "").trim();
}

function tableCells(line) {
  return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function firstMetadataTable(markdown) {
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length - 2; i += 1) {
    if (!lines[i].trim().startsWith("|")) continue;
    const headers = tableCells(lines[i]);
    if (!headers.includes("Status") || !headers.includes("Typ")) continue;
    const row = tableCells(lines[i + 2] ?? "");
    return Object.fromEntries(headers.map((header, index) => [header, cleanMetaValue(row[index] ?? "")]));
  }
  return {};
}

function taskMetaValue(markdown, key) {
  const table = firstMetadataTable(markdown);
  return cleanMetaValue(table[key] || metaValue(markdown, key));
}

function removeMarkdownLinks(text) {
  return String(text ?? "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function excerptFrom(markdown, preferredSections) {
  for (const section of preferredSections) {
    const content = sectionContent(markdown, section);
    const paragraph = firstParagraph(content);
    if (paragraph) return paragraph;
  }
  return firstParagraph(stripFirstHeading(markdown));
}

function firstParagraph(markdown) {
  const blocks = markdown
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const paragraph = blocks.find((block) => !block.startsWith("#") && !block.startsWith("|") && !block.startsWith("- "));
  return removeMarkdownLinks(paragraph ?? "").replace(/\s+/g, " ").slice(0, 280);
}

function parseFeatureIdFromText(text) {
  const match = text.match(/FT(?:\s*\(?|-)(\d{1,2})\)?/i);
  return match ? `FT-${match[1].padStart(2, "0")}` : "";
}

function parseUseCaseIdFromText(text) {
  const match = text.match(/UC[-\s]?(\d{1,2})[/-](\d{1,2})/i);
  return match ? `UC-${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}` : "";
}

function parseNfrIdFromText(text) {
  const match = text.match(/NFR[-\s]?\(?(\d{1,2})\)?/i);
  return match ? `NFR-${match[1].padStart(2, "0")}` : "";
}

function slugBase(rel) {
  return posix.basename(rel, ".md");
}

function formatDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}.${match[2]}.${match[1].slice(2)}`;
  match = raw.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (match) return `${match[1]}.${match[2]}.${match[3]}`;
  match = raw.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (match) return raw;
  return raw;
}

function standValue(markdown) {
  const match = markdown.match(/^\*Stand:\s*([^*]+)\*$/im);
  return match ? match[1].trim() : "";
}

function stripStandFooter(markdown) {
  return markdown.replace(/\n---+\s*\n\s*\*Stand:\s*[^*]+\*\s*$/im, "").trim();
}

function dateKeyFromJournalRel(rel) {
  const match = posix.basename(rel).match(/^(\d{2})-(\d{2})-(\d{2})-/);
  if (!match) return "0000-00-00";
  return `20${match[3]}-${match[2]}-${match[1]}`;
}

function relLink(fromOutputRel, toOutputRel) {
  const rel = posix.relative(posix.dirname(fromOutputRel), toOutputRel);
  return rel || posix.basename(toOutputRel);
}

const sourceToOutput = new Map();
let taskOverviewCache;

function taskOverviewEntries() {
  if (taskOverviewCache) return taskOverviewCache;
  taskOverviewCache = new Map();
  const readme = sourceAbs("tasks/README.md");
  if (!fs.existsSync(readme)) return taskOverviewCache;
  const markdown = readText(readme);
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\|\s*(A-\d+)\s*\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]+)\|\s*([^|]+)\|/);
    if (!match) continue;
    const [, id, title, href, typ, status] = match;
    const taskRel = posix.normalize(posix.join("tasks", href.trim()));
    taskOverviewCache.set(taskRel, {
      id,
      title: title.trim(),
      typ: typ.trim(),
      status: cleanMetaValue(status.trim()),
    });
  }
  return taskOverviewCache;
}

function resolveMarkdownHref(href, currentSourceRel, currentOutputRel) {
  const trimmed = href.trim();
  if (/^(https?:|mailto:|#)/i.test(trimmed)) return trimmed;
  const [rawPath, anchor = ""] = trimmed.split("#");
  if (!rawPath) return `#${anchor}`;
  const targetRel = posix.normalize(posix.join(posix.dirname(currentSourceRel), rawPath));
  const mapped = sourceToOutput.get(targetRel);
  if (mapped) {
    return `${relLink(currentOutputRel, mapped)}${anchor ? `#${anchor}` : ""}`;
  }
  if (rawPath.endsWith(".md")) {
    const wikiTarget = sourceAbs(targetRel);
    if (fs.existsSync(wikiTarget)) {
      const fromWikiRel = posix.join("site", currentOutputRel);
      const sourceHref = posix.relative(posix.dirname(fromWikiRel), targetRel);
      return `${sourceHref}${anchor ? `#${anchor}` : ""}`;
    }
    return `${rawPath}${anchor ? `#${anchor}` : ""}`;
  }
  return trimmed;
}

function renderInline(text, currentSourceRel, currentOutputRel) {
  const code = [];
  let value = String(text ?? "").replace(/`([^`]+)`/g, (_, inner) => {
    const token = `@@CODE${code.length}@@`;
    code.push(`<code>${escapeHtml(inner)}</code>`);
    return token;
  });
  value = escapeHtml(value);
  value = value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const resolved = resolveMarkdownHref(href, currentSourceRel, currentOutputRel);
    return `<a href="${escapeHtml(resolved)}">${label}</a>`;
  });
  value = value
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  code.forEach((html, index) => {
    value = value.replaceAll(`@@CODE${index}@@`, html);
  });
  return value;
}

function markdownToHtml(markdown, currentSourceRel, currentOutputRel) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const fence = line.match(/^```(.*)$/);
    if (fence) {
      const body = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      html.push(`<pre><code>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const cls = level === 2 ? "wiki-h2" : "wiki-h3";
      html.push(`<h${level} class="${cls}">${renderInline(heading[2], currentSourceRel, currentOutputRel)}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      html.push("<hr>");
      i += 1;
      continue;
    }

    if (line.trim().startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i += 1;
      }
      html.push(renderTable(tableLines, currentSourceRel, currentOutputRel));
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ""));
        i += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${renderInline(item, currentSourceRel, currentOutputRel)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${renderInline(item, currentSourceRel, currentOutputRel)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph = [line.trim()];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{2,4})\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith("|")
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    html.push(`<p>${renderInline(paragraph.join(" "), currentSourceRel, currentOutputRel)}</p>`);
  }

  return html.join("\n");
}

function renderTable(lines, currentSourceRel, currentOutputRel) {
  if (lines.length < 2) return "";
  const rows = lines
    .filter((line) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line))
    .map((line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()));
  if (!rows.length) return "";
  const [head, ...body] = rows;
  return [
    '<table class="wiki-table">',
    "<thead><tr>",
    head.map((cell) => `<th>${renderInline(cell, currentSourceRel, currentOutputRel)}</th>`).join(""),
    "</tr></thead>",
    "<tbody>",
    body
      .map((row) => `<tr>${row.map((cell, index) => `<td${index === 0 ? ' class="wiki-table__id"' : ""}>${renderInline(cell, currentSourceRel, currentOutputRel)}</td>`).join("")}</tr>`)
      .join(""),
    "</tbody></table>",
  ].join("");
}

function badge(label, variant = "neutral") {
  const key = String(label ?? "").toLowerCase();
  let status = variant;
  if (key.includes("bearbeitung")) status = "bearbeitung";
  else if (key.includes("blockiert")) status = "blockiert";
  else if (key.includes("offen") || key.includes("geplant")) status = "offen";
  else if (key.includes("abgeschlossen") || key.includes("implementiert")) status = "abgeschlossen";
  return `<span class="wiki-badge wiki-badge--${status}">${escapeHtml(label)}</span>`;
}

function metaLine(items) {
  const parts = items.filter((item) => item.value).map((item) => {
    const value = item.badge ? badge(item.value, item.badge) : escapeHtml(item.value);
    return `<span class="wiki-meta__label">${escapeHtml(item.label)}</span>${value}`;
  });
  return parts.length ? `<div class="wiki-meta">${parts.join('<span class="wiki-meta__sep">·</span>')}</div>` : "";
}

function relationsBlock(rows) {
  const realRows = rows.filter((row) => row.html || row.values?.length);
  if (!realRows.length) return "";
  return `<section class="wiki-relations" aria-label="Beziehungen">
    <h2 class="wiki-relations__title">Beziehungen</h2>
    <div class="wiki-relations__grid">
      ${realRows
        .map(
          (row) => `<div class="wiki-relations__key">${escapeHtml(row.label)}</div><div class="wiki-relations__val">${row.html ?? row.values.join("")}</div>`,
        )
        .join("")}
    </div>
  </section>`;
}

function entityLink(entity, fromOutputRel, label = entity.id || entity.title) {
  return `<a href="${escapeHtml(relLink(fromOutputRel, entity.outputRel))}">${escapeHtml(label)}</a>`;
}

function taskChecklist(tasks, fromOutputRel) {
  if (!tasks.length) return "";
  return `<ul class="wiki-checklist">
    ${tasks
      .map((task) => {
        const label = `${task.id ? `${task.id} ` : ""}${task.title}`.trim();
        const checked = String(task.status ?? "").toLowerCase().includes("abgeschlossen") ? " checked" : "";
        return `<li class="wiki-checklist__item">
          <input type="checkbox" disabled${checked} aria-label="${escapeHtml(label)}">
          <span class="wiki-checklist__text">
            ${entityLink(task, fromOutputRel, label)}
            ${task.status ? badge(task.status) : ""}
          </span>
        </li>`;
      })
      .join("")}
  </ul>`;
}

function layout({ outputRel, title, screenLabel, current, breadcrumbs, body }) {
  const cssHref = relLink(outputRel, "wiki.css");
  const indexHref = relLink(outputRel, "index.html");
  const nav = [
    {
      title: "Projekte",
      links: [
        ["Projekte", "projekt/projekte.html", "projekte"],
        ["Aufgaben", "projekt/aufgaben.html", "aufgaben"],
      ],
    },
    {
      title: "Lastenheft",
      links: [
        ["Features", "lastenheft/features.html", "features"],
        ["Use Cases", "lastenheft/use-cases.html", "use-cases"],
        ["Backlogs", "lastenheft/backlogs.html", "backlogs"],
        ["NFRs", "lastenheft/nfrs.html", "nfrs"],
      ],
    },
    {
      title: "Verwaltung",
      links: [
        ["Journal", "verwaltung/journal.html", "journal"],
        ["Metadaten", "verwaltung/metadaten.html", "metadaten"],
        ["Kontrollbericht", "control-report.html", "control"],
      ],
    },
    {
      title: "Benutzerdoku",
      links: [
        ["Übersicht", "benutzerdokumentation.html", "user-docs"],
      ],
    },
  ];
  const sidebar = nav
    .map(
      (group) => `<div class="wiki-sidebar__group">
        <p class="wiki-sidebar__group-title">${escapeHtml(group.title)}</p>
        <ul class="wiki-sidebar__nav">
          ${group.links
            .map(([label, href, key]) => `<li><a href="${escapeHtml(relLink(outputRel, href))}"${current === key ? ' class="is-active"' : ""}>${escapeHtml(label)}</a></li>`)
            .join("")}
        </ul>
      </div>`,
    )
    .join("");
  const crumbHtml = breadcrumbs?.length
    ? `<nav class="wiki-breadcrumb" aria-label="Brotkrumen">${breadcrumbs
        .map((crumb, index) => {
          if (index === breadcrumbs.length - 1 || !crumb.href) {
            return `<span class="wiki-breadcrumb__current">${escapeHtml(crumb.label)}</span>`;
          }
          return `<a href="${escapeHtml(relLink(outputRel, crumb.href))}">${escapeHtml(crumb.label)}</a><span class="wiki-breadcrumb__sep">›</span>`;
        })
        .join("")}</nav>`
    : "";
  const cleanBody = String(body ?? "").trimEnd();
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} · MugPlan Wiki</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${escapeHtml(cssHref)}">
</head>
<body>
  <button class="wiki-sidebar-toggle" type="button" aria-label="Navigation umschalten" data-sidebar-toggle>Menü</button>
  <div class="wiki-app">
    <aside class="wiki-sidebar" data-screen-label="Sidebar">
      <a href="${escapeHtml(indexHref)}" class="wiki-sidebar__brand">
        <span class="wiki-sidebar__mark" aria-hidden="true"></span>
        MugPlan Wiki
      </a>
      ${sidebar}
    </aside>
    <main class="wiki-content" data-screen-label="${escapeHtml(screenLabel ?? title)}">
      <div class="wiki-content__inner">
        ${crumbHtml}
        ${cleanBody}
      </div>
    </main>
  </div>
  <script>
    (function () {
      var btn = document.querySelector('[data-sidebar-toggle]');
      var app = document.querySelector('.wiki-app');
      if (!btn || !app) return;
      btn.addEventListener('click', function () { app.classList.toggle('is-sidebar-open'); });
    })();
  </script>
</body>
</html>`;
}

function loadIndex() {
  return JSON.parse(readText(indexPath));
}

function statusLabel(index, statusId) {
  if (!statusId) return "";
  return index.aufgaben_status?.find((item) => item.id === statusId)?.label
    ?? index.status?.find((item) => item.id === statusId)?.label
    ?? "";
}

function prioLabel(index, prioId) {
  if (!prioId) return "";
  return index.dringlichkeiten?.find((item) => item.id === prioId)?.label ?? "";
}

function collectSources() {
  const files = walk(wikiRoot).map(normalizeRel).filter((rel) => rel.endsWith(".md"));
  const projects = files
    .filter((rel) => rel.startsWith("projects/") && posix.basename(rel) !== "README.md")
    .map(makeProject)
    .sort((a, b) => a.id.localeCompare(b.id));
  const tasks = files
    .filter((rel) => rel.startsWith("tasks/") && posix.dirname(rel) === "tasks" && !["README.md", "template.md"].includes(posix.basename(rel)))
    .map(makeTask)
    .sort((a, b) => a.id.localeCompare(b.id));
  const features = files
    .filter((rel) => rel.startsWith("features/") && !rel.includes("/use-cases/") && !rel.includes("/backlog/") && posix.dirname(rel).split("/").length === 2)
    .map(makeFeature)
    .sort((a, b) => a.id.localeCompare(b.id));
  const useCases = files
    .filter((rel) => rel.startsWith("features/") && rel.includes("/use-cases/") && /^uc-\d{2}-\d{2}-/.test(posix.basename(rel)))
    .map(makeUseCase)
    .sort((a, b) => a.id.localeCompare(b.id));
  const backlogs = files
    .filter((rel) => rel.startsWith("features/") && rel.includes("/backlog/") && posix.basename(rel) !== "README.md")
    .map(makeBacklog)
    .sort((a, b) => a.id.localeCompare(b.id));
  const nfrs = files
    .filter((rel) => rel.startsWith("nfrs/") && posix.basename(rel) !== "README.md")
    .map(makeNfr)
    .sort((a, b) => a.id.localeCompare(b.id));
  const userDocs = files
    .filter((rel) => rel.startsWith("user-docs/") && posix.basename(rel) !== "README.md")
    .map(makeUserDoc)
    .sort((a, b) => `${a.category}/${a.title}`.localeCompare(`${b.category}/${b.title}`));
  const journal = files
    .filter((rel) => rel.startsWith("journal/") && posix.dirname(rel) === "journal" && posix.basename(rel) !== "README.md")
    .map(makeJournal)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  return { projects, tasks, features, useCases, backlogs, nfrs, userDocs, journal };
}

function makeProject(rel) {
  const index = loadIndex();
  const markdown = readText(sourceAbs(rel));
  const heading = firstHeading(markdown);
  const id = cleanMetaValue(metaValue(markdown, "ID")) || slugBase(rel);
  const indexed = index.projekte?.find((item) => item.id === id || item.datei === rel);
  const outputRel = `projekt/projekte/${slugBase(rel)}.html`;
  sourceToOutput.set(rel, outputRel);
  return {
    kind: "project",
    id,
    title: heading,
    rel,
    outputRel,
    markdown,
    status: statusLabel(index, indexed?.status_id) || cleanMetaValue(metaValue(markdown, "Status")),
    dringlichkeit: prioLabel(index, indexed?.dringlichkeit_id) || cleanMetaValue(metaValue(markdown, "Dringlichkeit")),
    masterTask: indexed?.master_task ?? "",
    taskRefs: indexed?.aufgaben ?? [],
    decisionRefs: indexed?.entscheidungen ?? [],
    beschreibung: excerptFrom(markdown, ["Ziel", "Abgrenzung"]),
  };
}

function makeTask(rel) {
  const markdown = readText(sourceAbs(rel));
  const heading = firstHeading(markdown);
  const overview = taskOverviewEntries().get(rel);
  const outputRel = `projekt/aufgaben/${slugBase(rel)}.html`;
  sourceToOutput.set(rel, outputRel);
  return {
    kind: "task",
    id: overview?.id ?? "",
    title: heading,
    rel,
    outputRel,
    markdown,
    status: taskMetaValue(markdown, "Status") || overview?.status || "",
    dringlichkeit: taskMetaValue(markdown, "Dringlichkeit"),
    thema: taskMetaValue(markdown, "Thema"),
    typ: taskMetaValue(markdown, "Typ") || overview?.typ || "",
    erstellt: taskMetaValue(markdown, "Erstellt"),
    beschreibung: excerptFrom(markdown, ["Ziel", "Ausgangslage"]),
  };
}

function makeFeature(rel) {
  const markdown = readText(sourceAbs(rel));
  const heading = firstHeading(markdown);
  const id = parseFeatureIdFromText(heading) || parseFeatureIdFromText(rel);
  const title = heading.replace(/^FT\s*\(\d+\):\s*/i, "").trim();
  const outputRel = `lastenheft/features/${slugBase(rel)}.html`;
  sourceToOutput.set(rel, outputRel);
  return {
    kind: "feature",
    id,
    title,
    rel,
    outputRel,
    markdown,
    status: metaValue(markdown, "Status"),
    typ: metaValue(markdown, "Typ"),
    beschreibung: excerptFrom(markdown, ["Ziel / Zweck", "Fachliche Beschreibung"]),
  };
}

function makeUseCase(rel) {
  const markdown = readText(sourceAbs(rel));
  const heading = firstHeading(markdown);
  const id = parseUseCaseIdFromText(heading) || parseUseCaseIdFromText(rel);
  const title = heading.replace(/^UC\s+\d{1,2}\/\d{1,2}:\s*/i, "").trim();
  const parentFeature = parseFeatureIdFromText(rel);
  const outputRel = `lastenheft/use-cases/${slugBase(rel)}.html`;
  sourceToOutput.set(rel, outputRel);
  return {
    kind: "use-case",
    id,
    title,
    rel,
    outputRel,
    markdown,
    featureId: parentFeature,
    beschreibung: excerptFrom(markdown, ["Ziel", "Ablauf", "Ergebnis"]),
  };
}

function makeBacklog(rel) {
  const markdown = readText(sourceAbs(rel));
  const heading = firstHeading(markdown);
  const featureId = parseFeatureIdFromText(rel) || parseFeatureIdFromText(heading);
  const id = `BL-${featureId.replace("FT-", "")}`;
  const title = heading || `${featureId} Backlog`;
  const outputRel = `lastenheft/backlogs/${slugBase(rel)}.html`;
  sourceToOutput.set(rel, outputRel);
  return {
    kind: "backlog",
    id,
    title,
    rel,
    outputRel,
    markdown,
    featureId,
    beschreibung: excerptFrom(markdown, ["Fachliche Beschreibung", "Ziel / Zweck"]),
  };
}

function isKnownFeatureShellWithoutUseCases(row) {
  const status = (row.status || "").toLowerCase();
  const typ = (row.typ || "").toLowerCase();
  return typ.includes("feature-hülle")
    || typ.includes("feature-huelle")
    || status.includes("backlog")
    || status.includes("nicht spezifiziert")
    || /Noch keine Use Cases angelegt\./i.test(row.markdown || "");
}

function makeNfr(rel) {
  const index = loadIndex();
  const markdown = readText(sourceAbs(rel));
  const heading = firstHeading(markdown);
  const id = parseNfrIdFromText(heading) || parseNfrIdFromText(rel);
  const indexed = index.nfrs?.find((item) => item.id === id);
  const title = heading.replace(/^NFR-\d{2}:\s*/i, "").trim();
  const outputRel = `lastenheft/nfrs/${slugBase(rel)}.html`;
  sourceToOutput.set(rel, outputRel);
  return {
    kind: "nfr",
    id,
    title,
    rel,
    outputRel,
    markdown,
    status: metaValue(markdown, "Status") || "Abgeschlossen",
    kategorie: metaValue(markdown, "Kategorie") || indexed?.kategorie || "",
    beschreibung: indexed?.beschreibung || excerptFrom(markdown, ["Beschreibung", "Geltungsbereich"]),
    notionUrl: indexed?.notion_url,
  };
}

function makeJournal(rel) {
  const markdown = readText(sourceAbs(rel));
  const heading = firstHeading(markdown);
  const outputRel = `verwaltung/journal/${slugBase(rel)}.html`;
  sourceToOutput.set(rel, outputRel);
  const dateKey = dateKeyFromJournalRel(rel);
  return {
    kind: "journal",
    id: slugBase(rel),
    title: heading.replace(/^#+\s*/, "") || slugBase(rel),
    rel,
    outputRel,
    markdown,
    dateKey,
    datum: formatDate(posix.basename(rel).slice(0, 8)),
    beschreibung: excerptFrom(markdown, ["Zusammenfassung", "Ergebnis", "Änderungen"]),
  };
}

function makeUserDoc(rel) {
  const markdown = readText(sourceAbs(rel));
  const heading = firstHeading(markdown);
  const userDocRel = posix.relative("user-docs", rel);
  const categoryPath = posix.dirname(userDocRel);
  const category = categoryPath === "."
    ? "Allgemein"
    : categoryPath.split("/").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" / ");
  const outputRel = `benutzerdokumentation/${userDocRel.replace(/\.md$/, ".html")}`;
  sourceToOutput.set(rel, outputRel);
  return {
    kind: "user-doc",
    id: slugBase(rel),
    title: heading || slugBase(rel),
    rel,
    outputRel,
    markdown,
    category,
    stand: standValue(markdown),
    beschreibung: firstParagraph(stripFirstHeading(stripStandFooter(markdown))),
  };
}

function registerStaticMappings() {
  sourceToOutput.set("features/README.md", "lastenheft/features.html");
  sourceToOutput.set("use-cases.md", "lastenheft/use-cases.html");
  sourceToOutput.set("backlog.md", "lastenheft/backlogs.html");
  sourceToOutput.set("nfrs/README.md", "lastenheft/nfrs.html");
  sourceToOutput.set("journal/README.md", "verwaltung/journal.html");
  sourceToOutput.set("projects/README.md", "projekt/projekte.html");
  sourceToOutput.set("tasks/README.md", "projekt/aufgaben.html");
  sourceToOutput.set("user-docs/README.md", "benutzerdokumentation.html");
}

function renderEntityPage(entity, sources) {
  const current = entity.kind === "project"
    ? "projekte"
    : entity.kind === "task"
      ? "aufgaben"
      : entity.kind === "feature"
        ? "features"
        : entity.kind === "use-case"
          ? "use-cases"
          : entity.kind === "backlog"
            ? "backlogs"
            : entity.kind === "nfr"
              ? "nfrs"
              : entity.kind === "user-doc"
                ? "user-docs"
                : "journal";
  const area = current === "journal"
    ? "Verwaltung"
    : current === "user-docs"
      ? "Benutzerdokumentation"
      : ["projekte", "aufgaben"].includes(current)
        ? "Projekte"
        : "Lastenheft";
  const areaHref = current === "journal"
    ? "verwaltung/journal.html"
    : current === "user-docs"
      ? "benutzerdokumentation.html"
      : ["projekte", "aufgaben"].includes(current)
        ? "projekt/projekte.html"
        : "lastenheft/features.html";
  const breadcrumbs = [
    { label: "MugPlan Wiki", href: "index.html" },
    { label: area, href: areaHref },
    { label: navLabel(current), href: indexHrefFor(current) },
    { label: `${entity.id && entity.kind !== "user-doc" ? `${entity.id} ` : ""}${entity.title}`.trim() },
  ];
  const meta = entity.kind === "journal"
    ? metaLine([{ label: "Datum", value: entity.datum }])
    : entity.kind === "user-doc"
      ? metaLine([
          { label: "Bereich", value: entity.category, badge: "neutral" },
          { label: "Stand", value: entity.stand },
        ])
    : metaLine([
        { label: "Status", value: entity.status, badge: "neutral" },
        { label: "Dringlichkeit", value: entity.dringlichkeit, badge: "neutral" },
        { label: "Kategorie", value: entity.kategorie, badge: "neutral" },
        { label: "Thema", value: entity.thema, badge: "neutral" },
        { label: "Typ", value: entity.typ, badge: "neutral" },
        { label: "Feature", value: entity.featureId, badge: "neutral" },
        { label: "Erstellt", value: entity.erstellt },
      ]);
  const titlePrefix = entity.id && entity.kind !== "user-doc" ? `${entity.id}: ` : "";
  const related = relatedRows(entity, sources);
  const markdownBody = entity.kind === "user-doc"
    ? stripStandFooter(stripFirstHeading(entity.markdown))
    : stripFirstHeading(entity.markdown);
  const body = `<h1 class="wiki-h1">${escapeHtml(titlePrefix)}${escapeHtml(entity.title)}</h1>
    ${meta}
    ${entity.beschreibung ? `<p class="wiki-lead">${escapeHtml(entity.beschreibung)}</p>` : ""}
    ${markdownToHtml(markdownBody, entity.rel, entity.outputRel)}
    ${relationsBlock(related)}`;
  return layout({
    outputRel: entity.outputRel,
    title: `${titlePrefix}${entity.title}`,
    screenLabel: `${navLabel(current)} ${entity.id ?? entity.title}`,
    current,
    breadcrumbs,
    body,
  });
}

function relatedRows(entity, sources) {
  if (entity.kind === "project") {
    const master = sources.tasks.find((item) => item.rel === entity.masterTask);
    const tasks = entity.taskRefs.map((rel) => sources.tasks.find((item) => item.rel === rel)).filter(Boolean);
    return [
      { label: "Masteraufgabe", values: master ? [entityLink(master, entity.outputRel, master.id || master.title)] : [] },
      { label: "Einzelaufgaben", html: taskChecklist(tasks, entity.outputRel) },
    ];
  }
  if (entity.kind === "task") {
    const projects = sources.projects.filter((project) => project.masterTask === entity.rel || project.taskRefs.includes(entity.rel));
    return [{ label: "Projekte", values: projects.map((item) => entityLink(item, entity.outputRel, item.id)) }];
  }
  if (entity.kind === "feature") {
    const ucs = sources.useCases.filter((item) => item.featureId === entity.id);
    const backlogs = sources.backlogs.filter((item) => item.featureId === entity.id);
    return [
      { label: "Use Cases", values: ucs.map((item) => entityLink(item, entity.outputRel, item.id)) },
      { label: "Backlogs", values: backlogs.map((item) => entityLink(item, entity.outputRel, item.id)) },
    ];
  }
  if (entity.kind === "use-case" || entity.kind === "backlog") {
    const feature = sources.features.find((item) => item.id === entity.featureId);
    return [{ label: "Feature", values: feature ? [entityLink(feature, entity.outputRel, feature.id)] : [] }];
  }
  if (entity.kind === "journal") {
    const featureIds = [...new Set(entity.markdown.match(/FT\s*\(?\d{1,2}\)?/gi)?.map(parseFeatureIdFromText).filter(Boolean) ?? [])];
    const useCaseIds = [...new Set(entity.markdown.match(/UC[-\s]?\d{1,2}[/-]\d{1,2}/gi)?.map(parseUseCaseIdFromText).filter(Boolean) ?? [])];
    return [
      { label: "Features", values: featureIds.map((id) => sources.features.find((item) => item.id === id)).filter(Boolean).map((item) => entityLink(item, entity.outputRel, item.id)) },
      { label: "Use Cases", values: useCaseIds.map((id) => sources.useCases.find((item) => item.id === id)).filter(Boolean).map((item) => entityLink(item, entity.outputRel, item.id)) },
    ];
  }
  if (entity.kind === "nfr") {
    const featureIds = [...new Set(entity.markdown.match(/FT\s*\(?\d{1,2}\)?/gi)?.map(parseFeatureIdFromText).filter(Boolean) ?? [])];
    return [{ label: "Features", values: featureIds.map((id) => sources.features.find((item) => item.id === id)).filter(Boolean).map((item) => entityLink(item, entity.outputRel, item.id)) }];
  }
  return [];
}

function navLabel(current) {
  return {
    features: "Features",
    "use-cases": "Use Cases",
    backlogs: "Backlogs",
    nfrs: "NFRs",
    journal: "Journal",
    control: "Kontrollbericht",
    aufgaben: "Aufgaben",
    projekte: "Projekte",
    "user-docs": "Benutzerdokumentation",
  }[current] ?? current;
}

function iconKeyForCurrent(current) {
  return {
    projekte: "projekte",
    aufgaben: "aufgaben",
    features: "features",
    "use-cases": "use-cases",
    backlogs: "backlogs",
    nfrs: "nfrs",
    journal: "journal",
    metadaten: "metadaten",
    control: "control",
    "user-docs": "user-docs",
  }[current] ?? "";
}

function headingIconAttr(current) {
  const iconKey = iconKeyForCurrent(current);
  return iconKey ? ` data-icon="${iconKey}"` : "";
}

function indexHrefFor(current) {
  return {
    projekte: "projekt/projekte.html",
    aufgaben: "projekt/aufgaben.html",
    features: "lastenheft/features.html",
    "use-cases": "lastenheft/use-cases.html",
    backlogs: "lastenheft/backlogs.html",
    nfrs: "lastenheft/nfrs.html",
    journal: "verwaltung/journal.html",
    "user-docs": "benutzerdokumentation.html",
  }[current] ?? "index.html";
}

function card(entity, fromOutputRel) {
  return `<article class="wiki-aufgabe">
    <h3 class="wiki-aufgabe__titel">${entityLink(entity, fromOutputRel, `${entity.id} ${entity.title}`.trim())}</h3>
    <div class="wiki-aufgabe__meta">
      ${entity.status ? badge(entity.status) : ""}
      ${entity.kategorie ? badge(entity.kategorie) : ""}
      ${entity.featureId ? badge(entity.featureId) : ""}
      ${entity.datum ? `<span class="wiki-aufgabe__datum">${escapeHtml(entity.datum)}</span>` : ""}
    </div>
    ${entity.beschreibung ? `<p class="wiki-aufgabe__beschreibung">${escapeHtml(entity.beschreibung)}</p>` : ""}
  </article>`;
}

function tablePage({ outputRel, title, current, lead, rows, columns }) {
  const area = current === "journal" ? "Verwaltung" : ["projekte", "aufgaben"].includes(current) ? "Projekte" : "Lastenheft";
  const body = `<h1 class="wiki-h1"${headingIconAttr(current)}>${escapeHtml(title)}</h1>
    <p class="wiki-lead">${escapeHtml(lead)}</p>
    <table class="wiki-table">
      <thead><tr>${columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows
          .map((row) => `<tr>${columns.map((col, index) => `<td${index === 0 ? ' class="wiki-table__id"' : ""}>${col.render(row)}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>`;
  return layout({
    outputRel,
    title,
    screenLabel: title,
    current,
    breadcrumbs: [
      { label: "MugPlan Wiki", href: "index.html" },
      { label: area, href: "index.html" },
      { label: title },
    ],
    body,
  });
}

function isClosedProject(project) {
  const status = (project.status ?? "").trim().toLocaleLowerCase("de");
  return ["abgeschlossen", "erledigt", "entfernt", "verworfen"].includes(status);
}

function renderProjectTable(rows, outputRel) {
  const columns = [
    { label: "ID", render: (row) => entityLink(row, outputRel, row.id) },
    { label: "Projekt", render: (row) => entityLink(row, outputRel, row.title) },
    { label: "Status", render: (row) => row.status ? badge(row.status) : "" },
    { label: "Aufgaben", render: (row) => String(row.taskRefs.length) },
  ];
  if (rows.length === 0) {
    return "<p>Keine Projekte.</p>";
  }
  return `<table class="wiki-table">
      <thead><tr>${columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows
          .map((row) => `<tr>${columns.map((col, index) => `<td${index === 0 ? ' class="wiki-table__id"' : ""}>${col.render(row)}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>`;
}

function renderProjectOverviewPage(sources) {
  const outputRel = "projekt/projekte.html";
  const openProjects = sources.projects.filter((project) => !isClosedProject(project));
  const closedProjects = sources.projects.filter(isClosedProject);
  const body = `<h1 class="wiki-h1"${headingIconAttr("projekte")}>Projekte</h1>
    <p class="wiki-lead">Thematisch verwandte Aufgabensammlungen für größere Arbeitsstränge. Projekte haben Aufgaben, aber nicht zwingend eine Masteraufgabe.</p>
    <h2 class="wiki-h2">Offene Projekte</h2>
    ${renderProjectTable(openProjects, outputRel)}
    <h2 class="wiki-h2">Geschlossene Projekte</h2>
    ${renderProjectTable(closedProjects, outputRel)}`;
  return layout({
    outputRel,
    title: "Projekte",
    screenLabel: "Projekte",
    current: "projekte",
    breadcrumbs: [
      { label: "MugPlan Wiki", href: "index.html" },
      { label: "Projekte", href: "index.html" },
      { label: "Projekte" },
    ],
    body,
  });
}

function renderUserDocsOverview(userDocs) {
  const outputRel = "benutzerdokumentation.html";
  const readmeRel = "user-docs/README.md";
  const readmePath = sourceAbs(readmeRel);
  const readmeMarkdown = fs.existsSync(readmePath) ? readText(readmePath) : "";
  const categories = [...new Set(userDocs.map((doc) => doc.category))];
  const readmeBody = readmeMarkdown
    ? markdownToHtml(stripStandFooter(stripFirstHeading(readmeMarkdown)), readmeRel, outputRel)
    : "<p>Für diesen Bereich ist noch keine Einleitung hinterlegt.</p>";
  const sections = categories
    .map((category) => {
      const docs = userDocs.filter((doc) => doc.category === category);
      return `<section class="wiki-doc-section">
        <h2 class="wiki-h2">${escapeHtml(category)}</h2>
        <div class="wiki-doc-grid">
          ${docs
            .map((doc) => `<article class="wiki-doc-card">
              <p class="wiki-card__eyebrow">${escapeHtml(doc.category)}</p>
              <h3 class="wiki-doc-card__title">${entityLink(doc, outputRel, doc.title)}</h3>
              ${doc.beschreibung ? `<p class="wiki-doc-card__desc">${escapeHtml(doc.beschreibung)}</p>` : ""}
              <div class="wiki-doc-card__meta">
                ${doc.stand ? `<span>Stand ${escapeHtml(doc.stand)}</span>` : ""}
              </div>
            </article>`)
            .join("")}
        </div>
      </section>`;
    })
    .join("");
  const body = `<h1 class="wiki-h1"${headingIconAttr("user-docs")}>Benutzerdokumentation</h1>
    ${metaLine([{ label: "Unterseiten", value: String(userDocs.length) }, { label: "Stand", value: standValue(readmeMarkdown) }])}
    <div class="wiki-user-docs-intro">${readmeBody}</div>
    ${sections}`;
  return layout({
    outputRel,
    title: "Benutzerdokumentation",
    screenLabel: "Benutzerdokumentation",
    current: "user-docs",
    breadcrumbs: [
      { label: "MugPlan Wiki", href: "index.html" },
      { label: "Benutzerdokumentation" },
    ],
    body,
  });
}

function renderIndex(sources, index) {
  const outputRel = "index.html";
  const lastJournal = sources.journal[0];
  const body = `<h1 class="wiki-h1">MugPlan Wiki</h1>
    <p class="wiki-lead">Interne Projektdokumentation für die Dispositions- und Planungsanwendung MugPlan. Markdown bleibt Quelle der Wahrheit; diese HTML-Seiten sind generierte Leseseiten.</p>
    <section class="wiki-cards" aria-label="Bereiche">
      <article class="wiki-card">
        <h2 class="wiki-card__title"><a href="${relLink(outputRel, "projekt/projekte.html")}">Projekte</a></h2>
        <p class="wiki-card__desc">Thematisch verwandte Aufgabensammlungen mit offenen und geschlossenen Arbeitsständen.</p>
        <ul class="wiki-card__links">
          <li><a href="${relLink(outputRel, "projekt/projekte.html")}">Projekte <span class="wiki-card__count">${sources.projects.length}</span></a></li>
          <li><a href="${relLink(outputRel, "projekt/aufgaben.html")}">Aufgaben <span class="wiki-card__count">${sources.tasks.length}</span></a></li>
        </ul>
      </article>
      <article class="wiki-card">
        <h2 class="wiki-card__title"><a href="${relLink(outputRel, "lastenheft/features.html")}">Lastenheft</a></h2>
        <p class="wiki-card__desc">Features, Use Cases, Backlogs und nicht-funktionale Anforderungen.</p>
        <ul class="wiki-card__links">
          <li><a href="${relLink(outputRel, "lastenheft/features.html")}">Features <span class="wiki-card__count">${sources.features.length}</span></a></li>
          <li><a href="${relLink(outputRel, "lastenheft/use-cases.html")}">Use Cases <span class="wiki-card__count">${sources.useCases.length}</span></a></li>
          <li><a href="${relLink(outputRel, "lastenheft/backlogs.html")}">Backlogs <span class="wiki-card__count">${sources.backlogs.length}</span></a></li>
          <li><a href="${relLink(outputRel, "lastenheft/nfrs.html")}">NFRs <span class="wiki-card__count">${sources.nfrs.length}</span></a></li>
        </ul>
      </article>
      <article class="wiki-card">
        <h2 class="wiki-card__title"><a href="${relLink(outputRel, "benutzerdokumentation.html")}">Benutzerdokumentation</a></h2>
        <p class="wiki-card__desc">Praxisnahe Anleitungen für Anwenderinnen und Anwender, aus den Markdown-Dateien der User-Docs generiert.</p>
        <ul class="wiki-card__links">
          <li><a href="${relLink(outputRel, "benutzerdokumentation.html")}">Übersicht <span class="wiki-card__count">${sources.userDocs.length}</span></a></li>
        </ul>
      </article>
      <article class="wiki-card">
        <h2 class="wiki-card__title"><a href="${relLink(outputRel, "verwaltung/journal.html")}">Verwaltung</a></h2>
        <p class="wiki-card__desc">Journal und Kontrollberichte zur generierten Wiki-Ausgabe.</p>
        <ul class="wiki-card__links">
          <li><a href="${relLink(outputRel, "verwaltung/journal.html")}">Journal <span class="wiki-card__count">${sources.journal.length}</span></a></li>
          <li><a href="${relLink(outputRel, "control-report.html")}">Kontrollbericht <span class="wiki-card__count">aktuell</span></a></li>
        </ul>
      </article>
    </section>
    <div class="wiki-status-line" aria-label="Projektstatus">
      <span class="wiki-status-line__item"><span class="wiki-status-line__num">${sources.projects.length}</span> Projekte</span>
      <span class="wiki-status-line__sep">·</span>
      <span class="wiki-status-line__item"><span class="wiki-status-line__num">${sources.tasks.length}</span> Aufgaben</span>
      <span class="wiki-status-line__sep">·</span>
      <span class="wiki-status-line__item"><span class="wiki-status-line__num">${sources.features.length}</span> Features</span>
      <span class="wiki-status-line__sep">·</span>
      <span class="wiki-status-line__item"><span class="wiki-status-line__num">${sources.useCases.length}</span> Use Cases</span>
      <span class="wiki-status-line__sep">·</span>
      <span class="wiki-status-line__item"><span class="wiki-status-line__num">${sources.userDocs.length}</span> User-Docs</span>
      <span class="wiki-status-line__sep">·</span>
      <span class="wiki-status-line__item"><span class="wiki-status-line__num">${formatDate(index._meta?.aktualisiert)}</span> Indexstand</span>
      ${lastJournal ? `<span class="wiki-status-line__sep">·</span><span class="wiki-status-line__item">Letzter Eintrag <span class="wiki-status-line__num">${escapeHtml(lastJournal.datum)}</span></span>` : ""}
    </div>`;
  return layout({ outputRel, title: "MugPlan Wiki", screenLabel: "Startseite", current: "", body });
}

function renderOverviewPages(sources) {
  writeText(outputAbs("benutzerdokumentation.html"), renderUserDocsOverview(sources.userDocs));
  writeText(outputAbs("projekt/projekte.html"), renderProjectOverviewPage(sources));
  writeText(outputAbs("projekt/aufgaben.html"), tablePage({
    outputRel: "projekt/aufgaben.html",
    title: "Aufgaben",
    current: "aufgaben",
    lead: "Offene und laufende Aufgaben aus der lokalen Aufgabenverwaltung, generiert aus den Aufgabendateien.",
    rows: sources.tasks,
    columns: [
      { label: "ID", render: (row) => row.id ? entityLink(row, "projekt/aufgaben.html", row.id) : "" },
      { label: "Aufgabe", render: (row) => entityLink(row, "projekt/aufgaben.html", row.title) },
      { label: "Thema", render: (row) => escapeHtml(row.thema) },
      { label: "Typ", render: (row) => row.typ ? badge(row.typ) : "" },
      { label: "Status", render: (row) => row.status ? badge(row.status) : "" },
      { label: "Dringlichkeit", render: (row) => row.dringlichkeit ? badge(row.dringlichkeit) : "" },
    ],
  }));
  writeText(outputAbs("lastenheft/features.html"), tablePage({
    outputRel: "lastenheft/features.html",
    title: "Features",
    current: "features",
    lead: "Vollständig aus den lokalen Feature-Hauptseiten generierte Übersicht.",
    rows: sources.features,
    columns: [
      { label: "ID", render: (row) => entityLink(row, "lastenheft/features.html", row.id) },
      { label: "Titel", render: (row) => entityLink(row, "lastenheft/features.html", row.title) },
      { label: "Status", render: (row) => row.status ? badge(row.status) : "" },
      { label: "Use Cases", render: (row) => String(sources.useCases.filter((item) => item.featureId === row.id).length) },
      { label: "Backlogs", render: (row) => String(sources.backlogs.filter((item) => item.featureId === row.id).length) },
    ],
  }));
  writeText(outputAbs("lastenheft/use-cases.html"), tablePage({
    outputRel: "lastenheft/use-cases.html",
    title: "Use Cases",
    current: "use-cases",
    lead: "Vollständig aus den lokalen Use-Case-Dateien generierte Übersicht.",
    rows: sources.useCases,
    columns: [
      { label: "ID", render: (row) => entityLink(row, "lastenheft/use-cases.html", row.id) },
      { label: "Titel", render: (row) => entityLink(row, "lastenheft/use-cases.html", row.title) },
      { label: "Feature", render: (row) => {
        const feature = sources.features.find((item) => item.id === row.featureId);
        return feature ? entityLink(feature, "lastenheft/use-cases.html", feature.id) : escapeHtml(row.featureId);
      } },
      { label: "Beschreibung", render: (row) => escapeHtml(row.beschreibung) },
    ],
  }));
  writeText(outputAbs("lastenheft/backlogs.html"), tablePage({
    outputRel: "lastenheft/backlogs.html",
    title: "Backlogs",
    current: "backlogs",
    lead: "Feature-zentrierte Backlogs aus den lokalen Backlog-Dateien.",
    rows: sources.backlogs,
    columns: [
      { label: "ID", render: (row) => entityLink(row, "lastenheft/backlogs.html", row.id) },
      { label: "Titel", render: (row) => entityLink(row, "lastenheft/backlogs.html", row.title) },
      { label: "Feature", render: (row) => {
        const feature = sources.features.find((item) => item.id === row.featureId);
        return feature ? entityLink(feature, "lastenheft/backlogs.html", feature.id) : escapeHtml(row.featureId);
      } },
      { label: "Beschreibung", render: (row) => escapeHtml(row.beschreibung) },
    ],
  }));
  writeText(outputAbs("lastenheft/nfrs.html"), tablePage({
    outputRel: "lastenheft/nfrs.html",
    title: "NFRs",
    current: "nfrs",
    lead: "Nicht-funktionale Anforderungen aus lokalen NFR-Quellen und dem redaktionellen Index.",
    rows: sources.nfrs,
    columns: [
      { label: "ID", render: (row) => entityLink(row, "lastenheft/nfrs.html", row.id) },
      { label: "Titel", render: (row) => entityLink(row, "lastenheft/nfrs.html", row.title) },
      { label: "Kategorie", render: (row) => row.kategorie ? badge(row.kategorie) : "" },
      { label: "Status", render: (row) => row.status ? badge(row.status) : "" },
      { label: "Beschreibung", render: (row) => escapeHtml(row.beschreibung) },
    ],
  }));
  writeText(outputAbs("verwaltung/journal.html"), tablePage({
    outputRel: "verwaltung/journal.html",
    title: "Journal",
    current: "journal",
    lead: "Chronologische HTML-Übersicht der lokalen Wiki-Journaleinträge.",
    rows: sources.journal,
    columns: [
      { label: "Datum", render: (row) => entityLink(row, "verwaltung/journal.html", row.datum) },
      { label: "Titel", render: (row) => entityLink(row, "verwaltung/journal.html", row.title) },
      { label: "Auszug", render: (row) => escapeHtml(row.beschreibung) },
    ],
  }));
}

function renderMetadataPage(index) {
  const outputRel = "verwaltung/metadaten.html";
  const statusRows = index.status ?? [];
  const prioRows = index.dringlichkeiten ?? [];
  const taskStatusRows = index.aufgaben_status ?? [];
  const taskTypeRows = index.aufgabentypen ?? [];
  const taskTopicRows = index.aufgabenthemen ?? [];
  const decisionStatusRows = index.entscheidungsstatus ?? [];
  const decisionTypeRows = index.entscheidungsarten ?? [];
  const projectRows = index.projekte ?? [];
  const nfrRows = index.nfrs ?? [];
  const table = (title, rows, columns) => `<h2 class="wiki-h2">${escapeHtml(title)}</h2>
    <table class="wiki-table">
      <thead><tr>${columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${columns.map((col, index) => `<td${index === 0 ? ' class="wiki-table__id"' : ""}>${col.render(row)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
  const body = `<h1 class="wiki-h1"${headingIconAttr("metadaten")}>Metadaten</h1>
    <p class="wiki-lead">Redaktionell gepflegte Klassifikatoren und Indexeinträge aus <code>docs/wiki/data/wiki-index.json</code>.</p>
    ${metaLine([{ label: "Indexstand", value: formatDate(index._meta?.aktualisiert) }, { label: "Version", value: index._meta?.version }])}
    ${table("Status", statusRows, [
      { label: "ID", render: (row) => escapeHtml(row.id) },
      { label: "Label", render: (row) => badge(row.label) },
      { label: "Sortierung", render: (row) => escapeHtml(row.sortierung) },
    ])}
    ${table("Dringlichkeiten", prioRows, [
      { label: "ID", render: (row) => escapeHtml(row.id) },
      { label: "Label", render: (row) => badge(row.label) },
      { label: "Sortierung", render: (row) => escapeHtml(row.sortierung) },
    ])}
    ${table("Aufgabenstatus", taskStatusRows, [
      { label: "ID", render: (row) => escapeHtml(row.id) },
      { label: "Label", render: (row) => badge(row.label) },
      { label: "Sortierung", render: (row) => escapeHtml(row.sortierung) },
    ])}
    ${table("Aufgabentypen", taskTypeRows, [
      { label: "ID", render: (row) => escapeHtml(row.id) },
      { label: "Label", render: (row) => badge(row.label) },
      { label: "Sortierung", render: (row) => escapeHtml(row.sortierung) },
    ])}
    ${table("Aufgabenthemen", taskTopicRows, [
      { label: "ID", render: (row) => escapeHtml(row.id) },
      { label: "Label", render: (row) => escapeHtml(row.label) },
      { label: "Sortierung", render: (row) => escapeHtml(row.sortierung) },
    ])}
    ${table("Decision-Status", decisionStatusRows, [
      { label: "ID", render: (row) => escapeHtml(row.id) },
      { label: "Label", render: (row) => badge(row.label) },
      { label: "Sortierung", render: (row) => escapeHtml(row.sortierung) },
    ])}
    ${table("Decision-Arten", decisionTypeRows, [
      { label: "ID", render: (row) => escapeHtml(row.id) },
      { label: "Label", render: (row) => escapeHtml(row.label) },
      { label: "Sortierung", render: (row) => escapeHtml(row.sortierung) },
    ])}
    ${table("Projektindex", projectRows, [
      { label: "ID", render: (row) => escapeHtml(row.id) },
      { label: "Titel", render: (row) => escapeHtml(row.titel) },
      { label: "Status", render: (row) => badge(statusLabel(index, row.status_id) || row.status_id) },
      { label: "Aufgaben", render: (row) => escapeHtml(row.aufgaben?.length ?? 0) },
    ])}
    ${table("NFR-Index", nfrRows, [
      { label: "ID", render: (row) => escapeHtml(row.id) },
      { label: "Titel", render: (row) => escapeHtml(row.titel) },
      { label: "Kategorie", render: (row) => badge(row.kategorie) },
      { label: "Beschreibung", render: (row) => escapeHtml(row.beschreibung) },
    ])}`;
  writeText(outputAbs(outputRel), layout({
    outputRel,
    title: "Metadaten",
    screenLabel: "Metadaten",
    current: "metadaten",
    breadcrumbs: [
      { label: "MugPlan Wiki", href: "index.html" },
      { label: "Verwaltung", href: "verwaltung/journal.html" },
      { label: "Metadaten" },
    ],
    body,
  }));
}

function validate(sources) {
  const report = {
    generated_at: todayIso,
    summary: {},
    errors: [],
    warnings: [],
    items: {
      projects: [],
      tasks: [],
      features: [],
      use_cases: [],
      backlogs: [],
      nfrs: [],
      user_docs: [],
      journal: [],
    },
  };
  const sourceGroups = [
    ["projects", sources.projects, ["id", "title", "status", "beschreibung"]],
    ["tasks", sources.tasks, ["id", "title", "status", "thema", "typ"]],
    ["features", sources.features, ["id", "title", "status", "beschreibung"]],
    ["use_cases", sources.useCases, ["id", "title", "featureId"]],
    ["backlogs", sources.backlogs, ["id", "title", "featureId"]],
    ["nfrs", sources.nfrs, ["id", "title", "status", "kategorie", "beschreibung"]],
    ["user_docs", sources.userDocs, ["title", "category", "beschreibung"]],
    ["journal", sources.journal, ["title", "datum"]],
  ];
  for (const [key, rows, required] of sourceGroups) {
    report.summary[key] = { source_count: rows.length, generated_count: 0, warnings: 0, errors: 0 };
    for (const row of rows) {
      const item = {
        id: row.id,
        title: row.title,
        source: row.rel,
        output: row.outputRel,
        ok: true,
        warnings: [],
        errors: [],
      };
      for (const field of required) {
        if (!row[field]) item.errors.push(`Pflichtfeld fehlt: ${field}`);
      }
      if (!fs.existsSync(outputAbs(row.outputRel))) item.errors.push("HTML-Ausgabe fehlt");
      if (row.kind === "use-case") {
        const requiredSections = ["Akteur", "Ziel", "Vorbedingungen", "Ablauf", "Alternativen", "Ergebnis"];
        for (const section of requiredSections) {
          if (!sectionContent(row.markdown, section)) item.warnings.push(`Abschnitt ohne Inhalt: ${section}`);
        }
      }
      if (row.kind === "feature") {
        const useCases = sources.useCases.filter((itemRow) => itemRow.featureId === row.id);
        if (!useCases.length && !isKnownFeatureShellWithoutUseCases(row)) item.warnings.push("Keine lokale Use-Case-Datei zugeordnet");
      }
      if (row.kind === "project") {
        const missingTasks = [row.masterTask, ...row.taskRefs].filter((rel) => rel && !sources.tasks.some((task) => task.rel === rel));
        if (missingTasks.length) item.errors.push(`Aufgabenbezug nicht auflösbar: ${missingTasks.join(", ")}`);
      }
      if (row.kind === "backlog" && !sources.features.some((feature) => feature.id === row.featureId)) {
        item.errors.push(`Feature-Bezug nicht auflösbar: ${row.featureId}`);
      }
      if (item.errors.length) {
        item.ok = false;
        report.errors.push({ type: key, id: row.id, title: row.title, messages: item.errors });
      }
      if (item.warnings.length) {
        report.warnings.push({ type: key, id: row.id, title: row.title, messages: item.warnings });
      }
      report.summary[key].generated_count += fs.existsSync(outputAbs(row.outputRel)) ? 1 : 0;
      report.summary[key].warnings += item.warnings.length;
      report.summary[key].errors += item.errors.length;
      report.items[key].push(item);
    }
  }
  return report;
}

function renderControlReport(report) {
  const outputRel = "control-report.html";
  const summaryRows = Object.entries(report.summary)
    .map(([key, value]) => `<tr><td class="wiki-table__id">${escapeHtml(key)}</td><td>${value.source_count}</td><td>${value.generated_count}</td><td>${value.errors}</td><td>${value.warnings}</td></tr>`)
    .join("");
  const warningRows = report.warnings
    .map((warning) => `<tr><td class="wiki-table__id">${escapeHtml(warning.type)}</td><td>${escapeHtml(warning.id ?? "")}</td><td>${escapeHtml(warning.title ?? "")}</td><td>${warning.messages.map(escapeHtml).join("<br>")}</td></tr>`)
    .join("");
  const errorRows = report.errors
    .map((error) => `<tr><td class="wiki-table__id">${escapeHtml(error.type)}</td><td>${escapeHtml(error.id ?? "")}</td><td>${escapeHtml(error.title ?? "")}</td><td>${error.messages.map(escapeHtml).join("<br>")}</td></tr>`)
    .join("");
  const body = `<h1 class="wiki-h1"${headingIconAttr("control")}>Kontrollbericht</h1>
    <p class="wiki-lead">Inhaltskontrolle der generierten HTML-Wiki. Fehler blockieren die Übernahme; Warnungen markieren unvollständige oder leere Quellabschnitte.</p>
    ${metaLine([{ label: "Erstellt", value: formatDate(report.generated_at) }])}
    <h2 class="wiki-h2">Zusammenfassung</h2>
    <table class="wiki-table"><thead><tr><th>Bereich</th><th>Quellen</th><th>HTML</th><th>Fehler</th><th>Warnungen</th></tr></thead><tbody>${summaryRows}</tbody></table>
    <h2 class="wiki-h2">Fehler</h2>
    ${report.errors.length ? `<table class="wiki-table"><thead><tr><th>Bereich</th><th>ID</th><th>Titel</th><th>Befund</th></tr></thead><tbody>${errorRows}</tbody></table>` : "<p>Keine Fehler.</p>"}
    <h2 class="wiki-h2">Warnungen</h2>
    ${report.warnings.length ? `<table class="wiki-table"><thead><tr><th>Bereich</th><th>ID</th><th>Titel</th><th>Befund</th></tr></thead><tbody>${warningRows}</tbody></table>` : "<p>Keine Warnungen.</p>"}`;
  return layout({
    outputRel,
    title: "Kontrollbericht",
    screenLabel: "Kontrollbericht",
    current: "control",
    breadcrumbs: [
      { label: "MugPlan Wiki", href: "index.html" },
      { label: "Verwaltung", href: "verwaltung/journal.html" },
      { label: "Kontrollbericht" },
    ],
    body,
  });
}

function writeCss() {
  writeText(outputAbs("wiki.css"), `:root {
  --wiki-bg: #ffffff;
  --wiki-bg-subtle: #fafaf9;
  --wiki-bg-muted: #f5f5f4;
  --wiki-bg-code: #f7f7f6;
  --wiki-fg: #000000;
  --wiki-fg-muted: #000000;
  --wiki-fg-subtle: #000000;
  --wiki-fg-faint: #000000;
  --wiki-border: #ececea;
  --wiki-border-strong: #d6d3d1;
  --wiki-accent: #3b6ea5;
  --wiki-accent-hover: #2a5683;
  --wiki-accent-bg: #dde7f2;
  --wiki-accent-faint: #f1f5fa;
  --wiki-area-projekt: oklch(0.50 0.075 245);
  --wiki-area-projekt-bg: oklch(0.96 0.022 245);
  --wiki-area-lastenheft: oklch(0.50 0.075 275);
  --wiki-area-lastenheft-bg: oklch(0.96 0.022 275);
  --wiki-area-verwaltung: oklch(0.50 0.060 205);
  --wiki-area-verwaltung-bg: oklch(0.96 0.020 205);
  --wiki-area-userdocs: oklch(0.46 0.085 145);
  --wiki-area-userdocs-bg: oklch(0.96 0.026 145);
  --wiki-status-offen-fg: #44403c;
  --wiki-status-offen-bg: #f1f0ee;
  --wiki-status-offen-border: #e0ddd9;
  --wiki-status-bearbeitung-fg: #1f4d7a;
  --wiki-status-bearbeitung-bg: #e4edf6;
  --wiki-status-bearbeitung-border: #c3d4e6;
  --wiki-status-blockiert-fg: #991b1b;
  --wiki-status-blockiert-bg: #fef2f2;
  --wiki-status-blockiert-border: #fecaca;
  --wiki-status-abgeschlossen-fg: #166534;
  --wiki-status-abgeschlossen-bg: #f0fdf4;
  --wiki-status-abgeschlossen-border: #bbf7d0;
  --wiki-font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  --wiki-font-mono: "JetBrains Mono", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  --wiki-sidebar-width: 260px;
  --wiki-content-max: 920px;
  --wiki-space-1: 4px;
  --wiki-space-2: 8px;
  --wiki-space-3: 12px;
  --wiki-space-4: 16px;
  --wiki-space-5: 24px;
  --wiki-space-6: 32px;
  --wiki-space-7: 48px;
}
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--wiki-font-sans);
  font-size: 15px;
  line-height: 1.6;
  color: var(--wiki-fg);
  background: var(--wiki-bg);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
a { color: var(--wiki-accent); text-decoration: none; text-underline-offset: 2px; }
a:hover { color: var(--wiki-accent-hover); text-decoration: underline; }
.wiki-app { display: grid; grid-template-columns: var(--wiki-sidebar-width) 1fr; min-height: 100vh; }
.wiki-sidebar {
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  overflow-y: auto;
  border-right: 1px solid var(--wiki-border);
  background: var(--wiki-bg-subtle);
  padding: var(--wiki-space-6) var(--wiki-space-5);
  font-size: 13px;
}
.wiki-sidebar__brand {
  display: flex;
  align-items: center;
  gap: var(--wiki-space-2);
  font-size: 16px;
  font-weight: 600;
  color: var(--wiki-fg);
  margin-bottom: var(--wiki-space-7);
}
.wiki-sidebar__brand:hover { color: var(--wiki-fg); text-decoration: none; }
.wiki-sidebar__mark { width: 18px; height: 18px; border-radius: 4px; background: var(--wiki-accent); display: inline-block; }
.wiki-sidebar__group { margin-bottom: var(--wiki-space-6); }
.wiki-sidebar__group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  font-weight: 700;
  color: var(--wiki-fg);
  margin: 0 0 var(--wiki-space-2);
  padding: 6px var(--wiki-space-3);
  background: var(--wiki-bg-muted);
  border: 1px solid var(--wiki-border);
  border-radius: 4px;
}
.wiki-sidebar__group-title::before {
  content: "";
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  background: var(--wiki-section-icon-color, currentColor);
  -webkit-mask: var(--wiki-icon, none) center / 14px 14px no-repeat;
          mask: var(--wiki-icon, none) center / 14px 14px no-repeat;
}
.wiki-sidebar__group:nth-of-type(1) .wiki-sidebar__group-title {
  color: var(--wiki-fg);
  --wiki-section-icon-color: var(--wiki-area-projekt);
  background: var(--wiki-area-projekt-bg);
  border-color: color-mix(in oklab, var(--wiki-area-projekt) 25%, transparent);
}
.wiki-sidebar__group:nth-of-type(2) .wiki-sidebar__group-title {
  color: var(--wiki-fg);
  --wiki-section-icon-color: var(--wiki-area-lastenheft);
  background: var(--wiki-area-lastenheft-bg);
  border-color: color-mix(in oklab, var(--wiki-area-lastenheft) 25%, transparent);
}
.wiki-sidebar__group:nth-of-type(3) .wiki-sidebar__group-title {
  color: var(--wiki-fg);
  --wiki-section-icon-color: var(--wiki-area-verwaltung);
  background: var(--wiki-area-verwaltung-bg);
  border-color: color-mix(in oklab, var(--wiki-area-verwaltung) 25%, transparent);
}
.wiki-sidebar__group:nth-of-type(4) .wiki-sidebar__group-title {
  color: var(--wiki-fg);
  --wiki-section-icon-color: var(--wiki-area-userdocs);
  background: var(--wiki-area-userdocs-bg);
  border-color: color-mix(in oklab, var(--wiki-area-userdocs) 25%, transparent);
}
.wiki-sidebar__nav { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; }
.wiki-sidebar__nav a { display: flex; align-items: center; gap: 8px; padding: 6px var(--wiki-space-3); border-radius: 4px; color: var(--wiki-accent); position: relative; }
.wiki-sidebar__nav a::before {
  content: "";
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  background: currentColor;
  -webkit-mask: var(--wiki-icon, none) center / 16px 16px no-repeat;
          mask: var(--wiki-icon, none) center / 16px 16px no-repeat;
  opacity: 0.85;
}
.wiki-sidebar__nav a.is-active::before { opacity: 1; }
.wiki-sidebar__nav a:hover { background: var(--wiki-bg-muted); color: var(--wiki-accent-hover); text-decoration: none; }
.wiki-sidebar__nav a.is-active { color: var(--wiki-accent); background: var(--wiki-accent-bg); font-weight: 600; }
.wiki-content { padding: 56px; min-width: 0; }
.wiki-content__inner { max-width: var(--wiki-content-max); margin: 0 auto; }
.wiki-breadcrumb { font-size: 13px; color: var(--wiki-fg-subtle); margin-bottom: var(--wiki-space-4); display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.wiki-breadcrumb a { color: var(--wiki-accent); }
.wiki-breadcrumb a:hover { color: var(--wiki-accent-hover); text-decoration: none; }
.wiki-breadcrumb__sep { color: var(--wiki-fg-faint); }
.wiki-breadcrumb__current { color: var(--wiki-fg); }
.wiki-h1 { font-size: 32px; font-weight: 600; letter-spacing: 0; line-height: 1.2; margin: 0 0 var(--wiki-space-3); color: var(--wiki-fg); }
.wiki-h1[data-icon] { display: flex; align-items: center; gap: 14px; }
.wiki-h1[data-icon]::before {
  content: "";
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: var(--wiki-heading-icon-color, currentColor);
  -webkit-mask: var(--wiki-icon, none) center / 32px 32px no-repeat;
          mask: var(--wiki-icon, none) center / 32px 32px no-repeat;
  opacity: 0.9;
}
.wiki-h1[data-icon="projekte"],
.wiki-h1[data-icon="aufgaben"] { --wiki-heading-icon-color: var(--wiki-area-projekt); }
.wiki-h1[data-icon="features"],
.wiki-h1[data-icon="use-cases"],
.wiki-h1[data-icon="backlogs"],
.wiki-h1[data-icon="nfrs"] { --wiki-heading-icon-color: var(--wiki-area-lastenheft); }
.wiki-h1[data-icon="journal"],
.wiki-h1[data-icon="metadaten"],
.wiki-h1[data-icon="control"] { --wiki-heading-icon-color: var(--wiki-area-verwaltung); }
.wiki-h1[data-icon="user-docs"] { --wiki-heading-icon-color: var(--wiki-area-userdocs); }
.wiki-h2 { font-size: 24px; font-weight: 600; letter-spacing: 0; line-height: 1.3; margin: var(--wiki-space-7) 0 var(--wiki-space-3); padding-top: var(--wiki-space-5); border-top: 1px solid var(--wiki-border); color: var(--wiki-fg); }
.wiki-h3 { font-size: 19px; font-weight: 600; letter-spacing: 0; line-height: 1.35; margin: var(--wiki-space-6) 0 var(--wiki-space-2); color: var(--wiki-fg); }
.wiki-lead { font-size: 17px; color: var(--wiki-fg-muted); margin: 0 0 var(--wiki-space-6); max-width: 760px; }
.wiki-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 var(--wiki-space-6); color: var(--wiki-fg-muted); font-size: 13px; }
.wiki-meta__label { color: var(--wiki-fg-subtle); font-weight: 500; }
.wiki-meta__sep { color: var(--wiki-fg-faint); }
.wiki-badge { display: inline-flex; align-items: center; gap: 5px; min-height: 22px; border-radius: 999px; padding: 2px 8px; border: 1px solid var(--wiki-border); background: var(--wiki-bg-muted); color: var(--wiki-fg-muted); font-size: 12px; line-height: 1.3; white-space: nowrap; }
.wiki-badge::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--wiki-badge-icon-color, currentColor);
  opacity: 0.7;
  flex-shrink: 0;
}
.wiki-badge--neutral,
.wiki-badge--offen { color: var(--wiki-fg); --wiki-badge-icon-color: var(--wiki-status-offen-fg); background: var(--wiki-status-offen-bg); border-color: var(--wiki-status-offen-border); }
.wiki-badge--bearbeitung { color: var(--wiki-fg); --wiki-badge-icon-color: var(--wiki-status-bearbeitung-fg); background: var(--wiki-status-bearbeitung-bg); border-color: var(--wiki-status-bearbeitung-border); }
.wiki-badge--blockiert { color: var(--wiki-fg); --wiki-badge-icon-color: var(--wiki-status-blockiert-fg); background: var(--wiki-status-blockiert-bg); border-color: var(--wiki-status-blockiert-border); }
.wiki-badge--abgeschlossen { color: var(--wiki-fg); --wiki-badge-icon-color: var(--wiki-status-abgeschlossen-fg); background: var(--wiki-status-abgeschlossen-bg); border-color: var(--wiki-status-abgeschlossen-border); }
.wiki-cards { display: grid; grid-template-columns: 1fr; gap: var(--wiki-space-5); margin: var(--wiki-space-6) 0; max-width: 760px; }
.wiki-card { border: 1px solid var(--wiki-border); border-radius: 8px; padding: var(--wiki-space-5); background: var(--wiki-bg); }
.wiki-card { transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease; }
.wiki-card:hover { border-color: var(--wiki-accent); box-shadow: 0 10px 28px rgba(28, 27, 26, 0.08); transform: translateY(-2px); }
.wiki-card__eyebrow { color: var(--wiki-fg-subtle); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0; }
.wiki-card__title { font-size: 22px; margin: var(--wiki-space-2) 0; line-height: 1.25; }
.wiki-card__title a { color: var(--wiki-accent); display: inline-flex; align-items: center; gap: 10px; }
.wiki-card__title a:hover { color: var(--wiki-accent-hover); text-decoration: none; }
.wiki-card__desc { color: var(--wiki-fg-muted); margin: 0 0 var(--wiki-space-4); }
.wiki-card__links { list-style: none; padding: var(--wiki-space-3) 0 0; margin: 0; display: flex; flex-direction: column; gap: 2px; border-top: 1px solid var(--wiki-border); }
.wiki-card__links li { margin: 0; }
.wiki-card__links a { display: flex; align-items: center; gap: 8px; padding: 6px 0; color: var(--wiki-accent); font-size: 13px; font-weight: 500; }
.wiki-card__links a:hover { color: var(--wiki-accent-hover); text-decoration: none; }
.wiki-card__links a::after {
  content: "\\2192";
  color: currentColor;
  font-weight: 400;
  transition: transform 120ms ease, color 120ms ease;
}
.wiki-card__links a:hover::after { color: currentColor; transform: translateX(2px); }
.wiki-card__count { color: currentColor; font-family: var(--wiki-font-mono); font-size: 12px; font-weight: 400; margin-left: auto; }
.wiki-status-line { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; color: var(--wiki-fg-muted); border-top: 1px solid var(--wiki-border); padding-top: var(--wiki-space-5); margin-top: var(--wiki-space-6); }
.wiki-status-line__num { font-family: var(--wiki-font-mono); color: var(--wiki-fg); font-weight: 500; }
.wiki-status-line__sep { color: var(--wiki-fg-faint); }
.wiki-aufgabe { border: 1px solid var(--wiki-border); border-radius: 8px; padding: var(--wiki-space-4); margin: var(--wiki-space-4) 0; background: var(--wiki-bg); }
.wiki-aufgabe__titel { font-size: 17px; line-height: 1.35; margin: 0 0 var(--wiki-space-2); }
.wiki-aufgabe__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: var(--wiki-space-2); }
.wiki-aufgabe__datum { color: var(--wiki-fg-subtle); font-family: var(--wiki-font-mono); font-size: 12px; }
.wiki-aufgabe__beschreibung { margin: 0; color: var(--wiki-fg-muted); }
.wiki-table { width: 100%; border-collapse: collapse; margin: var(--wiki-space-4) 0 var(--wiki-space-6); font-size: 14px; }
.wiki-table th, .wiki-table td { border-bottom: 1px solid var(--wiki-border); padding: 9px 10px; text-align: left; vertical-align: top; }
.wiki-table th { color: var(--wiki-fg-subtle); font-weight: 600; background: var(--wiki-bg-subtle); }
.wiki-table__id { font-family: var(--wiki-font-mono); white-space: nowrap; color: var(--wiki-fg); }
.wiki-relations { border-top: 1px solid var(--wiki-border); margin-top: var(--wiki-space-7); padding-top: var(--wiki-space-5); }
.wiki-relations__title { font-size: 16px; margin: 0 0 var(--wiki-space-3); }
.wiki-relations__grid { display: grid; grid-template-columns: 140px 1fr; gap: 8px 16px; font-size: 14px; }
.wiki-relations__key { color: var(--wiki-fg-subtle); font-weight: 500; }
.wiki-relations__val { display: flex; flex-wrap: wrap; gap: 8px 12px; }
.wiki-checklist { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; width: 100%; }
.wiki-checklist__item { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 8px; align-items: start; }
.wiki-checklist__item input { width: 16px; height: 16px; margin: 3px 0 0; accent-color: var(--wiki-accent); }
.wiki-checklist__text { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; min-width: 0; }
.wiki-callout { border: 1px solid var(--wiki-border-strong); border-radius: 8px; padding: var(--wiki-space-4); background: var(--wiki-bg-subtle); margin: var(--wiki-space-5) 0; }
.wiki-callout__title { font-weight: 600; margin: 0 0 4px; }
.wiki-user-docs-intro { max-width: 760px; }
.wiki-doc-section { margin-top: var(--wiki-space-6); }
.wiki-doc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--wiki-space-4); margin-top: var(--wiki-space-4); }
.wiki-doc-card { border: 1px solid var(--wiki-border); border-radius: 8px; padding: var(--wiki-space-5); background: var(--wiki-bg); min-height: 180px; display: flex; flex-direction: column; gap: var(--wiki-space-2); }
.wiki-doc-card:hover { border-color: var(--wiki-area-userdocs); box-shadow: 0 10px 28px rgba(28, 27, 26, 0.08); }
.wiki-doc-card__title { font-size: 20px; line-height: 1.3; margin: 0; }
.wiki-doc-card__title a { color: var(--wiki-accent); }
.wiki-doc-card__title a:hover { color: var(--wiki-accent-hover); text-decoration: none; }
.wiki-doc-card__desc { color: var(--wiki-fg-muted); margin: 0; }
.wiki-doc-card__meta { color: var(--wiki-fg-subtle); font-size: 13px; margin-top: auto; }
code { font-family: var(--wiki-font-mono); font-size: 0.92em; background: var(--wiki-bg-code); border: 1px solid var(--wiki-border); border-radius: 4px; padding: 1px 4px; }
pre { overflow-x: auto; background: var(--wiki-bg-code); border: 1px solid var(--wiki-border); border-radius: 8px; padding: var(--wiki-space-4); }
pre code { border: 0; padding: 0; background: transparent; }
hr { border: 0; border-top: 1px solid var(--wiki-border); margin: var(--wiki-space-6) 0; }

.wiki-sidebar__group:nth-of-type(1) .wiki-sidebar__group-title {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'/><rect width='20' height='14' x='2' y='6' rx='2'/></svg>");
}
.wiki-sidebar__group:nth-of-type(2) .wiki-sidebar__group-title {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10 2v8l3-3 3 3V2'/><path d='M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20'/></svg>");
}
.wiki-sidebar__group:nth-of-type(3) .wiki-sidebar__group-title {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='20' height='5' x='2' y='3' rx='1'/><path d='M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8'/><path d='M10 12h4'/></svg>");
}
.wiki-sidebar__group:nth-of-type(4) .wiki-sidebar__group-title {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 7v14'/><path d='M16 12h2'/><path d='M16 8h2'/><path d='M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z'/></svg>");
}
.wiki-sidebar__nav a[href$="projekte.html"],
.wiki-card__title a[href$="projekte.html"],
.wiki-card__links a[href$="projekte.html"],
.wiki-h1[data-icon="projekte"] {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'/></svg>");
}
.wiki-sidebar__nav a[href$="aufgaben.html"],
.wiki-card__links a[href$="aufgaben.html"],
.wiki-h1[data-icon="aufgaben"] {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m3 17 2 2 4-4'/><path d='m3 7 2 2 4-4'/><path d='M13 6h8'/><path d='M13 12h8'/><path d='M13 18h8'/></svg>");
}
.wiki-sidebar__nav a[href$="features.html"],
.wiki-card__title a[href$="features.html"],
.wiki-card__links a[href$="features.html"],
.wiki-h1[data-icon="features"] {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='7' height='7' x='14' y='3' rx='1'/><path d='M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3'/></svg>");
}
.wiki-sidebar__nav a[href$="use-cases.html"],
.wiki-card__links a[href$="use-cases.html"],
.wiki-h1[data-icon="use-cases"] {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='8' height='8' x='3' y='3' rx='2'/><path d='M7 11v4a2 2 0 0 0 2 2h4'/><rect width='8' height='8' x='13' y='13' rx='2'/></svg>");
}
.wiki-sidebar__nav a[href$="backlogs.html"],
.wiki-card__links a[href$="backlogs.html"],
.wiki-h1[data-icon="backlogs"] {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='8' x2='21' y1='6' y2='6'/><line x1='8' x2='21' y1='12' y2='12'/><line x1='8' x2='21' y1='18' y2='18'/><line x1='3' x2='3.01' y1='6' y2='6'/><line x1='3' x2='3.01' y1='12' y2='12'/><line x1='3' x2='3.01' y1='18' y2='18'/></svg>");
}
.wiki-sidebar__nav a[href$="nfrs.html"],
.wiki-card__links a[href$="nfrs.html"],
.wiki-h1[data-icon="nfrs"] {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'/><path d='m9 12 2 2 4-4'/></svg>");
}
.wiki-sidebar__nav a[href$="journal.html"],
.wiki-card__title a[href$="journal.html"],
.wiki-card__links a[href$="journal.html"],
.wiki-h1[data-icon="journal"] {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 7v14'/><path d='M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z'/></svg>");
}
.wiki-sidebar__nav a[href$="metadaten.html"],
.wiki-card__links a[href$="metadaten.html"],
.wiki-h1[data-icon="metadaten"] {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19'/><path d='M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414L8.29 18.29a2.426 2.426 0 0 0 3.42 0l3.58-3.58a2.426 2.426 0 0 0 0-3.42z'/><circle cx='6.5' cy='9.5' r='.5' fill='black'/></svg>");
}
.wiki-sidebar__nav a[href$="control-report.html"],
.wiki-h1[data-icon="control"] {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='8' height='4' x='8' y='2' rx='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><path d='m9 14 2 2 4-4'/></svg>");
}
.wiki-sidebar__nav a[href$="benutzerdokumentation.html"],
.wiki-card__title a[href$="benutzerdokumentation.html"],
.wiki-card__links a[href$="benutzerdokumentation.html"],
.wiki-h1[data-icon="user-docs"] {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 7v14'/><path d='M16 12h2'/><path d='M16 8h2'/><path d='M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z'/></svg>");
}
.wiki-card__title a::before {
  content: "";
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  background: var(--wiki-badge-icon-color, currentColor);
  -webkit-mask: var(--wiki-icon, none) center / 22px 22px no-repeat;
          mask: var(--wiki-icon, none) center / 22px 22px no-repeat;
}
.wiki-card__links a::before {
  content: "";
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  background: currentColor;
  -webkit-mask: var(--wiki-icon, none) center / 14px 14px no-repeat;
          mask: var(--wiki-icon, none) center / 14px 14px no-repeat;
  opacity: 0.75;
}
.wiki-badge::before {
  width: 12px;
  height: 12px;
  border-radius: 0;
  background: currentColor;
  -webkit-mask: var(--wiki-icon, none) center / 12px 12px no-repeat;
          mask: var(--wiki-icon, none) center / 12px 12px no-repeat;
  opacity: 1;
}
.wiki-badge--neutral,
.wiki-badge--offen {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/></svg>");
}
.wiki-badge--bearbeitung,
.wiki-badge--in-bearbeitung {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/></svg>");
}
.wiki-badge--blockiert {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><path d='m4.9 4.9 14.2 14.2'/></svg>");
}
.wiki-badge--abgeschlossen,
.wiki-badge--erledigt {
  --wiki-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'><path d='M20 6 9 17l-5-5'/></svg>");
}
.wiki-badge--plain::before { display: none; }
.wiki-sidebar-toggle { display: none; position: fixed; right: 16px; top: 16px; z-index: 10; border: 1px solid var(--wiki-border); background: var(--wiki-bg); border-radius: 6px; padding: 6px 10px; }
@media (max-width: 820px) {
  .wiki-app { grid-template-columns: 1fr; }
  .wiki-sidebar { position: fixed; z-index: 9; inset: 0 auto 0 0; width: 280px; transform: translateX(-100%); transition: transform 160ms ease; }
  .wiki-app.is-sidebar-open .wiki-sidebar { transform: translateX(0); }
  .wiki-sidebar-toggle { display: block; }
  .wiki-content { padding: 64px 20px 40px; }
  .wiki-h1 { font-size: 28px; }
  .wiki-relations__grid { grid-template-columns: 1fr; }
}
`);
}

function main() {
  registerStaticMappings();
  const index = loadIndex();
  const sources = collectSources();
  cleanOutputRoot();
  writeCss();
  writeText(outputAbs("index.html"), renderIndex(sources, index));
  renderOverviewPages(sources);
  renderMetadataPage(index);

  for (const group of [sources.projects, sources.tasks, sources.features, sources.useCases, sources.backlogs, sources.nfrs, sources.userDocs, sources.journal]) {
    for (const entity of group) {
      writeText(outputAbs(entity.outputRel), renderEntityPage(entity, sources));
    }
  }

  const report = validate(sources);
  writeText(outputAbs("control-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeText(outputAbs("control-report.html"), renderControlReport(report));

  const errorCount = report.errors.length;
  const warningCount = report.warnings.length;
  console.log(`Wiki HTML erzeugt: ${path.relative(repoRoot, siteRoot)}`);
  console.log(`Projekte: ${sources.projects.length}`);
  console.log(`Aufgaben: ${sources.tasks.length}`);
  console.log(`Features: ${sources.features.length}`);
  console.log(`Use Cases: ${sources.useCases.length}`);
  console.log(`Backlogs: ${sources.backlogs.length}`);
  console.log(`NFRs: ${sources.nfrs.length}`);
  console.log(`Benutzerdokumentation: ${sources.userDocs.length}`);
  console.log(`Journal: ${sources.journal.length}`);
  console.log(`Kontrolle: ${errorCount} Fehler, ${warningCount} Warnungsgruppen`);
  if (errorCount > 0) process.exitCode = 1;
}

main();
