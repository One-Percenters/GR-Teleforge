'use client';

import { useState, useEffect } from 'react';
import type { ProcessedEvent, TrackName, RaceNumber } from '../types';

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
  const [selectedEventForAnalysis, setSelectedEventForAnalysis] = useState<ProcessedEvent | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getDriverNumber = (driverId: string) => driverId.split('-').pop() || '?';

  // Fetch analysis when event selected
  const analyzeEvent = async (event: ProcessedEvent) => {
    setSelectedEventForAnalysis(event);
    setIsAnalyzing(true);
    setAnalysis('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...event, Track: trackName })
      });
      const data = await res.json();
      setAnalysis(data.analysis || 'Analysis unavailable.');
    } catch {
      setAnalysis('Unable to generate analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-4 pt-20 h-full flex flex-col overflow-hidden text-white">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-black text-white">EVENT ANALYSIS</h2>
        <p className="text-xs text-zinc-500">Click an overtake to analyze</p>
      </div>

      {/* Selected Event Analysis */}
      {selectedEventForAnalysis && (
        <div className="mb-4 bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">AI Analysis</span>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <span 
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: getDriverColor(selectedEventForAnalysis.Winner_ID), color: '#000' }}
            >
              {getDriverNumber(selectedEventForAnalysis.Winner_ID)}
            </span>
            <span className="text-green-400 text-xs">overtakes</span>
            <span 
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: getDriverColor(selectedEventForAnalysis.Loser_ID), color: '#000' }}
            >
              {getDriverNumber(selectedEventForAnalysis.Loser_ID)}
            </span>
            <span className="text-zinc-500 text-xs ml-auto">
              L{selectedEventForAnalysis.Lap_Number} • {selectedEventForAnalysis.Sector_ID}
            </span>
          </div>

          {isAnalyzing ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Analyzing telemetry data...
            </div>
          ) : (
            <p className="text-sm text-zinc-300 leading-relaxed">{analysis}</p>
          )}

          <button 
            onClick={() => setSelectedEventForAnalysis(null)}
            className="mt-3 text-xs text-zinc-500 hover:text-white"
          >
            Clear analysis
          </button>
        </div>
      )}

      {/* Live Overtakes */}
      <div className="flex-1 min-h-0">
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          Live Overtakes
        </h3>
        <div className="space-y-1 overflow-y-auto max-h-[250px] pr-1">
          {activeEvents.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">Waiting for overtakes...</p>
          ) : (
            activeEvents.slice(0, 12).map((event, idx) => (
              <button
                key={event.Critical_Event_ID}
                onClick={() => analyzeEvent(event)}
                className={`w-full flex items-center gap-2 p-2 rounded text-xs transition-all hover:bg-zinc-800 ${
                  selectedEventForAnalysis?.Critical_Event_ID === event.Critical_Event_ID 
                    ? 'bg-blue-900/30 border border-blue-500/30' 
                    : idx === 0 ? 'bg-red-500/20 border border-red-500/30' : 'bg-zinc-900/40'
                }`}
                style={{ opacity: 1 - idx * 0.06 }}
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
                <span className="text-zinc-500 ml-auto text-[10px]">
                  #{getDriverNumber(event.Winner_ID)} → #{getDriverNumber(event.Loser_ID)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Standings */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Standings</h3>
        <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
          {drivers.slice(0, 10).map((driver, idx) => (
            <button
              key={driver}
              onClick={() => onDriverSelect(selectedDriver === driver ? null : driver)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-left text-xs transition-all ${
                selectedDriver === driver ? 'bg-white/10 ring-1 ring-[#D71921]' : 'hover:bg-white/5'
              }`}
            >
              <span className="text-[9px] text-zinc-500 w-4">P{idx + 1}</span>
              <span 
                className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold"
                style={{ backgroundColor: getDriverColor(driver), color: '#000' }}
              >
                {getDriverNumber(driver)}
              </span>
              <span className="text-zinc-400">#{getDriverNumber(driver)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
