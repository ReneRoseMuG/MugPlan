import React from "react";
import { renderSelectiveProjectArticleListSection } from "@/components/ui/project-article-description-renderer";
import type { TourenplanPrintMode, TourenplanResolvedAppointment } from "@/components/reports/tourenplan-model";
import {
  formatTourenplanEmployeeBadges,
  formatTourenplanDate,
  formatTourenplanLocationLines,
  formatTourenplanProjectDescription,
  resolveTourenplanTagPresentation,
} from "@/components/reports/tourenplan-model";
import { stripHtmlToText } from "@/lib/tour-print-preview";

type TourenplanAppointmentCardProps = {
  appointment: TourenplanResolvedAppointment;
  printMode: TourenplanPrintMode;
  useShortCodes: boolean;
  dataKwStart?: string;
  testId?: string;
};

const TOURENPLAN_CARD_GRID_COLUMNS = "132px 164px minmax(0, 1.3fr) minmax(0, 1fr) 92px";

function headerCellStyle(borderColor: string) {
  return {
    padding: "6px 8px",
    borderRight: `0.5px solid ${borderColor}`,
  } as const;
}

function bodyCellStyle() {
  return {
    padding: "5px 8px",
    borderRight: "0.5px solid #e2e8f0",
    fontSize: "10px",
    lineHeight: 1.4,
    color: "#475569",
  } as const;
}

export function TourenplanAppointmentCard({
  appointment,
  printMode,
  useShortCodes,
  dataKwStart,
  testId,
}: TourenplanAppointmentCardProps) {
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
  const noteEntries = appointment.printNotes.map((note) => ({
    ...note,
    title: note.title?.trim() || null,
    body: stripHtmlToText(note.body),
  }));
  const hasNotesColumnContent = hasProjectDescription || noteEntries.some((note) => note.title || note.body.length > 0);

  return (
    <article
      className="overflow-hidden rounded-[7px] border-[1.5px] border-solid bg-white"
      data-kw-start={dataKwStart}
      data-testid={testId}
      data-tourenplan-tag-kind={tagPresentation.kind}
      data-tourenplan-print-mode={printMode}
      style={{ borderColor: tagPresentation.borderColor }}
    >
      <div
        className="grid text-[11px] font-medium"
        style={{
          gridTemplateColumns: TOURENPLAN_CARD_GRID_COLUMNS,
          background: tagPresentation.headerBackground,
          color: tagPresentation.headerTextColor,
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
        <div style={headerCellStyle(tagPresentation.headerDividerColor)}>{appointment.customer.fullName ?? "—"}</div>
        <div style={headerCellStyle(tagPresentation.headerDividerColor)}>{appointment.projectName?.trim() || "—"}</div>
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
        <div style={bodyCellStyle()}>
          {tagPresentation.label ? (
            <span
              className="inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold"
              style={{
                background: tagPresentation.pillBackground ?? "transparent",
                color: tagPresentation.pillTextColor ?? "#475569",
              }}
            >
              {tagPresentation.label}
            </span>
          ) : "—"}
        </div>
        <div style={bodyCellStyle()}>
          {locationLines.length > 0 ? (
            locationLines.map((line) => (
              <div key={`${appointment.id}-${line}`}>{line}</div>
            ))
          ) : "—"}
        </div>
        <div style={bodyCellStyle()}>
          <div className="min-w-0">
            {articleSection ?? "—"}
          </div>
        </div>
        <div style={bodyCellStyle()}>
          {hasNotesColumnContent ? (
            <div className="space-y-1">
              {hasProjectDescription ? (
                <div className="whitespace-pre-wrap text-[10px] leading-[1.4] text-slate-600">
                  {projectDescription}
                </div>
              ) : null}
              {noteEntries.map((note) => {
                if (!note.title && note.body.length === 0) {
                  return null;
                }

                return (
                  <div key={note.id} className="border-t border-slate-200 pt-1 first:border-t-0 first:pt-0">
                    {note.title ? (
                      <div className="text-[9px] font-semibold" style={{ color: note.cardColor?.trim() || "#475569" }}>
                        {note.title}
                      </div>
                    ) : null}
                    <div className="whitespace-pre-wrap text-[9px] leading-[1.4] text-slate-500">
                      {note.body || "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : "—"}
        </div>
        <div style={{ ...bodyCellStyle(), borderRight: "none" }}>
          {employeeBadges.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {employeeBadges.map((badge) => (
                <span
                  key={`${appointment.id}-${badge}`}
                  className="inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold"
                  style={
                    printMode === "farbdruck"
                      ? { background: "#1e293b", color: "#f1f5f9" }
                      : { background: "#ffffff", color: "#0f172a", border: "0.5px solid #94a3b8" }
                  }
                >
                  {badge}
                </span>
              ))}
            </div>
          ) : "—"}
        </div>
      </div>

    </article>
  );
}
