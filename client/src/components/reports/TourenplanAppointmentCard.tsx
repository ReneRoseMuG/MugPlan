import React from "react";
import { renderSelectiveProjectArticleListSection } from "@/components/ui/project-article-description-renderer";
import type { TourenplanPrintMode, TourenplanResolvedAppointment } from "@/components/reports/tourenplan-model";
import {
  formatTourenplanEmployeeBadges,
  formatTourenplanHeaderDate,
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
  const articleSection = renderSelectiveProjectArticleListSection({
    articleItems: appointment.projectArticleItems,
    articleListOptions: { filter: "components", useShortCodes },
    articleListClassName: "list-disc pl-3 text-[10px] leading-[1.4] text-slate-600",
    testIdPrefix: testId,
  });

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
          gridTemplateColumns: "100px 1fr 1fr 1fr 90px",
          background: tagPresentation.headerBackground,
          color: tagPresentation.headerTextColor,
        }}
      >
        <div style={{ ...headerCellStyle(tagPresentation.headerDividerColor), color: tagPresentation.dateTextColor, fontWeight: 600 }}>
          {formatTourenplanHeaderDate(appointment)}
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
        style={{ gridTemplateColumns: "100px 1fr 1fr 1fr 90px" }}
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
          {articleSection ?? "—"}
        </div>
        <div style={bodyCellStyle()}>
          {formatTourenplanProjectDescription(appointment.projectDescription)}
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

      {appointment.printNotes.length > 0 ? (
        <div
          className="flex gap-1.5 border-t border-slate-200 px-2 py-1.5"
          style={{ background: printMode === "farbdruck" ? "#f8fafc" : "#ffffff" }}
        >
          {appointment.printNotes.map((note) => {
            const color = note.cardColor?.trim() || "#94a3b8";
            return (
              <div
                key={note.id}
                className="min-w-0 flex-1 rounded-[5px] border px-1.5 py-1"
                style={{
                  borderColor: color,
                  background: printMode === "farbdruck" ? `${color}1a` : "#ffffff",
                }}
              >
                <div className="mb-0.5 text-[9px] font-medium" style={{ color }}>
                  {note.title}
                </div>
                <div className="text-[9px] leading-[1.4] text-slate-500">
                  {stripHtmlToText(note.body) || "—"}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}
