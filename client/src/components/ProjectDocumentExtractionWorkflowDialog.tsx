import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import type { Customer } from "@shared/schema";
import {
  DialogBaseFooter,
  DialogBaseInlineMessage,
  DialogBaseShell,
  DialogBaseStepper,
  type DialogBaseStep,
} from "@/components/ui/dialog-base";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DocumentExtractionCustomerSection,
  type ExtractionCustomerEditableFields,
} from "@/components/document-extraction/DocumentExtractionCustomerSection";
import { DocumentExtractionProjectSection } from "@/components/document-extraction/DocumentExtractionProjectSection";
import type { ExtractionCustomerDraft, ExtractionDialogData } from "@/components/DocumentExtractionDialog";

export type DocumentExtractionCustomerResolution =
  | { resolution: "none"; count: 0; customer: null }
  | { resolution: "single"; count: 1; customer: Customer }
  | { resolution: "multiple"; count: number; customer: null };

export type ProjectDocumentExtractionWorkflowResult = {
  saunaModel: string;
  orderNumber: string;
  amount: string;
  articleListHtml: string;
  customer: ExtractionCustomerDraft;
  customerId: number;
  resolvedCustomer: Customer;
  appendDocumentText: boolean;
  acceptMissingArticleListAsReklamation: boolean;
  createReklamationNote: boolean;
  articleListReviewed: boolean;
};

type CustomerBackfillKey =
  | "firstName"
  | "lastName"
  | "company"
  | "email"
  | "phone"
  | "addressLine1"
  | "addressLine2"
  | "postalCode"
  | "city"
  | "country";

export type CustomerBackfillUpdatePayload = Partial<Record<CustomerBackfillKey, string | null>>;

const customerBackfillLabels: Record<CustomerBackfillKey, string> = {
  firstName: "Vorname",
  lastName: "Nachname",
  company: "Firma",
  email: "E-Mail",
  phone: "Telefon",
  addressLine1: "Straße",
  addressLine2: "Adresszusatz",
  postalCode: "PLZ",
  city: "Ort",
  country: "Land",
};

function normalizeBackfillValue(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isBlankCustomerField(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

export function buildCustomerBackfillUpdatePayload(
  existingCustomer: Pick<Customer, CustomerBackfillKey>,
  extractedCustomer: ExtractionCustomerDraft,
): CustomerBackfillUpdatePayload {
  const update: CustomerBackfillUpdatePayload = {};
  const keys: CustomerBackfillKey[] = [
    "firstName",
    "lastName",
    "company",
    "email",
    "phone",
    "addressLine1",
    "addressLine2",
    "postalCode",
    "city",
    "country",
  ];

  for (const key of keys) {
    const incoming = normalizeBackfillValue(extractedCustomer[key]);
    if (!incoming) continue;
    if (!isBlankCustomerField(existingCustomer[key])) continue;
    update[key] = incoming;
  }

  return update;
}

function buildCustomerBackfillLabelText(existingCustomer: Customer, extractedCustomer: ExtractionCustomerDraft): string | null {
  const update = buildCustomerBackfillUpdatePayload(existingCustomer, extractedCustomer);
  const labels = (Object.keys(update) as CustomerBackfillKey[]).map((key) => customerBackfillLabels[key]);
  return labels.length > 0 ? labels.join(", ") : null;
}

type StepId = "project" | "customer" | "articles" | "summary";

type ProjectDocumentExtractionWorkflowDialogProps = {
  open: boolean;
  data: ExtractionDialogData | null;
  isBusy?: boolean;
  canCreateCustomer: boolean;
  onApply: (result: ProjectDocumentExtractionWorkflowResult) => Promise<void>;
  onCreateCustomer: (customer: ExtractionCustomerDraft) => Promise<Customer>;
  onUpdateExistingCustomer?: (existingCustomer: Customer, extractedCustomer: ExtractionCustomerDraft) => Promise<Customer>;
  onOpenChange: (open: boolean) => void;
  onResolveCustomerByNumber: (customerNumber: string) => Promise<DocumentExtractionCustomerResolution>;
  onValidateProject?: (project: { orderNumber: string }) => Promise<boolean>;
};

const stepTitles: Record<StepId, string> = {
  project: "Projekt",
  customer: "Kunde",
  articles: "Mängel",
  summary: "Abschluss",
};

function toEditableCustomer(value: ExtractionCustomerDraft): ExtractionCustomerEditableFields {
  return {
    customerNumber: value.customerNumber ?? "",
    firstName: value.firstName ?? "",
    lastName: value.lastName ?? "",
    company: value.company ?? "",
    email: value.email ?? "",
    phone: value.phone ?? "",
    addressLine1: value.addressLine1 ?? "",
    postalCode: value.postalCode ?? "",
    city: value.city ?? "",
    country: value.country ?? "",
  };
}

function toCustomerDraft(value: ExtractionCustomerEditableFields, fallback: ExtractionCustomerDraft): ExtractionCustomerDraft {
  return {
    ...fallback,
    customerNumber: value.customerNumber.trim(),
    firstName: value.firstName.trim() || null,
    lastName: value.lastName.trim() || null,
    company: value.company.trim() || null,
    email: value.email.trim() || null,
    phone: value.phone.trim() || null,
    addressLine1: value.addressLine1.trim() || null,
    addressLine2: fallback.addressLine2 ?? null,
    postalCode: value.postalCode.trim() || null,
    city: value.city.trim() || null,
    country: value.country.trim() || null,
  };
}

export function ProjectDocumentExtractionWorkflowDialog({
  open,
  data,
  isBusy = false,
  canCreateCustomer,
  onApply,
  onCreateCustomer,
  onUpdateExistingCustomer,
  onOpenChange,
  onResolveCustomerByNumber,
  onValidateProject,
}: ProjectDocumentExtractionWorkflowDialogProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [customerFields, setCustomerFields] = useState<ExtractionCustomerEditableFields | null>(null);
  const [saunaModel, setSaunaModel] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [articleListHtml, setArticleListHtml] = useState("");
  const [appendDocumentText, setAppendDocumentText] = useState(false);
  const [acceptMissingArticleListAsReklamation, setAcceptMissingArticleListAsReklamation] = useState(false);
  const [createReklamationNote, setCreateReklamationNote] = useState(true);
  const [customerResolution, setCustomerResolution] = useState<DocumentExtractionCustomerResolution | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [isResolvingCustomer, setIsResolvingCustomer] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const issueItems = data?.fieldReport.issues ?? [];
  const missingArticleList = Boolean(
    data && (
      data.articleItems.length === 0
      || articleListHtml.trim().length === 0
      || issueItems.some((item) => item.key === "articleListMissing")
    ),
  );

  useEffect(() => {
    if (!open || !data) return;
    setActiveStepIndex(0);
    setCustomerFields(toEditableCustomer(data.customer));
    setSaunaModel(data.saunaModel);
    setOrderNumber(data.orderNumber ?? "");
    setAmount(data.amount ?? "");
    setArticleListHtml(data.articleListHtml ?? "");
    setAppendDocumentText(false);
    setAcceptMissingArticleListAsReklamation(
      data.articleItems.length === 0
      || (data.articleListHtml ?? "").trim().length === 0
      || (data.fieldReport.issues ?? []).some((item) => item.key === "articleListMissing"),
    );
    setCreateReklamationNote(true);
    setCustomerResolution(null);
    setCustomerError(null);
  }, [data, open]);

  const customer = useMemo(() => {
    if (!data || !customerFields) return null;
    return toCustomerDraft(customerFields, data.customer);
  }, [customerFields, data]);

  const steps = useMemo<DialogBaseStep[]>(() => {
    const ids: StepId[] = ["project", "customer", "articles", "summary"];
    return ids.map((id, index) => ({
      id,
      title: stepTitles[id],
      state: index < activeStepIndex ? "complete" : index === activeStepIndex ? "active" : "pending",
    }));
  }, [activeStepIndex]);

  const activeStepId = steps[activeStepIndex]?.id as StepId | undefined;
  const isLastStep = activeStepIndex >= steps.length - 1;
  const disableActions = isBusy || isResolvingCustomer || isApplying;

  const resolveCustomer = useCallback(async (): Promise<DocumentExtractionCustomerResolution | null> => {
    if (!customer) return null;
    const customerNumber = customer.customerNumber.trim();
    setCustomerError(null);
    setCustomerResolution(null);
    if (!customerNumber) {
      setCustomerError("Kundennummer ist erforderlich.");
      return null;
    }

    setIsResolvingCustomer(true);
    try {
      const resolution = await onResolveCustomerByNumber(customerNumber);
      setCustomerResolution(resolution);
      if (resolution.resolution === "multiple") {
        setCustomerError("Kundennummer ist mehrfach vorhanden. Bitte den Kunden außerhalb des Extract-Dialogs eindeutig auswählen.");
      }
      if (resolution.resolution === "none" && !canCreateCustomer) {
        setCustomerError("Kunde existiert noch nicht. Diese Rolle darf keine Kunden anlegen.");
      }
      return resolution;
    } catch (error) {
      setCustomerError(error instanceof Error ? error.message : "Kunde konnte nicht geprüft werden.");
      return null;
    } finally {
      setIsResolvingCustomer(false);
    }
  }, [canCreateCustomer, customer, onResolveCustomerByNumber]);

  useEffect(() => {
    if (!open || activeStepId !== "customer") return;
    if (customerResolution || customerError || isResolvingCustomer) return;
    void resolveCustomer();
  }, [activeStepId, customerError, customerResolution, isResolvingCustomer, open, resolveCustomer]);

  const resolveOrCreateCustomer = async (): Promise<Customer | null> => {
    if (!customer) return null;
    const resolution = customerResolution ?? await resolveCustomer();
    if (!resolution) return null;
    if (resolution.resolution === "single") {
      if (!canCreateCustomer || !onUpdateExistingCustomer) {
        return resolution.customer;
      }
      return onUpdateExistingCustomer(resolution.customer, customer);
    }
    if (resolution.resolution === "multiple") {
      setCustomerError("Kundennummer ist mehrfach vorhanden. Bitte den Kunden außerhalb des Extract-Dialogs eindeutig auswählen.");
      return null;
    }
    if (!canCreateCustomer) {
      setCustomerError("Kunde existiert noch nicht. Diese Rolle darf keine Kunden anlegen.");
      return null;
    }
    return onCreateCustomer(customer);
  };

  const handlePrimaryAction = async () => {
    if (!isLastStep) {
      if (activeStepId === "customer") {
        const resolution = customerResolution ?? await resolveCustomer();
        if (!resolution || resolution.resolution === "multiple" || (resolution.resolution === "none" && !canCreateCustomer)) {
          return;
        }
      }
      setActiveStepIndex((current) => Math.min(current + 1, steps.length - 1));
      return;
    }

    if (!customer || !data) return;
    setIsApplying(true);
    try {
      if (onValidateProject) {
        const canContinue = await onValidateProject({ orderNumber: orderNumber.trim() });
        if (!canContinue) return;
      }
      const resolvedCustomer = await resolveOrCreateCustomer();
      if (!resolvedCustomer) return;
      await onApply({
        saunaModel: saunaModel.trim(),
        orderNumber: orderNumber.trim(),
        amount: amount.trim(),
        articleListHtml: articleListHtml.trim(),
        customer,
        customerId: resolvedCustomer.id,
        resolvedCustomer,
        appendDocumentText,
        acceptMissingArticleListAsReklamation,
        createReklamationNote: Boolean(acceptMissingArticleListAsReklamation && createReklamationNote),
        articleListReviewed: true,
      });
    } catch (error) {
      setCustomerError(error instanceof Error ? error.message : "Daten konnten nicht übernommen werden.");
    } finally {
      setIsApplying(false);
    }
  };

  if (!open) return null;

  return (
    <DialogBaseShell
      closeDisabled={true}
      footer={(
        <DialogBaseFooter
          backAction={activeStepIndex > 0 ? {
            disabled: disableActions,
            label: "Zurück",
            onClick: () => setActiveStepIndex((current) => Math.max(current - 1, 0)),
            testId: "button-project-doc-extract-back",
          } : undefined}
          secondaryAction={{
            disabled: disableActions,
            label: "Abbrechen",
            onClick: () => onOpenChange(false),
            testId: "button-project-doc-extract-cancel",
            variant: "outline",
          }}
          primaryAction={{
            disabled: disableActions || !data || !customer,
            isPending: disableActions,
            label: isLastStep ? "Daten übernehmen" : "Weiter",
            onClick: () => {
              void handlePrimaryAction();
            },
            pendingLabel: isApplying ? "Übernehme..." : "Prüfe...",
            testId: isLastStep ? "button-doc-extract-apply-data" : "button-project-doc-extract-next",
          }}
        />
      )}
      icon={<FileText />}
      onOpenChange={onOpenChange}
      open={open}
      size="xl"
      testId="document-extraction-overlay"
      title="Dokument übernehmen"
    >
      <div data-testid="dialog-project-doc-extract-workflow" className="space-y-5">
        <DialogBaseStepper steps={steps} />

        {!data || !customerFields || !customer ? (
          <DialogBaseInlineMessage tone="warning" title="Keine Extraktionsdaten vorhanden." />
        ) : null}

        {data && customerFields && customer && activeStepId === "project" ? (
          <div
            className="grid max-h-[calc(100vh-15rem)] min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-5 overflow-hidden"
            data-testid="doc-extract-project-step-panel"
          >
            <div className="min-h-0 overflow-y-auto pr-1">
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
            </div>
            {data.documentText?.trim() ? (
              <label className="shrink-0 flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm shadow-sm" data-testid="doc-extract-document-text-option">
                <Checkbox
                  checked={appendDocumentText}
                  onCheckedChange={(checked) => setAppendDocumentText(checked === true)}
                  data-testid="checkbox-doc-extract-append-document-text"
                />
                <span>Extrahierten Dokumenttext in die Anmerkungen übernehmen.</span>
              </label>
            ) : null}
          </div>
        ) : null}

        {data && customerFields && customer && activeStepId === "customer" ? (
          <div className="space-y-5">
            <DocumentExtractionCustomerSection
              value={customerFields}
              onChange={(next) => {
                setCustomerFields(next);
                setCustomerResolution(null);
                setCustomerError(null);
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              {isResolvingCustomer ? (
                <span className="flex items-center gap-2 text-sm text-slate-600" data-testid="doc-extract-customer-resolution-loading">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kunde wird automatisch geprüft.
                </span>
              ) : null}
              {customerResolution?.resolution === "single" ? (
                <div className="text-sm text-emerald-700" data-testid="doc-extract-customer-resolution-single">
                  <p>Bestehender Kunde wird verknüpft: {customerResolution.customer.customerNumber}</p>
                  {canCreateCustomer && buildCustomerBackfillLabelText(customerResolution.customer, customer) ? (
                    <p>
                      Leere Kundendaten werden ergänzt: {buildCustomerBackfillLabelText(customerResolution.customer, customer)}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {customerResolution?.resolution === "none" && canCreateCustomer ? (
                <span className="text-sm text-amber-700" data-testid="doc-extract-customer-resolution-none">
                  Kunde wird beim Übernehmen neu angelegt.
                </span>
              ) : null}
            </div>
            {customerError ? (
              <DialogBaseInlineMessage tone="error" title="Kundenprüfung" description={customerError} />
            ) : null}
          </div>
        ) : null}

        {data && activeStepId === "articles" ? (
          <div className="space-y-5">
            {data.warnings.length > 0 ? (
              <DialogBaseInlineMessage
                tone="warning"
                title="Hinweise"
                description={data.warnings.join(" ")}
              />
            ) : null}
            {data.fieldReport.missing.length > 0 ? (
              <section className="rounded-md border border-slate-200 bg-slate-50 p-3" data-testid="document-extraction-report-missing">
                <h3 className="text-sm font-semibold">Nicht erkannt</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {data.fieldReport.missing.map((item) => (
                    <p key={`${item.section}-${item.key}`}>
                      <span className="font-medium">{item.label}: </span>
                      {item.reason}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}
            {issueItems.length > 0 ? (
              <section className="rounded-md border border-amber-300 bg-amber-50 p-3" data-testid="document-extraction-report-issues">
                <h3 className="text-sm font-semibold text-amber-950">Mängel</h3>
                <div className="mt-3 space-y-2 text-sm text-amber-950">
                  {issueItems.map((item) => (
                    <p key={`${item.section}-${item.key}`}>
                      <span className="font-medium">{item.label}: </span>
                      {item.reason}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}
            {missingArticleList ? (
              <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3">
                <label className="flex items-start gap-3 text-sm text-amber-950">
                  <Checkbox
                    checked={acceptMissingArticleListAsReklamation}
                    onCheckedChange={(checked) => setAcceptMissingArticleListAsReklamation(checked === true)}
                    data-testid="checkbox-doc-extract-accept-reklamation"
                  />
                  <span>Als Reklamation ohne Artikelliste übernehmen.</span>
                </label>
                {acceptMissingArticleListAsReklamation ? (
                  <label className="flex items-start gap-3 text-sm text-amber-950">
                    <Checkbox
                      checked={createReklamationNote}
                      onCheckedChange={(checked) => setCreateReklamationNote(checked === true)}
                      data-testid="checkbox-doc-extract-create-reklamation-note"
                    />
                    <span>Reklamationsnotiz vorbereiten.</span>
                  </label>
                ) : null}
              </div>
            ) : (
              <DialogBaseInlineMessage tone="success" title="Artikelliste wurde erkannt." />
            )}
          </div>
        ) : null}

        {data && activeStepId === "summary" ? (
          <div className="space-y-4">
            <DialogBaseInlineMessage
              tone="info"
              title="Bereit zur Übernahme"
            />
            <div className="grid gap-2 text-sm">
              <p><span className="font-medium">Projekt:</span> {saunaModel || "ohne Titel"}</p>
              <p><span className="font-medium">Auftragsnummer:</span> {orderNumber || "nicht erkannt"}</p>
              <p><span className="font-medium">Kunde:</span> {customer?.customerNumber || "nicht erkannt"}</p>
              <p><span className="font-medium">Artikelliste:</span> {missingArticleList ? "als Mangel behandelt" : "erkannt"}</p>
              {appendDocumentText ? <p>Dokumenttext wird in die Anmerkungen übernommen.</p> : null}
            </div>
            {customerError ? (
              <DialogBaseInlineMessage tone="error" title="Übernahme nicht möglich" description={customerError} />
            ) : null}
          </div>
        ) : null}
      </div>
    </DialogBaseShell>
  );
}
