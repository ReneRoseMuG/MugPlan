import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export type ExtractionCustomerEditableFields = {
  customerNumber: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  country: string;
};

interface DocumentExtractionCustomerSectionProps {
  value: ExtractionCustomerEditableFields;
  onChange: (value: ExtractionCustomerEditableFields) => void;
  action?: ReactNode;
  showHeading?: boolean;
}

export function DocumentExtractionCustomerSection({
  value,
  onChange,
  action,
  showHeading = true,
}: DocumentExtractionCustomerSectionProps) {
  return (
    <section className="space-y-3">
      {showHeading ? <h3 className="text-sm font-bold tracking-wider text-primary">Kundendaten</h3> : null}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Kundennummer</Label>
          <Input
            value={value.customerNumber}
            onChange={(event) => onChange({ ...value, customerNumber: event.target.value })}
            data-testid="input-doc-extract-customer-number"
          />
        </div>
        <div className="space-y-1">
          <Label>Telefon</Label>
          <Input
            value={value.phone}
            onChange={(event) => onChange({ ...value, phone: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Vorname</Label>
          <Input
            value={value.firstName}
            onChange={(event) => onChange({ ...value, firstName: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Nachname</Label>
          <Input
            value={value.lastName}
            onChange={(event) => onChange({ ...value, lastName: event.target.value })}
          />
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Firma</Label>
          <Input
            value={value.company}
            onChange={(event) => onChange({ ...value, company: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>E-Mail</Label>
          <Input
            value={value.email}
            onChange={(event) => onChange({ ...value, email: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Straße</Label>
          <Input
            value={value.addressLine1}
            onChange={(event) => onChange({ ...value, addressLine1: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>PLZ</Label>
          <Input
            value={value.postalCode}
            onChange={(event) => onChange({ ...value, postalCode: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Ort</Label>
          <Input
            value={value.city}
            onChange={(event) => onChange({ ...value, city: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Land</Label>
          <Input
            value={value.country}
            onChange={(event) => onChange({ ...value, country: event.target.value })}
            data-testid="input-doc-extract-country"
          />
        </div>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </section>
  );
}
