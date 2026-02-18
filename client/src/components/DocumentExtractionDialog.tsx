import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DocumentExtractionCustomerSection,
  type ExtractionCustomerEditableFields,
} from "@/components/document-extraction/DocumentExtractionCustomerSection";
import { DocumentExtractionProjectSection } from "@/components/document-extraction/DocumentExtractionProjectSection";

export type ExtractionCustomerDraft = {
  customerNumber: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
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

export type ExtractionDialogData = {
  customer: ExtractionCustomerDraft;
  orderNumber: string | null;
  saunaModel: string;
  articleItems: ExtractionArticleItem[];
  categorizedItems: ExtractionCategory[];
  articleListHtml: string;
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
    articleListHtml: string;
    customer: ExtractionCustomerDraft;
  }) => Promise<void>;
  onApplyCustomer?: (payload: { customer: ExtractionCustomerDraft }) => Promise<void>;
  onApplyData?: (payload: {
    saunaModel: string;
    orderNumber: string;
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
  const [articleListHtml, setArticleListHtml] = useState("");
  const [isApplyingProject, setIsApplyingProject] = useState(false);
  const [isApplyingCustomer, setIsApplyingCustomer] = useState(false);
  const [isApplyingData, setIsApplyingData] = useState(false);

  useEffect(() => {
    if (!data) {
      setCustomerFields(null);
      setSaunaModel("");
      setOrderNumber("");
      setArticleListHtml("");
      return;
    }
    setCustomerFields({
      customerNumber: data.customer.customerNumber,
      firstName: data.customer.firstName,
      lastName: data.customer.lastName,
      email: data.customer.email,
      phone: data.customer.phone,
      addressLine1: data.customer.addressLine1,
      postalCode: data.customer.postalCode,
      city: data.customer.city,
    });
    setSaunaModel(data.saunaModel);
    setOrderNumber(data.orderNumber ?? "");
    setArticleListHtml(data.articleListHtml);
  }, [data]);

  const customer = useMemo(() => {
    if (!customerFields || !data) return null;
    const fallback = toCustomerDraft(data.customer);
    return {
      ...fallback,
      ...customerFields,
      company: fallback.company,
      addressLine2: fallback.addressLine2,
    };
  }, [customerFields, data]);

  const payload = useMemo(() => {
    if (!customer) return null;
    return {
      saunaModel,
      orderNumber,
      articleListHtml,
      customer,
    };
  }, [articleListHtml, customer, orderNumber, saunaModel]);

  const disableActions = isBusy || isApplyingProject || isApplyingCustomer || isApplyingData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

            {showCustomerSection ? (
              <DocumentExtractionCustomerSection
                value={customerFields}
                onChange={setCustomerFields}
                action={
                  !onApplyData && onApplyCustomer ? (
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
                  ) : undefined
                }
              />
            ) : null}

            {showProjectSection ? (
              <DocumentExtractionProjectSection
                saunaModel={saunaModel}
                orderNumber={orderNumber}
                articleListHtml={articleListHtml}
                onSaunaModelChange={setSaunaModel}
                onOrderNumberChange={setOrderNumber}
                onArticleListHtmlChange={setArticleListHtml}
                action={
                  !onApplyData && onApplyProject ? (
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
                  ) : undefined
                }
              />
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={disableActions}>
            Schließen
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
