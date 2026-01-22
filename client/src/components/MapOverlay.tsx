import { useState } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface Tour {
  id: string;
  name: string;
  color: string;
}

interface MapAppointment {
  id: string;
  customerName: string;
  customerPlz: string;
  customerCity: string;
  projectName: string;
  tourId: string;
  lat: number;
  lng: number;
}

interface MapOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const tours: Tour[] = [
  { id: "1", name: "Tour 1", color: "#4A90A4" },
  { id: "2", name: "Tour 2", color: "#E8B86D" },
  { id: "3", name: "Tour 3", color: "#7BA05B" },
];

const demoAppointments: MapAppointment[] = [
  {
    id: "1",
    customerName: "Müller GmbH",
    customerPlz: "80331",
    customerCity: "München",
    projectName: "Renovierung Büro",
    tourId: "1",
    lat: 48.1351,
    lng: 11.5820
  },
  {
    id: "2",
    customerName: "Schmidt, Anna",
    customerPlz: "10115",
    customerCity: "Berlin",
    projectName: "Gartenanlage",
    tourId: "2",
    lat: 52.5328,
    lng: 13.3888
  },
  {
    id: "3",
    customerName: "Weber & Söhne",
    customerPlz: "50667",
    customerCity: "Köln",
    projectName: "Dachsanierung",
    tourId: "1",
    lat: 50.9375,
    lng: 6.9603
  },
  {
    id: "4",
    customerName: "Fischer, Thomas",
    customerPlz: "60313",
    customerCity: "Frankfurt",
    projectName: "Badumbau",
    tourId: "2",
    lat: 50.1109,
    lng: 8.6821
  },
  {
    id: "5",
    customerName: "Klein, Peter",
    customerPlz: "20095",
    customerCity: "Hamburg",
    projectName: "Parkett verlegen",
    tourId: "2",
    lat: 53.5511,
    lng: 9.9937
  },
  {
    id: "6",
    customerName: "Becker, Maria",
    customerPlz: "70173",
    customerCity: "Stuttgart",
    projectName: "Wintergarten",
    tourId: "3",
    lat: 48.7758,
    lng: 9.1829
  },
  {
    id: "7",
    customerName: "Hoffmann AG",
    customerPlz: "40213",
    customerCity: "Düsseldorf",
    projectName: "Fassade streichen",
    tourId: "1",
    lat: 51.2277,
    lng: 6.7735
  },
  {
    id: "8",
    customerName: "Neumann GmbH",
    customerPlz: "30159",
    customerCity: "Hannover",
    projectName: "Elektroinstallation",
    tourId: "3",
    lat: 52.3759,
    lng: 9.7320
  },
];

function createColoredIcon(color: string) {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path fill="${color}" stroke="#333" stroke-width="1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="3" fill="white"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: "custom-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export function MapOverlay({ isOpen, onClose }: MapOverlayProps) {
  const [activeTours, setActiveTours] = useState<Set<string>>(new Set(["1", "2", "3"]));

  const toggleTour = (tourId: string) => {
    setActiveTours(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tourId)) {
        newSet.delete(tourId);
      } else {
        newSet.add(tourId);
      }
      return newSet;
    });
  };

  const filteredAppointments = demoAppointments.filter(a => activeTours.has(a.tourId));

  const getTourById = (tourId: string): Tour => {
    return tours.find(t => t.id === tourId) || tours[0];
  };

  if (!isOpen) return null;

  const germanCenter: [number, number] = [51.1657, 10.4515];

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      data-testid="map-overlay"
    >
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Termine auf Karte</h2>
            <Badge variant="secondary" className="ml-2">
              {filteredAppointments.length} Termine
            </Badge>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-map">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-border">
          <span className="text-sm text-muted-foreground mr-2">Filter:</span>
          {tours.map((tour) => (
            <Button
              key={tour.id}
              size="sm"
              variant={activeTours.has(tour.id) ? "default" : "outline"}
              className="gap-2"
              style={{
                backgroundColor: activeTours.has(tour.id) ? tour.color : undefined,
                borderColor: tour.color,
                color: activeTours.has(tour.id) ? "white" : tour.color,
              }}
              onClick={() => toggleTour(tour.id)}
              data-testid={`button-filter-tour-${tour.id}`}
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeTours.has(tour.id) ? "white" : tour.color }}
              />
              {tour.name}
            </Button>
          ))}
        </div>

        <div className="flex-1 relative">
          <MapContainer
            center={germanCenter}
            zoom={6}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filteredAppointments.map((appointment) => {
              const tour = getTourById(appointment.tourId);
              return (
                <Marker
                  key={appointment.id}
                  position={[appointment.lat, appointment.lng]}
                  icon={createColoredIcon(tour.color)}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      <div className="font-bold text-sm mb-1">{appointment.customerName}</div>
                      <div className="text-xs text-slate-500 mb-2">
                        {appointment.customerPlz} {appointment.customerCity}
                      </div>
                      <div className="text-xs mb-2">{appointment.projectName}</div>
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tour.color }}
                        />
                        <span className="text-xs text-slate-500">{tour.name}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>,
    document.body
  );
}
