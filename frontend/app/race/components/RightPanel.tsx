'use client';

import { useState, useEffect } from 'react';
import type { ProcessedEvent, TrackName, RaceNumber } from '../types';

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

  const getDriverNumber = (id: string) => id.split('-').pop() || '?';
  const getDriverPosition = (id: string) => {
    const idx = drivers.indexOf(id);
    return idx >= 0 ? idx + 1 : '?';
  };

  // Fetch AI analysis when event changes
  useEffect(() => {
    if (!event) {
      setAnalysis('');
      return;
    }

    const fetchAnalysis = async () => {
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

    fetchAnalysis();
  }, [event, trackName]);

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col text-white">
      {/* GR Branding */}
      <div className="p-5 pt-5 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black">
              <span className="text-white">G</span>
              <span className="text-[#D71921]">R</span>
            </span>
            <span className="text-xs text-zinc-500 font-bold tracking-wider">TELEFORGE</span>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white rounded hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-5 overflow-y-auto flex-1">
        <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Event Analysis</h2>

        {event ? (
          <>
            {/* AI Analysis Section */}
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-purple-400 uppercase tracking-wider font-bold">Gemini AI Analysis</span>
              </div>
              
              {isAnalyzing ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  Analyzing telemetry data...
                </div>
              ) : (
                <p className="text-sm text-zinc-300 leading-relaxed">{analysis}</p>
              )}
            </div>

            {/* Overtake Details */}
            <div className="mb-4">
              <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                Overtake Details
              </h3>

              {/* Winner */}
              <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 mb-3">
                <p className="text-[10px] text-green-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="text-green-500">▲</span> Winner
                </p>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black"
                    style={{ backgroundColor: getDriverColor(event.Winner_ID), color: '#000' }}
                  >
                    P{getDriverPosition(event.Winner_ID)}
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">#{getDriverNumber(event.Winner_ID)}</p>
                    <p className="text-xs text-zinc-500">{event.Winner_ID}</p>
                  </div>
                </div>
              </div>

              {/* Loser */}
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                <p className="text-[10px] text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="text-red-500">▼</span> Overtaken
                </p>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black"
                    style={{ backgroundColor: getDriverColor(event.Loser_ID), color: '#000' }}
                  >
                    P{getDriverPosition(event.Loser_ID)}
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">#{getDriverNumber(event.Loser_ID)}</p>
                    <p className="text-xs text-zinc-500">{event.Loser_ID}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-zinc-900/60 rounded-lg p-3 text-center">
                <p className="text-[9px] text-zinc-500 uppercase">Sector</p>
                <p className="text-lg font-bold text-white">{event.Sector_ID}</p>
              </div>
              <div className="bg-zinc-900/60 rounded-lg p-3 text-center">
                <p className="text-[9px] text-zinc-500 uppercase">Lap</p>
                <p className="text-lg font-bold text-white">{event.Lap_Number}</p>
              </div>
              <div className="bg-zinc-900/60 rounded-lg p-3 text-center">
                <p className="text-[9px] text-zinc-500 uppercase">Time</p>
                <p className="text-lg font-bold text-white">
                  {new Date(event.Timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </p>
              </div>
            </div>

            {/* Telemetry Factor */}
            {event.Reason_Code && event.Reason_Code !== 'Data_Missing' && (
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
                <p className="text-[9px] text-amber-400 uppercase mb-1">Telemetry Factor</p>
                <p className="text-sm font-semibold text-amber-300">
                  {event.Reason_Code.replace(/_/g, ' ')}
                </p>
                {event.Reason_Value && (
                  <p className="text-xs text-zinc-400 mt-1">Delta: {Math.abs(event.Reason_Value).toFixed(2)}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
              <span className="text-4xl">🏎️</span>
            </div>
            <p className="text-zinc-400 text-sm font-semibold">Select an Event</p>
            <p className="text-zinc-600 text-xs mt-1">Click on an overtake marker on the track</p>
            <p className="text-zinc-600 text-xs">to see detailed AI analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}
