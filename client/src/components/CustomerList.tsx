import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Phone, MapPin, Building2, Plus } from "lucide-react";
import { EntityCard } from "@/components/ui/entity-card";
import { defaultHeaderColor } from "@/lib/colors";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
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
    <Card className="h-full flex flex-col" data-testid="customer-list">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between gap-4 pb-4">
        <CardTitle className="text-xl font-bold">Kundenliste</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </div>
        )}

        {!isLoading && activeCustomers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            Keine Kunden gefunden.
          </div>
        )}

        <div className="mt-6 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={onNewCustomer}
            className="flex items-center gap-2"
            data-testid="button-new-customer"
          >
            <Plus className="w-4 h-4" />
            Neuer Kunde
          </Button>

          {onCancel && (
            <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-customers">
              Schließen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
