'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { PlaybackState, ProcessedEvent } from '../types';

interface UsePlaybackOptions {
  duration: number;
  events: ProcessedEvent[];
  onEventTrigger?: (event: ProcessedEvent) => void;
}

interface UsePlaybackReturn {
  state: PlaybackState;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (timeMs: number) => void;
  seekPercent: (percent: number) => void;
  setSpeed: (speed: number) => void;
  activeEvents: ProcessedEvent[];
  progress: number; // 0-100
}

const EVENT_WINDOW_MS = 2000; // Show events within 2 seconds of current time

export function usePlayback({
  duration,
  events,
  onEventTrigger
}: UsePlaybackOptions): UsePlaybackReturn {
  const [state, setState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration,
    speed: 1
  });

  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const triggeredEventsRef = useRef<Set<string>>(new Set());

  // Update duration when it changes
  useEffect(() => {
    setState(prev => ({ ...prev, duration }));
  }, [duration]);

  // Animation loop using requestAnimationFrame
  const animate = useCallback((timestamp: number) => {
    if (lastFrameTimeRef.current === 0) {
      lastFrameTimeRef.current = timestamp;
    }

    const deltaTime = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;

    setState(prev => {
      const newTime = prev.currentTime + (deltaTime * prev.speed);
      
      // Check if we've reached the end
      if (newTime >= prev.duration) {
        animationRef.current = null;
        return { ...prev, currentTime: 0, isPlaying: false };
      }

      // Check for events to trigger
      events.forEach(event => {
        if (
          !triggeredEventsRef.current.has(event.Critical_Event_ID) &&
          event.timeMs >= prev.currentTime &&
          event.timeMs < newTime
        ) {
          triggeredEventsRef.current.add(event.Critical_Event_ID);
          onEventTrigger?.(event);
        }
      });

      return { ...prev, currentTime: newTime };
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [events, onEventTrigger]);

  // Play
  const play = useCallback(() => {
    if (animationRef.current) return;
    
    setState(prev => ({ ...prev, isPlaying: true }));
    lastFrameTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);
  }, [animate]);

  // Pause
  const pause = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  // Toggle
  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  // Seek to specific time
  const seek = useCallback((timeMs: number) => {
    const clampedTime = Math.max(0, Math.min(timeMs, duration));
    
    // Reset triggered events if seeking backwards
    if (timeMs < state.currentTime) {
      triggeredEventsRef.current = new Set(
        events
          .filter(e => e.timeMs < timeMs)
          .map(e => e.Critical_Event_ID)
      );
    }
    
    setState(prev => ({ ...prev, currentTime: clampedTime }));
  }, [duration, state.currentTime, events]);

  // Seek by percentage
  const seekPercent = useCallback((percent: number) => {
    const timeMs = (percent / 100) * duration;
    seek(timeMs);
  }, [duration, seek]);

  // Set playback speed
  const setSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, speed }));
  }, []);

  // Get currently active events (within time window)
  const activeEvents = events.filter(event => {
    const timeDiff = Math.abs(event.timeMs - state.currentTime);
    return timeDiff < EVENT_WINDOW_MS;
  });

  // Calculate progress percentage
  const progress = duration > 0 ? (state.currentTime / duration) * 100 : 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    state,
    play,
    pause,
    toggle,
    seek,
    seekPercent,
    setSpeed,
    activeEvents,
    progress
  };
}

