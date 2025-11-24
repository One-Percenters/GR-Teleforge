'use client';

import type { ProcessedEvent, TrackName, RaceNumber } from '../types';
import { TRACK_WEATHER, TRACK_INFO } from '../data/weather';

interface RightPanelProps {
  isOpen: boolean;
  event: ProcessedEvent | null;
  drivers: string[];
  trackName: TrackName;
  raceNumber: RaceNumber;
  onClose: () => void;
  getDriverColor: (driverId: string) => string;
}

export function RightPanel({
  isOpen,
  event,
  drivers,
  trackName,
  raceNumber,
  onClose,
  getDriverColor
}: RightPanelProps) {
  const weather = TRACK_WEATHER[trackName]?.[raceNumber];
  const trackInfo = TRACK_INFO[trackName];

  // Get driver number from ID
  const getDriverNumber = (driverId: string) => {
    const parts = driverId.split('-');
    return parts[parts.length - 1] || '?';
  };

  // Get driver position in list
  const getDriverPosition = (driverId: string) => {
    return drivers.indexOf(driverId) + 1;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      });
    } catch {
      return timestamp;
    }
  };

  // Weather icon
  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return '☀️';
      case 'partly cloudy':
        return '⛅';
      case 'overcast':
        return '☁️';
      case 'rainy':
        return '🌧️';
      default:
        return '🌤️';
    }
  };

  return (
    <div 
      className={`absolute right-0 top-0 h-full z-40 transition-all duration-300 ease-out ${
        isOpen ? 'w-96' : 'w-0'
      }`}
    >
      <div className={`h-full bg-[#0d0d0d] border-l border-zinc-800/80 overflow-hidden transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="p-6 pt-28 h-full overflow-y-auto">
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-20 right-4 w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-all"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Track & Weather Info (always visible) */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-zinc-500 tracking-[0.15em] uppercase mb-4">
              Track Conditions
            </h2>
            
            {/* Track Info */}
            <div className="bg-zinc-900 rounded-lg p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-white">{trackName}</span>
                <span className="text-xs text-zinc-500">{trackInfo?.location}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-zinc-500">Length</p>
                  <p className="text-white font-mono">{trackInfo?.length} mi</p>
                </div>
                <div>
                  <p className="text-zinc-500">Turns</p>
                  <p className="text-white font-mono">{trackInfo?.turns}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Surface</p>
                  <p className="text-white font-mono">{trackInfo?.surface}</p>
                </div>
              </div>
            </div>

            {/* Weather */}
            {weather && (
              <div className="bg-zinc-900 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{getWeatherIcon(weather.condition)}</span>
                  <div>
                    <p className="text-2xl font-bold text-white">{weather.temperature}°F</p>
                    <p className="text-xs text-zinc-400">{weather.condition}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-800 rounded p-2">
                    <p className="text-zinc-500">Track Temp</p>
                    <p className="text-orange-400 font-mono font-bold">{weather.trackTemp}°F</p>
                  </div>
                  <div className="bg-zinc-800 rounded p-2">
                    <p className="text-zinc-500">Humidity</p>
                    <p className="text-blue-400 font-mono font-bold">{weather.humidity}%</p>
                  </div>
                  <div className="bg-zinc-800 rounded p-2">
                    <p className="text-zinc-500">Wind</p>
                    <p className="text-white font-mono">{weather.windSpeed} mph {weather.windDirection}</p>
                  </div>
                  <div className="bg-zinc-800 rounded p-2">
                    <p className="text-zinc-500">Rain Chance</p>
                    <p className="text-cyan-400 font-mono font-bold">{weather.precipitation}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Event Details (if selected) */}
          {event && (
            <div className="border-t border-zinc-800 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-xs font-bold text-red-500 tracking-[0.15em] uppercase">
                  Overtake Event
                </h2>
              </div>

              {/* Winner */}
              <div className="mb-3">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center text-green-400 text-[8px]">▲</span>
                  Winner
                </p>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black"
                      style={{ backgroundColor: getDriverColor(event.Winner_ID), color: '#000' }}
                    >
                      P{getDriverPosition(event.Winner_ID)}
                    </span>
                    <div>
                      <p className="text-xl font-mono text-white font-bold">#{getDriverNumber(event.Winner_ID)}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{event.Winner_ID}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loser */}
              <div className="mb-4">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-red-500/30 flex items-center justify-center text-red-400 text-[8px]">▼</span>
                  Overtaken
                </p>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black"
                      style={{ backgroundColor: getDriverColor(event.Loser_ID), color: '#000' }}
                    >
                      P{getDriverPosition(event.Loser_ID)}
                    </span>
                    <div>
                      <p className="text-xl font-mono text-white font-bold">#{getDriverNumber(event.Loser_ID)}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{event.Loser_ID}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Meta */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-zinc-900 rounded p-2">
                  <p className="text-[10px] text-zinc-500">Sector</p>
                  <p className="text-sm font-mono text-white font-bold">{event.Sector_ID}</p>
                </div>
                <div className="bg-zinc-900 rounded p-2">
                  <p className="text-[10px] text-zinc-500">Lap</p>
                  <p className="text-sm font-mono text-white font-bold">{event.Lap_Number}</p>
                </div>
                <div className="bg-zinc-900 rounded p-2">
                  <p className="text-[10px] text-zinc-500">Time</p>
                  <p className="text-sm font-mono text-white">{formatTimestamp(event.Timestamp)}</p>
                </div>
              </div>

              {event.Reason_Code && event.Reason_Code !== 'Data_Missing' && (
                <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-[10px] text-zinc-500 uppercase mb-1">Reason</p>
                  <p className="text-sm font-mono text-red-400 font-bold">
                    {event.Reason_Code.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
