import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, User, Phone, MapPin, Building2 } from "lucide-react";
import { EntityCard } from "@/components/ui/entity-card";
import { defaultHeaderColor } from "@/lib/colors";

interface CustomerListProps {
  onCancel?: () => void;
}

const demoCustomerStatuses = [
  { id: "active", name: "Aktiv", color: "#10B981" },
  { id: "inactive", name: "Inaktiv", color: "#6B7280" },
  { id: "new", name: "Neu", color: "#3B82F6" },
];

const demoCustomers = [
  { 
    id: "1", 
    firstName: "Hans", 
    lastName: "Müller", 
    company: "Müller GmbH",
    phone: "+49 89 123456", 
    plz: "80331", 
    city: "München",
    street: "Marienplatz 1",
    statusId: "active",
    projectCount: 3
  },
  { 
    id: "2", 
    firstName: "Anna", 
    lastName: "Schmidt", 
    company: "",
    phone: "+49 30 987654", 
    plz: "10115", 
    city: "Berlin",
    street: "Unter den Linden 5",
    statusId: "active",
    projectCount: 2
  },
  { 
    id: "3", 
    firstName: "Peter", 
    lastName: "Weber", 
    company: "Weber & Söhne",
    phone: "+49 221 456789", 
    plz: "50667", 
    city: "Köln",
    street: "Hohe Straße 12",
    statusId: "new",
    projectCount: 1
  },
  { 
    id: "4", 
    firstName: "Maria", 
    lastName: "Fischer", 
    company: "",
    phone: "+49 40 111222", 
    plz: "20095", 
    city: "Hamburg",
    street: "Jungfernstieg 8",
    statusId: "inactive",
    projectCount: 0
  },
  { 
    id: "5", 
    firstName: "Klaus", 
    lastName: "Hoffmann", 
    company: "Hoffmann Bau",
    phone: "+49 69 333444", 
    plz: "60311", 
    city: "Frankfurt",
    street: "Zeil 20",
    statusId: "active",
    projectCount: 4
  },
];

export function CustomerList({ onCancel }: CustomerListProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const filteredCustomers = selectedStatus 
    ? demoCustomers.filter(c => c.statusId === selectedStatus)
    : demoCustomers;

  const getStatus = (statusId: string) => 
    demoCustomerStatuses.find(s => s.id === statusId);

  return (
    <Card className="h-full flex flex-col" data-testid="customer-list">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between gap-4 pb-4">
        <CardTitle className="text-xl font-bold">Kundenliste</CardTitle>
        {onCancel && (
          <Button 
            size="lg" 
            variant="ghost" 
            onClick={onCancel}
            data-testid="button-close-customer-list"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto space-y-6">
        <div className="flex flex-wrap gap-2" data-testid="customer-status-filter">
          <Button
            size="sm"
            variant={selectedStatus === null ? "default" : "outline"}
            onClick={() => setSelectedStatus(null)}
            data-testid="filter-customer-all"
          >
            Alle ({demoCustomers.length})
          </Button>
          {demoCustomerStatuses.map(status => {
            const count = demoCustomers.filter(c => c.statusId === status.id).length;
            return (
              <Button
                key={status.id}
                size="sm"
                variant={selectedStatus === status.id ? "default" : "outline"}
                onClick={() => setSelectedStatus(status.id)}
                style={selectedStatus === status.id ? { backgroundColor: status.color } : {}}
                data-testid={`filter-customer-${status.id}`}
              >
                {status.name} ({count})
              </Button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => {
            const status = getStatus(customer.statusId);
            
            return (
              <EntityCard
                key={customer.id}
                title={`${customer.lastName}, ${customer.firstName}`}
                icon={<User className="w-4 h-4" />}
                headerColor={defaultHeaderColor}
                testId={`customer-card-${customer.id}`}
              >
                {status && (
                  <Badge 
                    className="mb-3"
                    style={{ 
                      backgroundColor: `${status.color}20`,
                      color: status.color,
                      borderColor: `${status.color}40`
                    }}
                    data-testid={`customer-status-badge-${customer.id}`}
                  >
                    {status.name}
                  </Badge>
                )}

                <div className="space-y-1 text-sm text-slate-600">
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
                    <span>{customer.plz} {customer.city}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    {customer.projectCount} Projekte
                  </div>
                </div>
              </EntityCard>
            );
          })}
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            Keine Kunden mit diesem Status gefunden.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
