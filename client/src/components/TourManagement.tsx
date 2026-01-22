import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Route, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Tour } from "@shared/schema";

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

interface TourManagementProps {
  onCancel?: () => void;
}

function TourCard({
  tour,
  onDelete,
  onColorChange,
  isDeleting,
}: {
  tour: Tour;
  onDelete: () => void;
  onColorChange: (color: string) => void;
  isDeleting: boolean;
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
        disabled={isDeleting}
        className="absolute top-2 right-2"
        style={{ 
          backgroundColor: `${textColor}20`,
          color: textColor 
        }}
        data-testid={`button-delete-tour-${tour.id}`}
      >
        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
      </Button>

      <div className="space-y-3 pr-6">
        <div>
          <label 
            className="block text-xs font-medium mb-1 uppercase tracking-wide"
            style={{ color: textColor, opacity: 0.8 }}
          >
            Name
          </label>
          <div
            className="bg-white/90 border border-white/50 text-slate-800 rounded-md px-3 py-2 text-sm"
            data-testid={`label-tour-name-${tour.id}`}
          >
            {tour.name}
          </div>
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
  const { data: tours = [], isLoading } = useQuery<Tour[]>({
    queryKey: ['/api/tours'],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const hue = Math.floor(Math.random() * 360);
      const saturation = 40 + Math.floor(Math.random() * 30);
      const lightness = 45 + Math.floor(Math.random() * 20);
      const color = hslToHex(hue, saturation, lightness);
      return apiRequest('POST', '/api/tours', { color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, color }: { id: number; color: string }) => {
      return apiRequest('PATCH', `/api/tours/${id}`, { color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/tours/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
    },
  });

  const handleColorChange = (id: number, color: string) => {
    updateMutation.mutate({ id, color });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="bg-card">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <Button size="lg" variant="ghost" onClick={onCancel} data-testid="button-close-tours">
                <X className="w-6 h-6" />
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
                onDelete={() => deleteMutation.mutate(tour.id)}
                onColorChange={(color) => handleColorChange(tour.id, color)}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-new-tour"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Neue Tour
            </Button>

            {onCancel && (
              <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-tours">
                Schließen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
