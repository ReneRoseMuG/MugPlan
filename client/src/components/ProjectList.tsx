import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, FolderKanban, Calendar, MapPin } from "lucide-react";

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
  { id: "1", name: "Renovierung Bürogebäude", customerId: "1", statusId: "s2", appointmentCount: 5 },
  { id: "2", name: "Neugestaltung Empfangsbereich", customerId: "1", statusId: "s1", appointmentCount: 2 },
  { id: "3", name: "Gartenanlage Villa", customerId: "2", statusId: "s3", appointmentCount: 3 },
  { id: "4", name: "Fassadensanierung", customerId: "3", statusId: "s4", appointmentCount: 8 },
  { id: "5", name: "Innenausbau Penthouse", customerId: "2", statusId: "s2", appointmentCount: 4 },
  { id: "6", name: "Altbausanierung", customerId: "1", statusId: "s5", appointmentCount: 0 },
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
              <div
                key={project.id}
                className="p-4 bg-slate-50 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                data-testid={`project-card-${project.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: status?.color ? `${status.color}20` : '#f1f5f9' }}
                    >
                      <FolderKanban 
                        className="w-4 h-4" 
                        style={{ color: status?.color || '#64748b' }}
                      />
                    </div>
                    <h3 className="font-semibold text-slate-800 line-clamp-2">
                      {project.name}
                    </h3>
                  </div>
                </div>

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

                {customer && (
                  <div className="space-y-1 text-sm text-slate-600">
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
              </div>
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
