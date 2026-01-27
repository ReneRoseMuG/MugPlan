import { User, Phone, MapPin, Building2 } from "lucide-react";
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
        <div 
          key={customer.id} 
          onClick={() => onSelectCustomer?.(customer.id)}
          className="cursor-pointer"
          data-testid={`button-select-customer-${customer.id}`}
        >
          <EntityCard
            title={customer.name}
            icon={<User className="w-4 h-4" />}
            headerColor={defaultHeaderColor}
            testId={`customer-card-${customer.id}`}
          >
            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              {customer.addressLine2 && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span className="font-medium">{customer.addressLine2}</span>
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
        </div>
      ))}
    </CardListLayout>
  );
}
