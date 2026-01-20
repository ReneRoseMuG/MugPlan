import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Route } from "lucide-react";

interface Tour {
  id: string;
  name: string;
  color: string;
}

interface TourManagementProps {
  onCancel?: () => void;
}

const initialTours: Tour[] = [
  { id: "1", name: "Tour Nord", color: "#4A90A4" },
  { id: "2", name: "Tour Süd", color: "#E8B86D" },
  { id: "3", name: "Tour West", color: "#7BA05B" },
];

function TourCard({
  tour,
  onDelete,
  onNameChange,
  onColorChange,
}: {
  tour: Tour;
  onDelete: () => void;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
}) {
  const getContrastColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
  };

  const textColor = getContrastColor(tour.color);

  return (
    <div
      className="relative rounded-lg p-4 shadow-sm border"
      style={{ backgroundColor: tour.color }}
      data-testid={`card-tour-${tour.id}`}
    >
      <Button
        size="icon"
        variant="ghost"
        onClick={onDelete}
        className="absolute top-2 right-2"
        style={{ 
          backgroundColor: `${textColor}20`,
          color: textColor 
        }}
        data-testid={`button-delete-tour-${tour.id}`}
      >
        <X className="w-4 h-4" />
      </Button>

      <div className="space-y-3 pr-6">
        <div>
          <label 
            className="block text-xs font-medium mb-1 uppercase tracking-wide"
            style={{ color: textColor, opacity: 0.8 }}
          >
            Name
          </label>
          <Input
            value={tour.name}
            onChange={(e) => onNameChange(e.target.value)}
            className="bg-white/90 border-white/50 text-slate-800"
            data-testid={`input-tour-name-${tour.id}`}
          />
        </div>

        <div>
          <label 
            className="block text-xs font-medium mb-1 uppercase tracking-wide"
            style={{ color: textColor, opacity: 0.8 }}
          >
            Farbe
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={tour.color}
              onChange={(e) => onColorChange(e.target.value)}
              className="rounded cursor-pointer border-2 border-white/50"
              data-testid={`input-tour-color-${tour.id}`}
            />
            <Input
              value={tour.color}
              onChange={(e) => onColorChange(e.target.value)}
              className="bg-white/90 border-white/50 text-slate-800 font-mono uppercase"
              maxLength={7}
              data-testid={`input-tour-color-text-${tour.id}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TourManagement({ onCancel }: TourManagementProps) {
  const [tours, setTours] = useState<Tour[]>(initialTours);

  const handleDelete = (id: string) => {
    setTours(tours.filter((t) => t.id !== id));
  };

  const handleNameChange = (id: string, name: string) => {
    setTours(tours.map((t) => (t.id === id ? { ...t, name } : t)));
  };

  const handleColorChange = (id: string, color: string) => {
    setTours(tours.map((t) => (t.id === id ? { ...t, color } : t)));
  };

  const handleAddTour = () => {
    const newId = String(Date.now());
    const colors = ["#D4A574", "#8B9DC3", "#C49A6C", "#6B8E8E", "#B8860B"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setTours([...tours, { id: newId, name: "Neue Tour", color: randomColor }]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Route className="w-5 h-5" />
              Touren Übersicht
            </CardTitle>
            {onCancel && (
              <Button size="icon" variant="ghost" onClick={onCancel} data-testid="button-close-tours">
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="list-tours">
            {tours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                onDelete={() => handleDelete(tour.id)}
                onNameChange={(name) => handleNameChange(tour.id, name)}
                onColorChange={(color) => handleColorChange(tour.id, color)}
              />
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handleAddTour}
              className="flex items-center gap-2"
              data-testid="button-new-tour"
            >
              <Plus className="w-4 h-4" />
              Neue Tour
            </Button>

            <div className="flex gap-2">
              {onCancel && (
                <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-tours">
                  Abbrechen
                </Button>
              )}
              <Button data-testid="button-save-tours">
                Speichern
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
