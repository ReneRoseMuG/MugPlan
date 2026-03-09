import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";

interface DocumentExtractionProjectSectionProps {
  saunaModel: string;
  orderNumber: string;
  amount: string;
  articleListHtml: string;
  onSaunaModelChange: (value: string) => void;
  onOrderNumberChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onArticleListHtmlChange: (value: string) => void;
  action?: ReactNode;
  showHeading?: boolean;
}

export function DocumentExtractionProjectSection({
  saunaModel,
  orderNumber,
  amount,
  articleListHtml,
  onSaunaModelChange,
  onOrderNumberChange,
  onAmountChange,
  onArticleListHtmlChange,
  action,
  showHeading = true,
}: DocumentExtractionProjectSectionProps) {
  return (
    <section className="space-y-3">
      {showHeading ? <h3 className="text-sm font-bold tracking-wider text-primary">Projektdaten</h3> : null}
      <div className="space-y-1">
        <Label>Projektname</Label>
        <Input
          value={saunaModel}
          onChange={(event) => onSaunaModelChange(event.target.value)}
          data-testid="input-doc-extract-sauna-model"
        />
      </div>
      <div className="space-y-1">
        <Label>Auftragsnummer</Label>
        <Input
          value={orderNumber}
          onChange={(event) => onOrderNumberChange(event.target.value)}
          data-testid="input-doc-extract-order-number"
        />
      </div>
      <div className="space-y-1">
        <Label>Betrag (EUR)</Label>
        <Input
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          data-testid="input-doc-extract-amount"
        />
      </div>
      <div className="space-y-1">
        <Label>Artikelliste</Label>
        <RichTextEditor
          value={articleListHtml}
          onChange={onArticleListHtmlChange}
          className="h-[520px] [&_[data-testid='richtext-editor']]:min-h-[460px] [&_[data-testid='richtext-editor']]:max-h-[460px] [&_[data-testid='richtext-editor']]:overflow-y-auto"
        />
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </section>
  );
}
