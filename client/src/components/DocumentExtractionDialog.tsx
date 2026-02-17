import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";

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
  disableCustomerApply?: boolean;
  disableProjectApply?: boolean;
  customerApplyLabel?: string;
  projectApplyLabel?: string;
  onApplyCustomer: (customer: ExtractionCustomerDraft) => Promise<void>;
  onApplyProject: (payload: { saunaModel: string; articleListHtml: string; customer: ExtractionCustomerDraft }) => Promise<void>;
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

type EditableCustomerFields = {
  customerNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  postalCode: string;
  city: string;
};

export function DocumentExtractionDialog({
  open,
  onOpenChange,
  data,
  isBusy = false,
  disableCustomerApply = false,
  disableProjectApply = false,
  customerApplyLabel = "Kundendaten übernehmen",
  projectApplyLabel = "Projektdaten übernehmen",
  onApplyCustomer,
  onApplyProject,
}: DocumentExtractionDialogProps) {
  const [customerFields, setCustomerFields] = useState<EditableCustomerFields | null>(null);
  const [saunaModel, setSaunaModel] = useState("");
  const [articleListHtml, setArticleListHtml] = useState("");
  const [isApplyingCustomer, setIsApplyingCustomer] = useState(false);
  const [isApplyingProject, setIsApplyingProject] = useState(false);

  useEffect(() => {
    if (!data) {
      setCustomerFields(null);
      setSaunaModel("");
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

  const categorizedPreview = useMemo(() => data?.categorizedItems ?? [], [data]);

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

            <section className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Kundennummer</Label>
                  <Input
                    value={customerFields.customerNumber}
                    onChange={(event) => setCustomerFields({ ...customerFields, customerNumber: event.target.value })}
                    data-testid="input-doc-extract-customer-number"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Telefon</Label>
                  <Input
                    value={customerFields.phone}
                    onChange={(event) => setCustomerFields({ ...customerFields, phone: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Vorname</Label>
                  <Input
                    value={customerFields.firstName}
                    onChange={(event) => setCustomerFields({ ...customerFields, firstName: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nachname</Label>
                  <Input
                    value={customerFields.lastName}
                    onChange={(event) => setCustomerFields({ ...customerFields, lastName: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>E-Mail</Label>
                  <Input
                    value={customerFields.email}
                    onChange={(event) => setCustomerFields({ ...customerFields, email: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Straße</Label>
                  <Input
                    value={customerFields.addressLine1}
                    onChange={(event) => setCustomerFields({ ...customerFields, addressLine1: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>PLZ</Label>
                  <Input
                    value={customerFields.postalCode}
                    onChange={(event) => setCustomerFields({ ...customerFields, postalCode: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Ort</Label>
                  <Input
                    value={customerFields.city}
                    onChange={(event) => setCustomerFields({ ...customerFields, city: event.target.value })}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Projektdaten</h3>
              <div className="space-y-1">
                <Label>Projektname</Label>
                <Input
                  value={saunaModel}
                  onChange={(event) => setSaunaModel(event.target.value)}
                  data-testid="input-doc-extract-sauna-model"
                />
              </div>
              <div className="space-y-1">
                <Label>Artikelliste (semantisches HTML)</Label>
                <RichTextEditor
                  value={articleListHtml}
                  onChange={setArticleListHtml}
                  className="h-[520px] [&_[data-testid='richtext-editor']]:min-h-[460px] [&_[data-testid='richtext-editor']]:max-h-[460px] [&_[data-testid='richtext-editor']]:overflow-y-auto"
                />
              </div>
              <div className="rounded-md border border-border bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Kategorisierte Vorschau</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {categorizedPreview.map((category) => (
                    <li key={category.category}>
                      <strong>{category.category}</strong>
                      <ul className="list-disc ml-5 mt-1">
                        {category.items.map((item, index) => (
                          <li key={`${category.category}-${index}`}>{item.quantity} {item.description}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy || isApplyingCustomer || isApplyingProject}
          >
            Schließen
          </Button>
          <Button
            type="button"
            disabled={!customer || isBusy || isApplyingCustomer || isApplyingProject || disableCustomerApply}
            onClick={() => {
              if (!customer) return;
              setIsApplyingCustomer(true);
              void onApplyCustomer(customer).finally(() => setIsApplyingCustomer(false));
            }}
            data-testid="button-doc-extract-apply-customer"
          >
            {isApplyingCustomer ? "Übernehme..." : customerApplyLabel}
          </Button>
          <Button
            type="button"
            disabled={!customer || isBusy || isApplyingProject || isApplyingCustomer || disableProjectApply}
            onClick={() => {
              if (!customer) return;
              setIsApplyingProject(true);
              void onApplyProject({ saunaModel, articleListHtml, customer }).finally(() => setIsApplyingProject(false));
            }}
            data-testid="button-doc-extract-apply-project"
          >
            {isApplyingProject ? "Übernehme..." : projectApplyLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
