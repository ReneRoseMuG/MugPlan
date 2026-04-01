import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DocumentExtractionCustomerSection,
  type ExtractionCustomerEditableFields,
} from "@/components/document-extraction/DocumentExtractionCustomerSection";
import { DocumentExtractionProjectSection } from "@/components/document-extraction/DocumentExtractionProjectSection";

export type ExtractionCustomerDraft = {
  customerNumber: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country?: string | null;
};

export type ExtractionArticleItem = {
  quantity: string;
  description: string;
  category: string;
};

export type ExtractionCategory = {
  category: string;
  items: ExtractionArticleItem[];
};

export type ExtractionFieldReportRecognizedItem = {
  key: string;
  label: string;
  section: "customer" | "project";
  value: string;
};

export type ExtractionFieldReportMissingItem = {
  key: string;
  label: string;
  section: "customer" | "project";
  reason: string;
};

export type ExtractionFieldReport = {
  recognized: ExtractionFieldReportRecognizedItem[];
  missing: ExtractionFieldReportMissingItem[];
};

export type ExtractionDialogData = {
  customer: ExtractionCustomerDraft;
  orderNumber: string | null;
  amount: string | null;
  saunaModel: string;
  articleItems: ExtractionArticleItem[];
  categorizedItems: ExtractionCategory[];
  articleListHtml: string;
  fieldReport: ExtractionFieldReport;
  warnings: string[];
};

interface DocumentExtractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ExtractionDialogData | null;
  isBusy?: boolean;
  disableProjectApply?: boolean;
  disableCustomerApply?: boolean;
  projectApplyLabel?: string;
  customerApplyLabel?: string;
  dataApplyLabel?: string;
  showCustomerSection?: boolean;
  showProjectSection?: boolean;
  onApplyProject?: (payload: {
    saunaModel: string;
    orderNumber: string;
    amount: string;
    articleListHtml: string;
    customer: ExtractionCustomerDraft;
  }) => Promise<void>;
  onApplyCustomer?: (payload: { customer: ExtractionCustomerDraft }) => Promise<void>;
  onApplyData?: (payload: {
    saunaModel: string;
    orderNumber: string;
    amount: string;
    articleListHtml: string;
    customer: ExtractionCustomerDraft;
  }) => Promise<void>;
}

function toCustomerDraft(value: ExtractionCustomerDraft): ExtractionCustomerDraft {
  return {
    customerNumber: value.customerNumber,
    firstName: value.firstName,
    lastName: value.lastName,
    company: value.company,
    email: value.email,
    phone: value.phone,
    addressLine1: value.addressLine1,
    addressLine2: value.addressLine2,
    postalCode: value.postalCode,
    city: value.city,
    country: value.country ?? null,
  };
}

export function DocumentExtractionDialog({
  open,
  onOpenChange,
  data,
  isBusy = false,
  disableProjectApply = false,
  disableCustomerApply = false,
  projectApplyLabel = "Projektdaten übernehmen",
  customerApplyLabel = "Kundendaten übernehmen",
  dataApplyLabel = "Daten übernehmen",
  showCustomerSection = true,
  showProjectSection = true,
  onApplyProject,
  onApplyCustomer,
  onApplyData,
}: DocumentExtractionDialogProps) {
  const [customerFields, setCustomerFields] = useState<ExtractionCustomerEditableFields | null>(null);
  const [saunaModel, setSaunaModel] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [articleListHtml, setArticleListHtml] = useState("");
  const [isApplyingProject, setIsApplyingProject] = useState(false);
  const [isApplyingCustomer, setIsApplyingCustomer] = useState(false);
  const [isApplyingData, setIsApplyingData] = useState(false);

  useEffect(() => {
    if (!data) {
      setCustomerFields(null);
      setSaunaModel("");
      setOrderNumber("");
      setAmount("");
      setArticleListHtml("");
      return;
    }
    setCustomerFields({
      customerNumber: data.customer.customerNumber,
      firstName: data.customer.firstName ?? "",
      lastName: data.customer.lastName ?? "",
      company: data.customer.company ?? "",
      email: data.customer.email ?? "",
      phone: data.customer.phone ?? "",
      addressLine1: data.customer.addressLine1 ?? "",
      postalCode: data.customer.postalCode ?? "",
      city: data.customer.city ?? "",
      country: data.customer.country ?? "",
    });
    setSaunaModel(data.saunaModel);
    setOrderNumber(data.orderNumber ?? "");
    setAmount(data.amount ?? "");
    setArticleListHtml(data.articleListHtml);
  }, [data]);

  const customer = useMemo(() => {
    if (!customerFields || !data) return null;
    const fallback = toCustomerDraft(data.customer);
    return {
      ...fallback,
      ...customerFields,
      addressLine2: fallback.addressLine2,
    };
  }, [customerFields, data]);

  const payload = useMemo(() => {
    if (!customer) return null;
    return {
      saunaModel,
      orderNumber,
      amount,
      articleListHtml,
      customer,
    };
  }, [amount, articleListHtml, customer, orderNumber, saunaModel]);

  const disableActions = isBusy || isApplyingProject || isApplyingCustomer || isApplyingData;

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden bg-background"
      data-testid="document-extraction-overlay"
    >
      <div className="h-full p-4 sm:p-6">
        <div className="mx-auto flex h-full max-w-4xl flex-col rounded-lg border bg-card shadow-xl">
          <div className="flex items-center justify-end border-b px-4 py-3 sm:px-6">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={disableActions}
              data-testid="button-doc-extract-close"
              aria-label="Dokumentextraktion schließen"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {!data || !customerFields || !customer ? (
              <div className="text-sm text-muted-foreground">Keine Extraktionsdaten vorhanden.</div>
            ) : (
              <div className="space-y-6">
                {data.warnings.length > 0 ? (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    {data.warnings.map((warning, index) => (
                      <p key={`${warning}-${index}`}>{warning}</p>
                    ))}
                  </div>
                ) : null}

                {data.fieldReport.recognized.length > 0 ? (
                  <section
                    className="rounded-md border border-emerald-200 bg-emerald-50 p-3"
                    data-testid="document-extraction-report-recognized"
                  >
                    <h3 className="text-sm font-bold tracking-wider text-emerald-900">Erfolgreich erkannt</h3>
                    <div className="mt-3 space-y-2 text-sm text-emerald-950">
                      {data.fieldReport.recognized.map((item) => (
                        <div
                          key={`${item.section}-${item.key}`}
                          className="grid grid-cols-[minmax(0,180px)_1fr] gap-3"
                        >
                          <span className="font-medium">{item.label}</span>
                          <span className="break-words">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {data.fieldReport.missing.length > 0 ? (
                  <section
                    className="rounded-md border border-slate-300 bg-slate-50 p-3"
                    data-testid="document-extraction-report-missing"
                  >
                    <h3 className="text-sm font-bold tracking-wider text-slate-900">Nicht erkannt</h3>
                    <div className="mt-3 space-y-3 text-sm text-slate-800">
                      {data.fieldReport.missing.map((item) => (
                        <div key={`${item.section}-${item.key}`} className="space-y-1">
                          <p className="font-medium">{item.label}</p>
                          <p className="text-muted-foreground">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {showCustomerSection ? (
                  <DocumentExtractionCustomerSection
                    value={customerFields}
                    onChange={setCustomerFields}
                  />
                ) : null}

                {showProjectSection ? (
                  <DocumentExtractionProjectSection
                    saunaModel={saunaModel}
                    orderNumber={orderNumber}
                    amount={amount}
                    articleListHtml={articleListHtml}
                    onSaunaModelChange={setSaunaModel}
                    onOrderNumberChange={setOrderNumber}
                    onAmountChange={setAmount}
                    onArticleListHtmlChange={setArticleListHtml}
                  />
                ) : null}
              </div>
            )}
          </div>

          <div className="flex w-full flex-wrap items-center justify-end gap-2 border-t px-4 py-4 sm:px-6">
            {!onApplyData && onApplyCustomer && showCustomerSection ? (
              <Button
                type="button"
                disabled={!payload || disableActions || disableCustomerApply}
                onClick={() => {
                  if (!payload) return;
                  setIsApplyingCustomer(true);
                  void onApplyCustomer({ customer: payload.customer }).finally(() => setIsApplyingCustomer(false));
                }}
                data-testid="button-doc-extract-apply-customer"
              >
                {isApplyingCustomer ? "Übernehme..." : customerApplyLabel}
              </Button>
            ) : null}
            {!onApplyData && onApplyProject && showProjectSection ? (
              <Button
                type="button"
                disabled={!payload || disableActions || disableProjectApply}
                onClick={() => {
                  if (!payload) return;
                  setIsApplyingProject(true);
                  void onApplyProject(payload).finally(() => setIsApplyingProject(false));
                }}
                data-testid="button-doc-extract-apply-project"
              >
                {isApplyingProject ? "Übernehme..." : projectApplyLabel}
              </Button>
            ) : null}
            {onApplyData ? (
              <Button
                type="button"
                disabled={!payload || disableActions || disableProjectApply || disableCustomerApply}
                onClick={() => {
                  if (!payload) return;
                  setIsApplyingData(true);
                  void onApplyData(payload).finally(() => setIsApplyingData(false));
                }}
                data-testid="button-doc-extract-apply-data"
              >
                {isApplyingData ? "Übernehme..." : dataApplyLabel}
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={disableActions}>
              Abbrechen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
