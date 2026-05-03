import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useStandaloneMode", () => ({
  useStandaloneMode: () => true,
}));

vi.mock("@/providers/ChangeNotificationsProvider", () => ({
  useChangeNotificationsContext: () => ({
    updatesAvailable: false,
    isReloadDisabled: false,
    isReloadPending: false,
    triggerGlobalReload: vi.fn(),
  }),
}));

import StandaloneLayout from "../../../client/src/components/StandaloneLayout";
import { ListLayout } from "../../../client/src/components/ui/list-layout";

describe("standalone and list layout surfaces", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders standalone non-calendar views flat with a navigation-colored header", () => {
    const markup = renderToStaticMarkup(
      <StandaloneLayout title="Projekte">
        <ListLayout
          title="Projekte"
          icon={<span />}
          contentSlot={<section className="rounded-lg border shadow-sm">Inhalt</section>}
        />
      </StandaloneLayout>,
    );

    expect(markup).toContain("bg-slate-50 px-4");
    expect(markup).toContain("bg-white [&amp;&gt;*]:!h-full [&amp;&gt;*]:!rounded-none [&amp;&gt;*]:!border-0 [&amp;&gt;*]:!shadow-none");
    expect(markup.match(/Projekte/g)).toHaveLength(1);
    expect(markup).not.toContain("text-lg font-bold tracking-wider text-primary");
    expect(markup).not.toContain("overflow-hidden p-4");
  });

  it("keeps calendar standalone headers on the default tone", () => {
    const markup = renderToStaticMarkup(
      <StandaloneLayout title="Wochenübersicht" headerTone="default">
        <section>Kalender</section>
      </StandaloneLayout>,
    );

    expect(markup).toContain("border-b border-border bg-white px-4");
    expect(markup).toContain("text-slate-500 hover:bg-slate-100 hover:text-slate-900");
    expect(markup).not.toContain("border-b border-border bg-slate-50 px-4");
  });

  it("uses the navigation background for common non-calendar list headers and footers", () => {
    const markup = renderToStaticMarkup(
      <ListLayout
        title="Termine"
        icon={<span />}
        filterSlot={<div>Filter</div>}
        footerSlot={<div>Footer</div>}
        contentSlot={<div>Content</div>}
      />,
    );

    expect(markup).toContain("border-b border-border bg-slate-50 pb-4");
    expect(markup).toContain("border-t border-border bg-slate-50 px-6 py-4");
    expect(markup).not.toContain("px-6 py-4 bg-card");
  });
});
