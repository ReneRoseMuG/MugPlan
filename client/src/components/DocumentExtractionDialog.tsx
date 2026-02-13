import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

export function DocumentExtractionDialog({
  open,
  onOpenChange,
  data,
  isBusy = false,
  disableCustomerApply = false,
  disableProjectApply = false,
  customerApplyLabel = "Kunde übernehmen",
  projectApplyLabel = "Projekt übernehmen",
  onApplyCustomer,
  onApplyProject,
}: DocumentExtractionDialogProps) {
  const [customer, setCustomer] = useState<ExtractionCustomerDraft | null>(null);
  const [saunaModel, setSaunaModel] = useState("");
  const [articleListHtml, setArticleListHtml] = useState("");
  const [isApplyingCustomer, setIsApplyingCustomer] = useState(false);
  const [isApplyingProject, setIsApplyingProject] = useState(false);

  useEffect(() => {
    if (!data) {
      setCustomer(null);
      setSaunaModel("");
      setArticleListHtml("");
      return;
    }
    setCustomer(toCustomerDraft(data.customer));
    setSaunaModel(data.saunaModel);
    setArticleListHtml(data.articleListHtml);
  }, [data]);

  const categorizedPreview = useMemo(() => data?.categorizedItems ?? [], [data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dokumentenextraktion</DialogTitle>
          <DialogDescription>
            Prüfen Sie die extrahierten Daten und übernehmen Sie Kunde und Projektvorschlag getrennt.
          </DialogDescription>
        </DialogHeader>

        {!data || !customer ? (
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Kundendaten</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Kundennummer</Label>
                  <Input
                    value={customer.customerNumber}
                    onChange={(event) => setCustomer({ ...customer, customerNumber: event.target.value })}
                    data-testid="input-doc-extract-customer-number"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Telefon</Label>
                  <Input
                    value={customer.phone}
                    onChange={(event) => setCustomer({ ...customer, phone: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Vorname</Label>
                  <Input
                    value={customer.firstName}
                    onChange={(event) => setCustomer({ ...customer, firstName: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nachname</Label>
                  <Input
                    value={customer.lastName}
                    onChange={(event) => setCustomer({ ...customer, lastName: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Firma</Label>
                  <Input
                    value={customer.company}
                    onChange={(event) => setCustomer({ ...customer, company: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>E-Mail</Label>
                  <Input
                    value={customer.email}
                    onChange={(event) => setCustomer({ ...customer, email: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Straße</Label>
                  <Input
                    value={customer.addressLine1}
                    onChange={(event) => setCustomer({ ...customer, addressLine1: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Adresszusatz</Label>
                  <Input
                    value={customer.addressLine2}
                    onChange={(event) => setCustomer({ ...customer, addressLine2: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>PLZ</Label>
                  <Input
                    value={customer.postalCode}
                    onChange={(event) => setCustomer({ ...customer, postalCode: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Ort</Label>
                  <Input
                    value={customer.city}
                    onChange={(event) => setCustomer({ ...customer, city: event.target.value })}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Projektvorschlag</h3>
              <div className="space-y-1">
                <Label>Saunamodell (Titelvorschlag)</Label>
                <Input
                  value={saunaModel}
                  onChange={(event) => setSaunaModel(event.target.value)}
                  data-testid="input-doc-extract-sauna-model"
                />
              </div>
              <div className="space-y-1">
                <Label>Artikelliste (semantisches HTML)</Label>
                <Textarea
                  value={articleListHtml}
                  onChange={(event) => setArticleListHtml(event.target.value)}
                  rows={10}
                  data-testid="textarea-doc-extract-article-html"
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
            variant="secondary"
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
