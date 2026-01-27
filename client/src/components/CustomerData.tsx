import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, MapPin, Save, X, Calendar, FolderKanban } from "lucide-react";
import { NotesSection, Note } from "@/components/NotesSection";

interface CustomerDataProps {
  onCancel?: () => void;
  onSave?: () => void;
}

const initialNotes: Note[] = [
  {
    id: "1",
    text: "Kunde bevorzugt Vormittagstermine zwischen 9 und 12 Uhr. Parkplatz vor dem Haus verfügbar.",
    createdAt: "20.01.2026",
  },
  {
    id: "2", 
    text: "Rückruf am Montag vereinbart. Angebot für Zusatzleistungen besprechen.",
    createdAt: "18.01.2026",
  },
];

const demoProjects = [
  { id: "1", name: "Renovierung Bürogebäude", status: "In Bearbeitung", statusColor: "#f59e0b" },
  { id: "2", name: "Neugestaltung Empfangsbereich", status: "Neu", statusColor: "#3b82f6" },
  { id: "3", name: "Wintergarten Anbau", status: "Abgeschlossen", statusColor: "#22c55e" },
];

const demoAppointments = [
  { id: "1", date: "28.01.2026", title: "Aufmaß vor Ort", project: "Renovierung Bürogebäude" },
  { id: "2", date: "05.02.2026", title: "Materialauswahl", project: "Neugestaltung Empfangsbereich" },
  { id: "3", date: "12.02.2026", title: "Abnahme", project: "Wintergarten Anbau" },
];

export function CustomerData({ onCancel, onSave }: CustomerDataProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);

  const handleAddNote = (text: string) => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    setNotes([
      { id: Date.now().toString(), text, createdAt: dateStr },
      ...notes
    ]);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  return (
    <div className="h-full p-6 overflow-auto">
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-primary flex items-center gap-3">
              <User className="w-6 h-6" />
              Kundendaten
            </CardTitle>
            {onCancel && (
              <Button size="lg" variant="ghost" onClick={onCancel} data-testid="button-close-customer">
                <X className="w-6 h-6" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Linke Spalte: Stammdaten + Notizen */}
            <div className="col-span-2 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Persönliche Daten
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="customerNumber" data-testid="label-customernumber">Kundennummer</Label>
                  <Input 
                    id="customerNumber" 
                    defaultValue="K-2026-0001"
                    className="max-w-[200px] font-mono"
                    data-testid="input-customernumber"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" data-testid="label-firstname">Vorname</Label>
                    <Input 
                      id="firstName" 
                      defaultValue="Hans"
                      data-testid="input-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" data-testid="label-lastname">Nachname</Label>
                    <Input 
                      id="lastName" 
                      defaultValue="Müller"
                      data-testid="input-lastname"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName" data-testid="label-fullname">Vollständiger Name / Firma</Label>
                  <Input 
                    id="fullName" 
                    defaultValue="Müller GmbH"
                    data-testid="input-fullname"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Kontakt
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="phone" data-testid="label-phone">Telefon *</Label>
                  <Input 
                    id="phone" 
                    defaultValue="+49 123 456789"
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Adresse
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="street" data-testid="label-street">Straße</Label>
                  <Input 
                    id="street" 
                    defaultValue="Industriestraße 42"
                    data-testid="input-street"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip" data-testid="label-zip">PLZ</Label>
                    <Input 
                      id="zip" 
                      defaultValue="80331"
                      data-testid="input-zip"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="city" data-testid="label-city">Ort</Label>
                    <Input 
                      id="city" 
                      defaultValue="München"
                      data-testid="input-city"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                  Status
                </h3>
                <div className="flex items-center gap-3">
                  <Checkbox id="isActive" defaultChecked data-testid="checkbox-active" />
                  <Label htmlFor="isActive" className="cursor-pointer" data-testid="label-active">
                    Kunde ist aktiv
                  </Label>
                </div>
              </div>

              {/* Notizen unter dem Hauptbereich */}
              <NotesSection
                notes={notes}
                onAdd={handleAddNote}
                onDelete={handleDeleteNote}
              />

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button type="button" onClick={onSave} data-testid="button-save">
                  <Save className="w-4 h-4 mr-2" />
                  Speichern
                </Button>
                <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
                  <X className="w-4 h-4 mr-2" />
                  Abbrechen
                </Button>
              </div>
            </div>

            {/* Rechte Spalte: Projekte, Termine */}
            <div className="space-y-6">
              {/* Projekte (readonly) */}
              <Card>
                <CardHeader className="border-b border-border py-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <FolderKanban className="w-4 h-4" />
                    Verknüpfte Projekte ({demoProjects.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2" data-testid="list-projects">
                    {demoProjects.map((project) => (
                      <div 
                        key={project.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-border"
                        data-testid={`project-card-${project.id}`}
                      >
                        <p className="font-medium text-sm text-slate-700 dark:text-slate-300" data-testid={`text-project-name-${project.id}`}>
                          {project.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: project.statusColor }}
                          />
                          <span className="text-xs text-slate-500" data-testid={`text-project-status-${project.id}`}>
                            {project.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {demoProjects.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-2">
                        Keine Projekte verknüpft
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Termine (readonly) */}
              <Card>
                <CardHeader className="border-b border-border py-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Termine ({demoAppointments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2" data-testid="list-appointments">
                    {demoAppointments.map((apt) => (
                      <div 
                        key={apt.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-border"
                        data-testid={`appointment-card-${apt.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm text-slate-700 dark:text-slate-300" data-testid={`text-appointment-title-${apt.id}`}>
                            {apt.title}
                          </p>
                          <span className="text-xs font-medium text-primary" data-testid={`text-appointment-date-${apt.id}`}>
                            {apt.date}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1" data-testid={`text-appointment-project-${apt.id}`}>
                          {apt.project}
                        </p>
                      </div>
                    ))}
                    {demoAppointments.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-2">
                        Keine Termine vorhanden
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
