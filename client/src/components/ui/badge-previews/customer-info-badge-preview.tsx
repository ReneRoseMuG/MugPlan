import { Phone, User } from "lucide-react";
import type { InfoBadgePreview } from "@/components/ui/info-badge";

type CustomerInfoBadgePreviewProps = {
  fullName: string;
  customerNumber?: string | null;
  phone?: string | null;
};

export const customerInfoBadgePreviewOptions = {
  openDelayMs: 380,
  side: "right" as const,
  align: "start" as const,
  maxWidth: 360,
  maxHeight: 260,
};

export function CustomerInfoBadgePreview({ fullName, customerNumber, phone }: CustomerInfoBadgePreviewProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <User className="h-4 w-4 text-muted-foreground" />
        <span>{fullName}</span>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        {customerNumber && <div>Kundennr.: {customerNumber}</div>}
        {phone && (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span>{phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function createCustomerInfoBadgePreview(props: CustomerInfoBadgePreviewProps): InfoBadgePreview {
  return {
    content: <CustomerInfoBadgePreview {...props} />,
    options: customerInfoBadgePreviewOptions,
  };
}
