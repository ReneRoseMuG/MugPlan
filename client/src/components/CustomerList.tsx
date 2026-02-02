import { useMemo, useState } from "react";
import { User, Phone, MapPin, Building2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityCard } from "@/components/ui/entity-card";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { FilterInput } from "@/components/ui/filter-input";
import { defaultHeaderColor } from "@/lib/colors";
import { useQuery } from "@tanstack/react-query";
import type { Customer } from "@shared/schema";

interface CustomerListProps {
  onCancel?: () => void;
  onNewCustomer?: () => void;
  onSelectCustomer?: (id: number) => void;
  mode?: "list" | "picker";
  selectedCustomerId?: number | null;
  title?: string;
}

export function CustomerList({
  onCancel,
  onNewCustomer,
  onSelectCustomer,
  mode = "list",
  selectedCustomerId = null,
  title,
}: CustomerListProps) {
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const [lastNameFilter, setLastNameFilter] = useState("");
  const [customerNumberFilter, setCustomerNumberFilter] = useState("");

  const activeCustomers = customers.filter(c => c.isActive);
  const filteredCustomers = useMemo(() => {
    const normalizedLastName = lastNameFilter.trim().toLowerCase();
    const normalizedCustomerNumber = customerNumberFilter.trim();

    return activeCustomers.filter((customer) => {
      const matchesLastName = normalizedLastName
        ? (customer.lastName ?? "").toLowerCase().includes(normalizedLastName)
        : true;
      const matchesCustomerNumber = normalizedCustomerNumber
        ? (customer.customerNumber ?? "").includes(normalizedCustomerNumber)
        : true;

      return matchesLastName && matchesCustomerNumber;
    });
  }, [activeCustomers, lastNameFilter, customerNumberFilter]);

  const isPicker = mode === "picker";
  const resolvedTitle = title ?? (isPicker ? "Kunde auswählen" : "Kunden");

  return (
    <CardListLayout
      title={resolvedTitle}
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
      isEmpty={filteredCustomers.length === 0}
      emptyState={
        <p className="text-sm text-slate-400 text-center py-8 col-span-3">
          Keine Kunden gefunden.
        </p>
      }
      bottomBar={(
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <FilterInput
            id="customer-filter-last-name"
            label="Nachname"
            value={lastNameFilter}
            placeholder="Suche Nachname"
            onChange={setLastNameFilter}
            onClear={() => setLastNameFilter("")}
            className="flex-1"
          />
          <FilterInput
            id="customer-filter-number"
            label="Kundennummer"
            value={customerNumberFilter}
            placeholder="Kundennummer"
            onChange={setCustomerNumberFilter}
            onClear={() => setCustomerNumberFilter("")}
            numericOnly
            className="flex-1"
          />
        </div>
      )}
    >
      {filteredCustomers.map(customer => {
        const isSelected = selectedCustomerId === customer.id;
        const handleSelect = () => onSelectCustomer?.(customer.id);

        return (
          <EntityCard
            key={customer.id}
            title={customer.fullName}
            icon={<User className="w-4 h-4" />}
            headerColor={defaultHeaderColor}
            testId={`customer-card-${customer.id}`}
            onClick={isPicker ? handleSelect : undefined}
            onDoubleClick={!isPicker ? handleSelect : undefined}
            className={isSelected ? "ring-2 ring-primary/40 border-primary/40 bg-primary/5" : ""}
            footer={isPicker ? undefined : (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect();
                }}
                data-testid={`button-edit-customer-${customer.id}`}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
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
        );
      })}
    </CardListLayout>
  );
}
