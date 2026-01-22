import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/RichTextEditor";
import { NotesSection, Note } from "@/components/NotesSection";
import { 
  X, 
  FolderKanban, 
  UserCircle, 
  FileText, 
  Calendar, 
  Paperclip, 
  Plus,
  Eye,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ProjectFormProps {
  onCancel?: () => void;
}

const mockStatuses = [
  { id: "1", name: "Neu", color: "#3b82f6" },
  { id: "2", name: "In Bearbeitung", color: "#f59e0b" },
  { id: "3", name: "Warten auf Kunde", color: "#8b5cf6" },
  { id: "4", name: "Abgeschlossen", color: "#22c55e" },
  { id: "5", name: "Storniert", color: "#ef4444" },
];

const mockCustomer = {
  id: "1",
  name: "Müller GmbH",
  contact: "Hans Müller",
  phone: "+49 123 456789",
};

const initialNotes: Note[] = [
  { id: "1", text: "Kunde wünscht Lieferung vor 10 Uhr", createdAt: "15.01.2026" },
  { id: "2", text: "Rückruf vereinbart für Montag", createdAt: "14.01.2026" },
  { id: "3", text: "Sonderkonditionen besprochen", createdAt: "12.01.2026" },
];

const mockAppointments = [
  { id: "1", date: "2024-02-15", title: "Montage vor Ort" },
];

const mockDocuments = [
  { id: "1", name: "Auftrag_2024_001.pdf", type: "application/pdf", size: "245 KB", preview: null },
  { id: "2", name: "Auftragsbestätigung.pdf", type: "application/pdf", size: "128 KB", preview: null },
  { id: "3", name: "Skizze_Grundriss.jpg", type: "image/jpeg", size: "1.2 MB", preview: null },
];


function DocumentCard({ 
  doc, 
  onPreview, 
  onDelete 
}: { 
  doc: typeof mockDocuments[0]; 
  onPreview: () => void;
  onDelete: () => void;
}) {
  const isPdf = doc.type === "application/pdf";
  
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-border rounded-lg hover-elevate" data-testid={`document-card-${doc.id}`}>
      <div className={`w-10 h-10 rounded flex items-center justify-center ${isPdf ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate" data-testid={`text-document-name-${doc.id}`}>{doc.name}</p>
        <p className="text-xs text-slate-400" data-testid={`text-document-size-${doc.id}`}>{doc.size}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={onPreview} data-testid={`button-preview-${doc.id}`}>
          <Eye className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" data-testid={`button-download-${doc.id}`}>
          <Download className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete} data-testid={`button-delete-doc-${doc.id}`}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function DocumentPreviewDialog({ 
  documents, 
  currentIndex, 
  open, 
  onOpenChange,
  onNavigate
}: { 
  documents: typeof mockDocuments;
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (index: number) => void;
}) {
  const doc = documents[currentIndex];
  if (!doc) return null;
  
  const isPdf = doc.type === "application/pdf";
  const hasMultiple = documents.length > 1;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span data-testid="text-preview-document-name">{doc.name}</span>
            </DialogTitle>
            {hasMultiple && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => onNavigate(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  data-testid="button-prev-doc"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span data-testid="text-preview-page-indicator">{currentIndex + 1} / {documents.length}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => onNavigate(currentIndex + 1)}
                  disabled={currentIndex === documents.length - 1}
                  data-testid="button-next-doc"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-900 min-h-[500px] p-4">
          {isPdf ? (
            <div className="flex flex-col items-center justify-center text-slate-500 gap-4" data-testid="preview-pdf-container">
              <FileText className="w-24 h-24 text-red-400" />
              <p className="text-lg font-medium" data-testid="text-preview-pdf-label">PDF Vorschau</p>
              <p className="text-sm" data-testid="text-preview-pdf-name">{doc.name}</p>
              <Button variant="outline" className="mt-4" data-testid="button-download-pdf">
                <Download className="w-4 h-4 mr-2" />
                PDF herunterladen
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 gap-4" data-testid="preview-image-container">
              <div className="w-[400px] h-[300px] bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center" data-testid="preview-image-placeholder">
                <span className="text-lg font-medium" data-testid="text-preview-image-label">Bildvorschau</span>
              </div>
              <p className="text-sm" data-testid="text-preview-image-name">{doc.name}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectForm({ onCancel }: ProjectFormProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [documents, setDocuments] = useState(mockDocuments);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [description, setDescription] = useState(`<b>Projektbeschreibung</b><br><br>Dies ist ein Beispielprojekt für die Demonstration des Formulars.<br><br><b>Anforderungen</b><br><ul><li>Lieferung bis Ende Februar</li><li>Installation vor Ort</li><li>Schulung der Mitarbeiter</li></ul><br><b>Besondere Hinweise</b><br>Der Kunde wünscht eine schnelle Abwicklung und regelmäßige Updates.`);

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

  const handleDeleteDocument = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
  };

  const handlePreview = (index: number) => {
    setPreviewIndex(index);
    setPreviewOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-primary flex items-center gap-3">
              <FolderKanban className="w-6 h-6" />
              Neues Projekt
            </CardTitle>
            {onCancel && (
              <Button size="lg" variant="ghost" onClick={onCancel} data-testid="button-close-project">
                <X className="w-6 h-6" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Linke Spalte: Projektdaten, Kunde, Beschreibung */}
            <div className="col-span-2 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  Projektdaten
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName" data-testid="label-project-name">Projektname</Label>
                    <Input 
                      id="projectName" 
                      placeholder="z.B. Renovierung Bürogebäude" 
                      defaultValue="Neugestaltung Empfangsbereich"
                      data-testid="input-project-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" data-testid="label-status">Status</Label>
                    <Select defaultValue="2">
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Status wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockStatuses.map(status => (
                          <SelectItem key={status.id} value={status.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: status.color }}
                              />
                              {status.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <UserCircle className="w-4 h-4" />
                  Zugeordneter Kunde
                </h3>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200" data-testid="text-customer-name">
                        {mockCustomer.name}
                      </p>
                      <p className="text-sm text-slate-500" data-testid="text-customer-contact">{mockCustomer.contact}</p>
                      <p className="text-sm text-slate-400" data-testid="text-customer-phone">{mockCustomer.phone}</p>
                    </div>
                    <Button variant="outline" className="ml-auto" data-testid="button-change-customer">
                      Kunde ändern
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Beschreibung
                </h3>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Projektbeschreibung eingeben..."
                />
              </div>

              {/* Notizen unter dem Hauptbereich */}
              <NotesSection
                notes={notes}
                onAdd={handleAddNote}
                onDelete={handleDeleteNote}
              />
            </div>

            {/* Rechte Spalte: Termine und Dokumente */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Termine
                </h3>
                <div className="space-y-2">
                  {mockAppointments.map(apt => (
                    <div key={apt.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-border" data-testid={`appointment-card-${apt.id}`}>
                      <p className="font-medium text-sm text-slate-700 dark:text-slate-300" data-testid={`text-appointment-title-${apt.id}`}>{apt.title}</p>
                      <p className="text-xs text-slate-400 mt-1" data-testid={`text-appointment-date-${apt.id}`}>{apt.date}</p>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full" data-testid="button-add-appointment">
                  <Plus className="w-4 h-4 mr-2" />
                  Neuer Termin
                </Button>
                <p className="text-xs text-slate-400 text-center">
                  Termindarstellung wird später ergänzt
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Dokumente
                </h3>
                <div className="space-y-2">
                  {documents.map((doc, index) => (
                    <DocumentCard 
                      key={doc.id} 
                      doc={doc} 
                      onPreview={() => handlePreview(index)}
                      onDelete={() => handleDeleteDocument(doc.id)}
                    />
                  ))}
                </div>
                <Button variant="outline" className="w-full" data-testid="button-add-document">
                  <Plus className="w-4 h-4 mr-2" />
                  Dokument hinzufügen
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border">
            <Button variant="outline" onClick={onCancel} data-testid="button-cancel">
              Abbrechen
            </Button>
            <Button data-testid="button-save-project">
              Projekt speichern
            </Button>
          </div>
        </CardContent>
      </Card>

      <DocumentPreviewDialog
        documents={documents}
        currentIndex={previewIndex}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onNavigate={setPreviewIndex}
      />
    </div>
  );
}
