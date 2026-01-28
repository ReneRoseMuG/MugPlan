import { User, Phone, MapPin, Building2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityCard } from "@/components/ui/entity-card";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { defaultHeaderColor } from "@/lib/colors";
import { useQuery } from "@tanstack/react-query";
import type { Customer } from "@shared/schema";

interface CustomerListProps {
  onCancel?: () => void;
  onNewCustomer?: () => void;
  onSelectCustomer?: (id: number) => void;
}

export function CustomerList({ onCancel, onNewCustomer, onSelectCustomer }: CustomerListProps) {
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const activeCustomers = customers.filter(c => c.isActive);

  return (
    <CardListLayout
      title="Kunden"
      icon={<User className="w-5 h-5" />}
      helpKey="customers"
      isLoading={isLoading}
      onClose={onCancel}
      closeTestId="button-close-customers"
      gridTestId="list-customers"
      gridCols="3"
      primaryAction={onNewCustomer ? {
        label: "Neuer Kunde",
        onClick: onNewCustomer,
        testId: "button-new-customer",
      } : undefined}
      secondaryAction={onCancel ? {
        label: "Schließen",
        onClick: onCancel,
        testId: "button-cancel-customers",
      } : undefined}
      isEmpty={activeCustomers.length === 0}
      emptyState={
        <p className="text-sm text-slate-400 text-center py-8 col-span-3">
          Keine Kunden gefunden.
        </p>
      }
    >
      {activeCustomers.map(customer => (
        <EntityCard
          key={customer.id}
          title={customer.fullName}
          icon={<User className="w-4 h-4" />}
          headerColor={defaultHeaderColor}
          testId={`customer-card-${customer.id}`}
          onDoubleClick={() => onSelectCustomer?.(customer.id)}
          footer={
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCustomer?.(customer.id);
              }}
              data-testid={`button-edit-customer-${customer.id}`}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          }
        >
          <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
            {customer.company && (
              <div className="flex items-center gap-2">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span className="font-medium">{customer.company}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{customer.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>{customer.postalCode} {customer.city}</span>
            </div>
          </div>
        </EntityCard>
      ))}
    </CardListLayout>
  );
}
