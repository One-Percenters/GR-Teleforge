"use client";

import { useEffect, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type TrackFeatureCollection = {
  type: "FeatureCollection";
  features: any[];
};

const ZOOM_MIN = 13;
const ZOOM_MAX = 20;
const MAP_CENTER = [33.5326, -86.6194] as const; // roughly center of the circuit

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

export default function Map() {
  const [track, setTrack] = useState<TrackFeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(16);

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

  const handleZoomChange = (delta: number) => {
    setZoom((prev) => {
      const next = prev + delta;
      return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    });
  };

  return (
    <div className="flex h-full min-h-112 flex-col rounded-3xl border border-border bg-card text-foreground shadow-[0_25px_65px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          map
        </p>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-muted-foreground">
          {/* <span>zoom {zoom}</span> */}
          <div className="flex overflow-hidden rounded-full border border-border/70 bg-background/60">
            {/* <button
              type="button"
              onClick={() => handleZoomChange(-1)}
              disabled={zoom <= ZOOM_MIN}
              className="px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary disabled:opacity-40"
              aria-label="Zoom out"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => handleZoomChange(1)}
              disabled={zoom >= ZOOM_MAX}
              className="border-l border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary disabled:opacity-40"
              aria-label="Zoom in"
            >
              +
            </button> */}
          </div>
        </div>
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
        </MapContainer>
        <div className="pointer-events-none absolute inset-4 rounded-3xl border border-white/5" />
      </div>
    </div>
  );
}
