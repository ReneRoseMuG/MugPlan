import React from "react";
import { renderSelectiveProjectArticleListSection } from "@/components/ui/project-article-description-renderer";
import type { TourenplanFontSize, TourenplanPrintMode, TourenplanResolvedAppointment } from "@/components/reports/tourenplan-model";
import {
  formatTourenplanDate,
  formatTourenplanEmployeeBadges,
  formatTourenplanLocationLines,
  formatTourenplanProjectDescription,
  resolveTourenplanTagPresentation,
} from "@/components/reports/tourenplan-model";
import { stripHtmlToText } from "@/lib/printText";

type TourenplanAppointmentCardProps = {
  appointment: TourenplanResolvedAppointment;
  printMode: TourenplanPrintMode;
  fontSize: TourenplanFontSize;
  useShortCodes: boolean;
  dataKwStart?: string;
  testId?: string;
};

const TOURENPLAN_CARD_GRID_COLUMNS = "132px 148px minmax(0, 1.7fr) minmax(0, 0.8fr) 92px";
const EXACT_PRINT_COLOR_STYLE = {
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
} as const;
const TOURENPLAN_FONT_SIZE_PRESETS = {
  small: {
    headerFontSizePx: 10,
    bodyFontSizePx: 9,
    bodyLineHeight: 1.35,
    noteFontSizePx: 8,
    badgeFontSizePx: 8,
    pillFontSizePx: 8,
  },
  medium: {
    headerFontSizePx: 11,
    bodyFontSizePx: 10,
    bodyLineHeight: 1.4,
    noteFontSizePx: 9,
    badgeFontSizePx: 9,
    pillFontSizePx: 9,
  },
  large: {
    headerFontSizePx: 12,
    bodyFontSizePx: 11,
    bodyLineHeight: 1.45,
    noteFontSizePx: 10,
    badgeFontSizePx: 10,
    pillFontSizePx: 10,
  },
} as const;

function headerCellStyle(borderColor: string) {
  return {
    padding: "6px 8px",
    borderRight: `0.5px solid ${borderColor}`,
  } as const;
}

function bodyCellStyle(fontSize: TourenplanFontSize) {
  const preset = TOURENPLAN_FONT_SIZE_PRESETS[fontSize];
  return {
    padding: "5px 8px",
    borderRight: "0.5px solid #e2e8f0",
    fontSize: `${preset.bodyFontSizePx}px`,
    lineHeight: preset.bodyLineHeight,
    color: "#475569",
  } as const;
}

export function TourenplanAppointmentCard({
  appointment,
  printMode,
  fontSize,
  useShortCodes,
  dataKwStart,
  testId,
}: TourenplanAppointmentCardProps) {
  const preset = TOURENPLAN_FONT_SIZE_PRESETS[fontSize];
  const tagPresentation = resolveTourenplanTagPresentation(appointment, printMode);
  const locationLines = formatTourenplanLocationLines(appointment.customer);
  const employeeBadges = formatTourenplanEmployeeBadges(appointment.employees);
  const projectDescription = formatTourenplanProjectDescription(appointment.projectDescription);
  const hasProjectDescription = stripHtmlToText(appointment.projectDescription).length > 0;
  const articleSection = renderSelectiveProjectArticleListSection({
    articleItems: appointment.projectArticleItems,
    articleListOptions: { filter: "components", useShortCodes },
    articleListClassName: "list-disc pl-3 text-[10px] leading-[1.4] text-slate-600",
    testIdPrefix: testId,
  });
  const visibleNoteEntries = appointment.printNotes
    .map((note) => ({
      ...note,
      title: note.title?.trim() || null,
      body: stripHtmlToText(note.body),
    }))
    .filter((note) => note.title || note.body.length > 0);

  return (
    <article
      className="overflow-hidden rounded-[7px] border-[1.5px] border-solid bg-white"
      data-kw-start={dataKwStart}
      data-testid={testId}
      data-tourenplan-tag-kind={tagPresentation.kind}
      data-tourenplan-print-mode={printMode}
      data-tourenplan-font-size={fontSize}
      style={{ ...EXACT_PRINT_COLOR_STYLE, borderColor: tagPresentation.borderColor }}
    >
      <div
        className="grid font-medium"
        style={{
          gridTemplateColumns: TOURENPLAN_CARD_GRID_COLUMNS,
          background: tagPresentation.headerBackground,
          color: tagPresentation.headerTextColor,
          fontSize: `${preset.headerFontSizePx}px`,
          ...EXACT_PRINT_COLOR_STYLE,
        }}
      >
        <div
          style={{
            ...headerCellStyle(tagPresentation.headerDividerColor),
            color: tagPresentation.dateTextColor,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {`${formatTourenplanDate(appointment.startDate)} | ${appointment.durationDays} ${appointment.durationDays === 1 ? "Tag" : "Tage"}`}
        </div>
        <div style={headerCellStyle(tagPresentation.headerDividerColor)}>{appointment.customer.fullName ?? "-"}</div>
        <div style={headerCellStyle(tagPresentation.headerDividerColor)}>{appointment.projectName?.trim() || "-"}</div>
        <div style={headerCellStyle(tagPresentation.headerDividerColor)}>Anmerkungen</div>
        <div style={{ padding: "6px 8px" }}>Mitarbeiter</div>
      </div>

      {printMode === "spardruck" ? (
        <div className="h-px bg-slate-200" data-testid={testId ? `${testId}-header-separator` : undefined} />
      ) : null}

      <div
        className="grid bg-white"
        style={{ gridTemplateColumns: TOURENPLAN_CARD_GRID_COLUMNS }}
      >
        <div style={bodyCellStyle(fontSize)}>
          {tagPresentation.label ? (
            <span
              className="inline-block rounded px-1.5 py-0.5 font-semibold"
              style={{
                background: tagPresentation.pillBackground ?? "transparent",
                color: tagPresentation.pillTextColor ?? "#475569",
                fontSize: `${preset.pillFontSizePx}px`,
                ...EXACT_PRINT_COLOR_STYLE,
              }}
            >
              {tagPresentation.label}
            </span>
          ) : null}
        </div>
        <div style={bodyCellStyle(fontSize)}>
          {locationLines.length > 0 ? (
            locationLines.map((line) => (
              <div key={`${appointment.id}-${line}`}>{line}</div>
            ))
          ) : "-"}
        </div>
        <div style={bodyCellStyle(fontSize)}>
          <div className="min-w-0">
            {articleSection ?? "-"}
          </div>
        </div>
        <div style={bodyCellStyle(fontSize)}>
          {hasProjectDescription ? (
            <div
              className="whitespace-pre-wrap text-slate-600"
              style={{ fontSize: `${preset.bodyFontSizePx}px`, lineHeight: preset.bodyLineHeight }}
            >
              {projectDescription}
            </div>
          ) : "-"}
        </div>
        <div style={{ ...bodyCellStyle(fontSize), borderRight: "none" }}>
          {employeeBadges.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {employeeBadges.map((badge) => (
                <span
                  key={`${appointment.id}-${badge}`}
                  className="inline-block rounded px-1.5 py-0.5"
                  style={
                    printMode === "farbdruck"
                      ? {
                          background: "#1e293b",
                          color: "#f1f5f9",
                          fontSize: `${preset.badgeFontSizePx}px`,
                          fontWeight: 700,
                          ...EXACT_PRINT_COLOR_STYLE,
                        }
                      : {
                          background: "#ffffff",
                          color: "#0f172a",
                          border: "0.5px solid #94a3b8",
                          fontSize: `${preset.badgeFontSizePx}px`,
                          fontWeight: 700,
                          ...EXACT_PRINT_COLOR_STYLE,
                        }
                  }
                >
                  {badge}
                </span>
              ))}
            </div>
          ) : "-"}
        </div>
      </div>

      {visibleNoteEntries.length > 0 ? (
        <div
          className="grid gap-1.5 border-t border-slate-200 px-2 py-1.5"
          style={{
            background: printMode === "farbdruck" ? "#f8fafc" : "#ffffff",
            ...EXACT_PRINT_COLOR_STYLE,
          }}
        >
          {visibleNoteEntries.map((note) => {
            const color = note.cardColor?.trim() || "#94a3b8";
            return (
              <div
                key={note.id}
                className="rounded-[5px] border px-2 py-1.5"
                style={{
                  borderColor: color,
                  background: printMode === "farbdruck" ? `${color}14` : "#ffffff",
                  ...EXACT_PRINT_COLOR_STYLE,
                }}
              >
                {note.title ? (
                  <div
                    className="mb-0.5 font-semibold"
                    style={{ color, fontSize: `${preset.noteFontSizePx}px` }}
                  >
                    {note.title}
                  </div>
                ) : null}
                <div
                  className="whitespace-pre-wrap text-slate-600"
                  style={{ fontSize: `${preset.noteFontSizePx}px`, lineHeight: preset.bodyLineHeight }}
                >
                  {note.body || "-"}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}
