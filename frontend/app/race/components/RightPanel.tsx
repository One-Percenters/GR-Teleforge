'use client';

import { useState, useEffect } from 'react';
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
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const weather = TRACK_WEATHER[trackName]?.[raceNumber];
  const trackInfo = TRACK_INFO[trackName];

  const getDriverNumber = (id: string) => id.split('-').pop() || '?';
  const getDriverPosition = (id: string) => {
    const idx = drivers.indexOf(id);
    return idx >= 0 ? idx + 1 : '?';
  };

  // Fetch Gemini analysis when event changes
  useEffect(() => {
    if (!event) {
      setAnalysis('');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis('');

    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        Track: trackName
      })
    })
      .then(res => res.json())
      .then(data => {
        setAnalysis(data.analysis || 'Analysis unavailable.');
      })
      .catch(() => {
        setAnalysis('Unable to generate analysis.');
      })
      .finally(() => {
        setIsAnalyzing(false);
      });
  }, [event, trackName]);

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white z-10"
      >
        ✕
      </button>

      <div className="p-5 pt-16 overflow-y-auto flex-1">
        {/* Track Conditions */}
        <div className="mb-6">
          <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Track Conditions</h2>
          <div className="bg-zinc-900/60 rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{trackName}</h3>
                <p className="text-xs text-zinc-500">{trackInfo?.location}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs mb-4">
              <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                <p className="text-zinc-500">Length</p>
                <p className="text-white font-semibold">{trackInfo?.length} mi</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                <p className="text-zinc-500">Turns</p>
                <p className="text-white font-semibold">{trackInfo?.turns}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                <p className="text-zinc-500">Surface</p>
                <p className="text-white font-semibold">Asphalt</p>
              </div>
            </div>

            {weather && (
              <div className="border-t border-zinc-800 pt-3">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">
                    {weather.condition === 'Sunny' ? '☀️' : 
                     weather.condition === 'Partly Cloudy' ? '⛅' : '☁️'}
                  </span>
                  <div>
                    <p className="text-2xl font-bold text-white">{weather.temperature}°F</p>
                    <p className="text-xs text-zinc-500">{weather.condition}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Track Temp</span>
                    <span className="text-orange-400 font-semibold">{weather.trackTemp}°F</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Humidity</span>
                    <span className="text-white">{weather.humidity}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Wind</span>
                    <span className="text-white">{weather.windSpeed} mph {weather.windDir}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Rain Chance</span>
                    <span className="text-blue-400">{weather.rainChance}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Event Details */}
        {event && (
          <div>
            <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Overtake Event
            </h2>

            {/* Gemini Analysis */}
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <span className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">AI Analysis</span>
              </div>
              {isAnalyzing ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Analyzing telemetry...
                </div>
              ) : (
                <p className="text-sm text-zinc-300 leading-relaxed">{analysis}</p>
              )}
            </div>

            {/* Winner */}
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 mb-3">
              <p className="text-[10px] text-green-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="text-green-500">▲</span> Winner
              </p>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: getDriverColor(event.Winner_ID), color: '#000' }}
                >
                  P{getDriverPosition(event.Winner_ID)}
                </div>
                <div>
                  <p className="text-xl font-black text-white">#{getDriverNumber(event.Winner_ID)}</p>
                  <p className="text-xs text-zinc-500">{event.Winner_ID}</p>
                </div>
              </div>
            </div>

            {/* Loser */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-4">
              <p className="text-[10px] text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="text-red-500">▼</span> Overtaken
              </p>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: getDriverColor(event.Loser_ID), color: '#000' }}
                >
                  P{getDriverPosition(event.Loser_ID)}
                </div>
                <div>
                  <p className="text-xl font-black text-white">#{getDriverNumber(event.Loser_ID)}</p>
                  <p className="text-xs text-zinc-500">{event.Loser_ID}</p>
                </div>
              </div>
            </div>

            {/* Event Metadata */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-zinc-900/60 rounded-lg p-3 text-center">
                <p className="text-[10px] text-zinc-500 uppercase">Sector</p>
                <p className="text-lg font-bold text-white">{event.Sector_ID}</p>
              </div>
              <div className="bg-zinc-900/60 rounded-lg p-3 text-center">
                <p className="text-[10px] text-zinc-500 uppercase">Lap</p>
                <p className="text-lg font-bold text-white">{event.Lap_Number}</p>
              </div>
              <div className="bg-zinc-900/60 rounded-lg p-3 text-center">
                <p className="text-[10px] text-zinc-500 uppercase">Time</p>
                <p className="text-lg font-bold text-white">
                  {new Date(event.Timestamp).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false 
                  })}
                </p>
              </div>
            </div>

            {/* Reason */}
            {event.Reason_Code && event.Reason_Code !== 'Data_Missing' && (
              <div className="mt-4 bg-zinc-900/60 rounded-lg p-3">
                <p className="text-[10px] text-zinc-500 uppercase mb-1">Primary Factor</p>
                <p className="text-sm font-semibold text-amber-400">
                  {event.Reason_Code.replace(/_/g, ' ')}
                </p>
                {event.Reason_Value && (
                  <p className="text-xs text-zinc-400 mt-1">
                    Delta: {event.Reason_Value.toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!event && (
          <div className="text-center text-zinc-500 py-8">
            <p className="text-sm">Click an event on the track</p>
            <p className="text-xs mt-1">to see detailed analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}
