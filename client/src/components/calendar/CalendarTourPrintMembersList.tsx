import React from "react";

type CalendarTourPrintMembersListProps = {
  members: { id: number; fullName: string }[];
};

export function CalendarTourPrintMembersList({ members }: CalendarTourPrintMembersListProps) {
  return (
    <section className="space-y-3" data-testid="tour-print-members-section">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Geplante Mitarbeiter</p>
      </div>
      <div className="flex flex-wrap gap-2" data-testid="tour-print-members">
        {members.map((member) => (
          <span
            key={member.id}
            className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-800"
          >
            {member.fullName}
          </span>
        ))}
        {members.length === 0 ? <span className="text-sm text-slate-500">Keine Tour-Mitglieder</span> : null}
      </div>
    </section>
  );
}
