'use client';

import { useEffect, useRef } from 'react';
import type { ProcessedEvent, TrackName, RaceNumber } from '../types';
import { TRACK_WEATHER, TRACK_INFO } from '../data/weather';

interface LeftPanelProps {
  drivers: string[];
  selectedDriver: string | null;
  events: ProcessedEvent[];
  activeEvents: ProcessedEvent[];
  trackName: TrackName;
  raceNumber: RaceNumber;
  currentLap: number;
  totalLaps: number;
  onDriverSelect: (driverId: string | null) => void;
  getDriverColor: (driverId: string) => string;
}

export function LeftPanel({
  drivers,
  selectedDriver,
  events,
  activeEvents,
  trackName,
  raceNumber,
  currentLap,
  totalLaps,
  onDriverSelect,
  getDriverColor
}: LeftPanelProps) {
  const feedRef = useRef<HTMLDivElement>(null);

  const weather = TRACK_WEATHER[trackName]?.[raceNumber];
  const trackInfo = TRACK_INFO[trackName];

  const getDriverNumber = (driverId: string) => driverId.split('-').pop() || '?';

  const getWeatherIcon = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'sunny': case 'clear': return '☀️';
      case 'partly cloudy': return '⛅';
      case 'overcast': return '☁️';
      default: return '🌤️';
    }
  };

  // Auto scroll feed
  useEffect(() => {
    if (feedRef.current && activeEvents.length > 0) {
      feedRef.current.scrollTop = 0;
    }
  }, [activeEvents]);

  return (
    <div className="p-4 pt-24 h-full flex flex-col overflow-hidden">
      {/* Track Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-black text-white">{trackName}</h2>
          <span className="text-xs text-zinc-500">{trackInfo?.location}</span>
        </div>
        <div className="flex gap-4 text-xs text-zinc-400">
          <span>{trackInfo?.length} mi</span>
          <span>{trackInfo?.turns} turns</span>
        </div>
      </div>

      {/* Weather */}
      {weather && (
        <div className="bg-zinc-900/60 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getWeatherIcon(weather.condition)}</span>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{weather.temperature}°</span>
                <span className="text-xs text-zinc-500">{weather.condition}</span>
              </div>
              <div className="flex gap-3 text-[10px] text-zinc-500 mt-1">
                <span>Track: <span className="text-orange-400">{weather.trackTemp}°</span></span>
                <span>Wind: {weather.windSpeed}mph</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lap Progress */}
      <div className="bg-zinc-900/60 rounded-lg p-3 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Race</span>
          <span className="text-sm font-mono text-white">Lap {currentLap}/{totalLaps}</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#D71921] to-[#ff4d4d]"
            style={{ width: `${(currentLap / totalLaps) * 100}%` }}
          />
        </div>
      </div>

      {/* Live Overtakes */}
      <div className="flex-1 min-h-0 mb-4">
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          Live Overtakes
        </h3>
        <div ref={feedRef} className="space-y-1 overflow-y-auto max-h-36 pr-1">
          {activeEvents.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">Waiting...</p>
          ) : (
            activeEvents.map((item, idx) => (
              <div 
                key={item.Critical_Event_ID}
                className={`flex items-center gap-2 p-2 rounded text-xs ${
                  idx === 0 ? 'bg-red-500/20 border border-red-500/30' : 'bg-zinc-900/40'
                }`}
                style={{ opacity: 1 - idx * 0.08 }}
              >
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ backgroundColor: getDriverColor(item.Winner_ID), color: '#000' }}
                >
                  {getDriverNumber(item.Winner_ID)}
                </span>
                <span className="text-green-400">→</span>
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ backgroundColor: getDriverColor(item.Loser_ID), color: '#000' }}
                >
                  {getDriverNumber(item.Loser_ID)}
                </span>
                <span className="text-zinc-500 ml-auto">
                  #{getDriverNumber(item.Winner_ID)} → #{getDriverNumber(item.Loser_ID)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Standings */}
      <div className="flex-shrink-0">
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Standings</h3>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {drivers.slice(0, 10).map((driver, idx) => (
            <button
              key={driver}
              onClick={() => onDriverSelect(selectedDriver === driver ? null : driver)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all ${
                selectedDriver === driver 
                  ? 'bg-white/10 ring-1 ring-[#D71921]' 
                  : 'hover:bg-white/5'
              }`}
            >
              <span className="text-[10px] text-zinc-500 w-5">P{idx + 1}</span>
              <span 
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ backgroundColor: getDriverColor(driver), color: '#000' }}
              >
                {getDriverNumber(driver)}
              </span>
              <span className="text-xs text-zinc-400">#{getDriverNumber(driver)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
