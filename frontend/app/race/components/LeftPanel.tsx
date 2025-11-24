'use client';

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
  const weather = TRACK_WEATHER[trackName]?.[raceNumber];
  const trackInfo = TRACK_INFO[trackName];

  const getDriverNumber = (driverId: string) => driverId.split('-').pop() || '?';

  return (
    <div className="p-4 pt-20 h-full flex flex-col overflow-hidden text-white">
      {/* Track Info Header */}
      <div className="mb-4">
        <h2 className="text-xl font-black text-white">{trackName}</h2>
        <p className="text-xs text-zinc-500">{trackInfo?.location}</p>
      </div>

      {/* Track Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-zinc-900/60 rounded-lg p-2 text-center">
          <p className="text-[9px] text-zinc-500 uppercase">Length</p>
          <p className="text-sm font-bold text-white">{trackInfo?.length} mi</p>
        </div>
        <div className="bg-zinc-900/60 rounded-lg p-2 text-center">
          <p className="text-[9px] text-zinc-500 uppercase">Turns</p>
          <p className="text-sm font-bold text-white">{trackInfo?.turns}</p>
        </div>
        <div className="bg-zinc-900/60 rounded-lg p-2 text-center">
          <p className="text-[9px] text-zinc-500 uppercase">Lap</p>
          <p className="text-sm font-bold text-white">{currentLap}/{totalLaps}</p>
        </div>
      </div>

      {/* Weather */}
      {weather && (
        <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/20 rounded-xl p-3 mb-4">
          <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Track Conditions</h3>
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {weather.condition === 'Sunny' ? '☀️' : 
               weather.condition === 'Partly Cloudy' ? '⛅' : '☁️'}
            </span>
            <div>
              <p className="text-2xl font-black text-white">{weather.temperature}°F</p>
              <p className="text-[10px] text-zinc-500">{weather.condition}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="bg-zinc-900/40 rounded p-2">
              <p className="text-[9px] text-zinc-500">Track</p>
              <p className="text-orange-400 font-bold">{weather.trackTemp}°F</p>
            </div>
            <div className="bg-zinc-900/40 rounded p-2">
              <p className="text-[9px] text-zinc-500">Humidity</p>
              <p className="text-cyan-400 font-bold">{weather.humidity}%</p>
            </div>
            <div className="bg-zinc-900/40 rounded p-2">
              <p className="text-[9px] text-zinc-500">Wind</p>
              <p className="text-white font-semibold">{weather.windSpeed} mph</p>
            </div>
            <div className="bg-zinc-900/40 rounded p-2">
              <p className="text-[9px] text-zinc-500">Rain</p>
              <p className="text-blue-400 font-semibold">{weather.rainChance}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Standings */}
      <div className="flex-1 min-h-0">
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          Live Standings
        </h3>
        <div className="space-y-1 overflow-y-auto max-h-[300px] pr-1">
          {drivers.slice(0, 20).map((driver, idx) => (
            <button
              key={driver}
              onClick={() => onDriverSelect(selectedDriver === driver ? null : driver)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                selectedDriver === driver 
                  ? 'bg-[#D71921]/20 ring-1 ring-[#D71921]' 
                  : 'bg-zinc-900/40 hover:bg-zinc-800/60'
              }`}
            >
              <span className={`text-xs font-bold w-6 ${idx < 3 ? 'text-[#D71921]' : 'text-zinc-500'}`}>
                P{idx + 1}
              </span>
              <span 
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: getDriverColor(driver), color: '#000' }}
              >
                {getDriverNumber(driver)}
              </span>
              <span className="text-sm text-zinc-300 flex-1">
                #{getDriverNumber(driver)}
              </span>
              {idx === 0 && (
                <span className="text-[9px] text-yellow-500 font-bold">LEADER</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Live Events Feed */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          Recent Overtakes
        </h3>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {activeEvents.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">No recent overtakes</p>
          ) : (
            activeEvents.slice(0, 4).map((event, idx) => (
              <div
                key={event.Critical_Event_ID}
                className={`flex items-center gap-2 p-2 rounded text-xs ${
                  idx === 0 ? 'bg-red-500/20 border border-red-500/30' : 'bg-zinc-900/40'
                }`}
                style={{ opacity: 1 - idx * 0.15 }}
              >
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ backgroundColor: getDriverColor(event.Winner_ID), color: '#000' }}
                >
                  {getDriverNumber(event.Winner_ID)}
                </span>
                <span className="text-green-400">→</span>
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ backgroundColor: getDriverColor(event.Loser_ID), color: '#000' }}
                >
                  {getDriverNumber(event.Loser_ID)}
                </span>
                <span className="text-zinc-500 ml-auto text-[10px]">L{event.Lap_Number}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
