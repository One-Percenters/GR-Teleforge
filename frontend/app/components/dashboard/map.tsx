"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
} from "react-leaflet";
// @ts-ignore - Leaflet types not available
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useTelemetry } from "./hooks";

type TrackFeatureCollection = {
  type: "FeatureCollection";
  features: any[];
};

const ZOOM_MIN = 13;
const ZOOM_MAX = 20;
const MAP_CENTER = [33.5326, -86.6194] as const;

const ZoomSync = ({ zoom }: { zoom: number }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(map.getCenter(), zoom, { animate: false });
  }, [map, zoom]);

  return null;
};

const fetchTrack = async (): Promise<TrackFeatureCollection> => {
  const response = await fetch("/api/track", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to fetch track data");
  }

  const { track } = await response.json();
  return track;
};

const CarMarkersLayer = ({
  markers,
}: {
  markers: Array<{
    carNumber: string;
    position: [number, number];
    angle: number;
  }>;
}) => {
  const map = useMap();
  const markersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    markers.forEach((marker) => {
      let leafletMarker = markersRef.current[marker.carNumber];

      if (!leafletMarker) {
        const icon = L.divIcon({
          className: "car-marker",
          html: `<div style="
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #ef4444;
            border: 2px solid rgba(255,255,255,0.7);
            box-shadow: 0 0 12px rgba(239,68,68,0.6);
            transform: rotate(${marker.angle}deg);
          "></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        leafletMarker = L.marker(marker.position, { icon }).addTo(map);
        markersRef.current[marker.carNumber] = leafletMarker;
      } else {
        const icon = L.divIcon({
          className: "car-marker",
          html: `<div style="
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #ef4444;
            border: 2px solid rgba(255,255,255,0.7);
            box-shadow: 0 0 12px rgba(239,68,68,0.6);
            transform: rotate(${marker.angle}deg);
          "></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        leafletMarker.setIcon(icon);
        leafletMarker.setLatLng(marker.position);
      }
    });

    // Remove markers that are no longer in the list
    const currentCarNumbers = new Set(markers.map((m) => m.carNumber));
    Object.keys(markersRef.current).forEach((carNumber) => {
      if (!currentCarNumbers.has(carNumber)) {
        map.removeLayer(markersRef.current[carNumber]);
        delete markersRef.current[carNumber];
      }
    });
  }, [markers, map]);

  useEffect(() => {
    return () => {
      Object.values(markersRef.current).forEach((marker) => {
        map.removeLayer(marker);
      });
      markersRef.current = {};
    };
  }, [map]);

  return null;
};

export default function Map() {
  const [track, setTrack] = useState<TrackFeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(16);
  const telemetry = useTelemetry();

  useEffect(() => {
    let isMounted = true;

    fetchTrack()
      .then((data) => {
        if (isMounted) {
          setTrack(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const carMarkers = useMemo(() => {
    return Object.values(telemetry.cars)
      .filter((car) => car.vboxLat != null && car.vboxLon != null)
      .map((car) => ({
        carNumber: car.carNumber,
        position: [car.vboxLat as number, car.vboxLon as number] as [
          number,
          number
        ],
        angle: car.steeringAngle ?? 0,
      }));
  }, [telemetry.cars]);

  if (error) {
    return (
      <div className="flex h-full min-h-112 w-full items-center justify-center rounded-3xl border border-border bg-card text-primary">
        Unable to load track data
      </div>
    );
  }

  if (!track) {
    return (
      <div className="flex h-full min-h-112 w-full items-center justify-center rounded-3xl border border-border bg-card text-muted-foreground">
        Loading map…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-112 flex-col rounded-3xl border border-border bg-card text-foreground shadow-[0_25px_65px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          map
        </p>
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          racers: {carMarkers.length}
        </p>
      </div>

      <div className="relative flex-1 rounded-b-3xl">
        <MapContainer
          className="h-full w-full rounded-b-3xl"
          center={MAP_CENTER}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          dragging={false}
          zoomControl={false}
          doubleClickZoom={false}
          scrollWheelZoom={false}
          touchZoom={false}
          zoomAnimation={false}
          zoomAnimationThreshold={0}
          zoomAnimationSpeed={0}
          zoomAnimationEasing={0}
        >
          <ZoomSync zoom={zoom} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeoJSON data={track} />
          <CarMarkersLayer markers={carMarkers} />
        </MapContainer>
        <div className="pointer-events-none absolute inset-4 rounded-3xl border border-white/5" />
      </div>
    </div>
  );
}
