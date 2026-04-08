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
      <div
        aria-hidden="true"
        data-testid="print-document-root"
        style={{
          position: "fixed",
          left: "-200vw",
          top: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        {pages.map((page, index) => (
          <div
            key={getPageKey ? getPageKey(page, index) : index}
            data-testid="print-document-page"
          >
            <div
              data-print-page-shell="true"
              style={{
                display: "flex",
                minHeight: "100%",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "16px",
                boxSizing: "border-box",
              }}
            >
              {renderPage(page, index)}
            </div>
          </div>
        ))}
      </div>
    </>,
    portalTarget,
  );
}
