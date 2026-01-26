import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, FolderKanban, Calendar, MapPin } from "lucide-react";
import { EntityCard } from "@/components/ui/entity-card";
import { defaultHeaderColor } from "@/lib/colors";

interface ProjectListProps {
  onCancel?: () => void;
}

const demoProjectStatuses = [
  { id: "s1", name: "Neu", color: "#3B82F6" },
  { id: "s2", name: "In Bearbeitung", color: "#F59E0B" },
  { id: "s3", name: "Wartend", color: "#8B5CF6" },
  { id: "s4", name: "Abgeschlossen", color: "#10B981" },
  { id: "s5", name: "Storniert", color: "#EF4444" },
];

const demoCustomers = [
  { id: "1", name: "Müller", firstName: "Hans", plz: "80331" },
  { id: "2", name: "Schmidt", firstName: "Anna", plz: "10115" },
  { id: "3", name: "Weber", firstName: "Peter", plz: "50667" },
];

const demoProjects = [
  { 
    id: "1", 
    name: "Projekt 1", 
    customerId: "1", 
    statusId: "s2", 
    appointmentCount: 5,
    description: "GESPIEGELT\nPalkkio 'E', Core, R-alu-schw\nFenster rund 90 cm\nBrillenablage 2-fach, 3 Düfte\n2 Yoga Lampen, Lixum farblos"
  },
  { 
    id: "2", 
    name: "Projekt 2", 
    customerId: "1", 
    statusId: "s1", 
    appointmentCount: 2,
    description: "GESPIEGELT\nPalkkio 'E', Core; R-alu-schw\nFenster rund 90 cm\nBrillenablage 2-fach, 3 Düfte\n2 Yoga Lampen, Lixum farblos"
  },
  { 
    id: "3", 
    name: "Projekt 3", 
    customerId: "2", 
    statusId: "s3", 
    appointmentCount: 3,
    description: "Premium4, Core, Lixum farblos\nR-alu-schw, Yoga\n2er Steckdose"
  },
  { 
    id: "4", 
    name: "Projekt 4", 
    customerId: "3", 
    statusId: "s4", 
    appointmentCount: 8,
    description: "Premium 4, Aries\nR-alu-schw, Lixum\nfarblos"
  },
  { 
    id: "5", 
    name: "Projekt 5", 
    customerId: "2", 
    statusId: "s2", 
    appointmentCount: 4,
    description: "Palkkio; Drop;\nR-alu-grün; 1 Steckdose\nim Ruheraum unter der\nkurzen Bank"
  },
  { 
    id: "6", 
    name: "Projekt 6", 
    customerId: "1", 
    statusId: "s5", 
    appointmentCount: 0,
    description: "XL; Aries; R-alu-schw\nOHNE FENSTER\n2 Vordachlampen\nEinstiegsstufe\n\nRelax Lampenschirm"
  },
];

export default function ProjectList({ onCancel }: ProjectListProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const filteredProjects = selectedStatus 
    ? demoProjects.filter(p => p.statusId === selectedStatus)
    : demoProjects;

  const getCustomer = (customerId: string) => 
    demoCustomers.find(c => c.id === customerId);

  const getStatus = (statusId: string) => 
    demoProjectStatuses.find(s => s.id === statusId);

  return (
    <Card className="h-full flex flex-col" data-testid="project-list">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between gap-4 pb-4">
        <CardTitle className="text-xl font-bold">Projektliste</CardTitle>
        {onCancel && (
          <Button 
            size="lg" 
            variant="ghost" 
            onClick={onCancel}
            data-testid="button-close-project-list"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto space-y-6">
        <div className="flex flex-wrap gap-2" data-testid="status-filter">
          <Button
            size="sm"
            variant={selectedStatus === null ? "default" : "outline"}
            onClick={() => setSelectedStatus(null)}
            data-testid="filter-all"
          >
            Alle ({demoProjects.length})
          </Button>
          {demoProjectStatuses.map(status => {
            const count = demoProjects.filter(p => p.statusId === status.id).length;
            return (
              <Button
                key={status.id}
                size="sm"
                variant={selectedStatus === status.id ? "default" : "outline"}
                onClick={() => setSelectedStatus(status.id)}
                style={selectedStatus === status.id ? { backgroundColor: status.color } : {}}
                data-testid={`filter-${status.id}`}
              >
                {status.name} ({count})
              </Button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(project => {
            const customer = getCustomer(project.customerId);
            const status = getStatus(project.statusId);
            
            return (
              <EntityCard
                key={project.id}
                title={project.name}
                icon={<FolderKanban className="w-4 h-4" style={{ color: status?.color }} />}
                headerColor={defaultHeaderColor}
                testId={`project-card-${project.id}`}
              >
                {status && (
                  <Badge 
                    className="mb-3"
                    style={{ 
                      backgroundColor: `${status.color}20`,
                      color: status.color,
                      borderColor: `${status.color}40`
                    }}
                    data-testid={`status-badge-${project.id}`}
                  >
                    {status.name}
                  </Badge>
                )}

                {project.description && (
                  <div 
                    className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line mb-3"
                    data-testid={`description-${project.id}`}
                  >
                    {project.description}
                  </div>
                )}

                {customer && (
                  <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400 border-t pt-3 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{customer.firstName} {customer.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3 h-3" />
                      <span>{customer.plz}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>{project.appointmentCount} Termine</span>
                    </div>
                  </div>
                )}
              </EntityCard>
            );
          })}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            Keine Projekte mit diesem Status gefunden.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
