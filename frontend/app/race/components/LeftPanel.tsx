'use client';

import { useState, useEffect, useRef } from 'react';
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

interface EventFeedItem {
  id: string;
  winnerId: string;
  loserId: string;
  timestamp: number;
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
  const [isOpen, setIsOpen] = useState(true);
  const [eventFeed, setEventFeed] = useState<EventFeedItem[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  const weather = TRACK_WEATHER[trackName]?.[raceNumber];
  const trackInfo = TRACK_INFO[trackName];

  // Add new events to feed
  useEffect(() => {
    if (activeEvents.length > 0) {
      const newItems = activeEvents.map(e => ({
        id: e.Critical_Event_ID,
        winnerId: e.Winner_ID,
        loserId: e.Loser_ID,
        timestamp: Date.now()
      }));
      
      setEventFeed(prev => {
        const existing = new Set(prev.map(p => p.id));
        const toAdd = newItems.filter(n => !existing.has(n.id));
        return [...toAdd, ...prev].slice(0, 15); // Keep last 15
      });
    }
  }, [activeEvents]);

  // Get driver number
  const getDriverNumber = (driverId: string) => {
    const parts = driverId.split('-');
    return parts[parts.length - 1] || '?';
  };

  // Weather icon
  const getWeatherIcon = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'sunny': case 'clear': return '☀️';
      case 'partly cloudy': return '⛅';
      case 'overcast': return '☁️';
      default: return '🌤️';
    }
  };

  return (
    <div 
      className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ${
        isOpen ? 'w-80' : 'w-12'
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-16 bg-zinc-900 border border-zinc-700 rounded-r flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all z-10"
      >
        {isOpen ? '‹' : '›'}
      </button>

      <div className={`h-full bg-[#0a0a0a] border-r border-zinc-800 overflow-hidden ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="p-4 pt-20 h-full flex flex-col overflow-y-auto">
          
          {/* Track Info Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black text-white">{trackName}</h2>
              <span className="text-xs text-zinc-500">{trackInfo?.location}</span>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-zinc-400">{trackInfo?.length} mi</span>
              <span className="text-zinc-400">{trackInfo?.turns} turns</span>
            </div>
          </div>

          {/* Weather */}
          {weather && (
            <div className="bg-zinc-900/50 rounded-lg p-3 mb-4">
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
                    <span>Rain: {weather.precipitation}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lap Progress */}
          <div className="bg-zinc-900/50 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Race Progress</span>
              <span className="text-sm font-mono text-white">Lap {currentLap}/{totalLaps}</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#D71921] to-[#ff4d4d] transition-all"
                style={{ width: `${(currentLap / totalLaps) * 100}%` }}
              />
            </div>
          </div>

          {/* Live Event Feed */}
          <div className="flex-1 min-h-0 mb-4">
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Live Overtakes
            </h3>
            <div 
              ref={feedRef}
              className="space-y-1 overflow-y-auto max-h-48 pr-1"
            >
              {eventFeed.length === 0 ? (
                <p className="text-xs text-zinc-600 italic">Waiting for action...</p>
              ) : (
                eventFeed.map((item, idx) => (
                  <div 
                    key={item.id}
                    className={`flex items-center gap-2 p-2 rounded bg-zinc-900/50 transition-all ${
                      idx === 0 ? 'ring-1 ring-red-500/50 bg-red-500/10' : ''
                    }`}
                    style={{ opacity: 1 - idx * 0.06 }}
                  >
                    <span 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ backgroundColor: getDriverColor(item.winnerId), color: '#000' }}
                    >
                      {getDriverNumber(item.winnerId)}
                    </span>
                    <span className="text-green-400 text-xs">→</span>
                    <span 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ backgroundColor: getDriverColor(item.loserId), color: '#000' }}
                    >
                      {getDriverNumber(item.loserId)}
                    </span>
                    <span className="text-[10px] text-zinc-500 ml-auto">
                      #{getDriverNumber(item.winnerId)} overtakes #{getDriverNumber(item.loserId)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Standings */}
          <div>
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Standings</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
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
                  <span className="text-xs text-zinc-500 w-5">P{idx + 1}</span>
                  <span 
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ backgroundColor: getDriverColor(driver), color: '#000' }}
                  >
                    {getDriverNumber(driver)}
                  </span>
                  <span className="text-xs text-zinc-400 flex-1">#{getDriverNumber(driver)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
