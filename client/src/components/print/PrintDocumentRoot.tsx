import React from "react";
import { createPortal } from "react-dom";

type PrintDocumentRootProps<TPage> = {
  pages: readonly TPage[];
  renderPage: (page: TPage, index: number) => React.ReactNode;
  getPageKey?: (page: TPage, index: number) => React.Key;
  pageOrientation?: "portrait" | "landscape";
};

export function PrintDocumentRoot<TPage>({
  pages,
  renderPage,
  getPageKey,
  pageOrientation = "landscape",
}: PrintDocumentRootProps<TPage>) {
  const portalTarget = typeof document !== "undefined" ? document.body : null;
  if (!portalTarget || pages.length === 0) return null;

  return createPortal(
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4 ${pageOrientation};
              margin: 0;
            }
          }
        `}
      </style>
      <div className="hidden" data-testid="print-document-root">
        {pages.map((page, index) => (
          <div
            key={getPageKey ? getPageKey(page, index) : index}
            data-testid="print-document-page"
          >
            {renderPage(page, index)}
          </div>
        ))}
      </div>
    </>,
    portalTarget,
  );
}
