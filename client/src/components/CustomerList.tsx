import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, User, Phone, MapPin, Building2 } from "lucide-react";
import { EntityCard } from "@/components/ui/entity-card";
import { defaultHeaderColor } from "@/lib/colors";

interface CustomerListProps {
  onCancel?: () => void;
}

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
    projectCount: 4
  },
];

export function CustomerList({ onCancel }: CustomerListProps) {
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
      <CardContent className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {demoCustomers.map(customer => (
            <EntityCard
              key={customer.id}
              title={`${customer.lastName}, ${customer.firstName}`}
              icon={<User className="w-4 h-4" />}
              headerColor={defaultHeaderColor}
              testId={`customer-card-${customer.id}`}
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
                  <span>{customer.plz} {customer.city}</span>
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  {customer.projectCount} Projekte
                </div>
              </div>
            </EntityCard>
          ))}
        </div>

        {demoCustomers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            Keine Kunden gefunden.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
