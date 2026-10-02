"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { Area, Gym, OsmGym, OutdoorArea } from "@/lib/types";

export interface AreaMapProps {
  area: Area;
  outdoor: OutdoorArea[];
  gyms: Gym[];
  osmGyms: OsmGym[];
  onPick?: (lat: number, lng: number) => void;
  onSelect?: (key: string) => void;
}

function FitArea({ area }: { area: Area }) {
  const map = useMap();
  useEffect(() => {
    // Rough zoom so the search circle fills the view.
    const zoom = Math.round(Math.log2(40000 / (area.radiusKm * 2.2)) - 0.5);
    map.setView([area.lat, area.lng], Math.min(15, Math.max(4, zoom)));
  }, [map, area.lat, area.lng, area.radiusKm]);
  return null;
}

function ClickToPick({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function AreaMap({ area, outdoor, gyms, osmGyms, onPick, onSelect }: AreaMapProps) {
  return (
    <MapContainer center={[area.lat, area.lng]} zoom={10} className="h-full w-full rounded-lg" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitArea area={area} />
      <ClickToPick onPick={onPick} />
      <Circle center={[area.lat, area.lng]} radius={area.radiusKm * 1000} pathOptions={{ color: "#57534e", weight: 1, fillOpacity: 0.04 }} />
      {outdoor.map((a) => (
        <CircleMarker
          key={a.id}
          center={[a.lat, a.lng]}
          radius={Math.min(14, 5 + Math.log2(1 + a.totalClimbs))}
          pathOptions={{ color: "#15803d", fillColor: "#22c55e", fillOpacity: 0.8, weight: 1 }}
          eventHandlers={{ click: () => onSelect?.(`o:${a.id}`) }}
        >
          <Popup>
            <strong>{a.name}</strong>
            <br />
            {a.totalClimbs} climbs · {a.distanceKm} km
            <br />
            <a href={a.url} target="_blank" rel="noreferrer">View on OpenBeta ↗</a>
          </Popup>
        </CircleMarker>
      ))}
      {gyms.map((g) => (
        <CircleMarker
          key={g.id}
          center={[g.lat, g.lng]}
          radius={9}
          pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 2 }}
          eventHandlers={{ click: () => onSelect?.(`g:${g.id}`) }}
        >
          <Popup>
            <strong>{g.name}</strong>
            <br />
            {g.climbCount ?? 0} climbs added
            <br />
            <a href={`/gyms/${g.id}`}>Open gym →</a>
          </Popup>
        </CircleMarker>
      ))}
      {osmGyms.map((g) => (
        <CircleMarker
          key={g.osmId}
          center={[g.lat, g.lng]}
          radius={7}
          pathOptions={{ color: "#1d4ed8", fillColor: "#bfdbfe", fillOpacity: 0.9, weight: 1, dashArray: "3" }}
          eventHandlers={{ click: () => onSelect?.(`m:${g.osmId}`) }}
        >
          <Popup>
            <strong>{g.name}</strong>
            <br />
            Indoor gym (OpenStreetMap)
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
