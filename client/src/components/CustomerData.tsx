import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, MapPin, Save, X, Calendar } from "lucide-react";
import { NotesSection, Note } from "@/components/NotesSection";

interface CustomerDataProps {
  onCancel?: () => void;
  onSave?: () => void;
}

const demoAppointments = [
  { id: "1", date: "15.01.2026" },
  { id: "2", date: "22.01.2026" },
  { id: "3", date: "05.02.2026" },
];

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
    <div className="h-full p-8 overflow-auto">
      <div className="max-w-5xl grid grid-cols-3 gap-6">
        <Card className="col-span-2">
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
            <form className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Persönliche Daten
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" data-testid="label-firstname">Vorname</Label>
                    <Input 
                      id="firstName" 
                      placeholder="Max" 
                      data-testid="input-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" data-testid="label-lastname">Nachname</Label>
                    <Input 
                      id="lastName" 
                      placeholder="Mustermann" 
                      data-testid="input-lastname"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName" data-testid="label-fullname">Vollständiger Name / Firma</Label>
                  <Input 
                    id="fullName" 
                    placeholder="Max Mustermann GmbH" 
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
                    placeholder="+49 123 456789" 
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
                    placeholder="Musterstraße 123" 
                    data-testid="input-street"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip" data-testid="label-zip">PLZ</Label>
                    <Input 
                      id="zip" 
                      placeholder="12345" 
                      data-testid="input-zip"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="city" data-testid="label-city">Ort</Label>
                    <Input 
                      id="city" 
                      placeholder="Musterstadt" 
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
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Termine
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-2" data-testid="list-appointments">
                {demoAppointments.map((apt) => (
                  <li 
                    key={apt.id} 
                    className="text-sm text-slate-600 py-2 px-3 bg-slate-50 rounded-md"
                    data-testid={`appointment-${apt.id}`}
                  >
                    {apt.date}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <NotesSection
                notes={notes}
                onAdd={handleAddNote}
                onDelete={handleDeleteNote}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
