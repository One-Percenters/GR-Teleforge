import type { MouseEvent } from "react";

export type PlaybackControlsProps = {
  status: "PAUSED" | "PLAYING";
  onPlayPause?: () => void;
  onStepBack?: () => void;
  onStepForward?: () => void;
};

export function PlaybackControls({
  status,
  onPlayPause,
  onStepBack,
  onStepForward,
}: PlaybackControlsProps) {
  return (
    <section className="flex items-center justify-center border-t border-zinc-900 bg-black/90 px-8 py-4 text-xs font-mono text-zinc-400">
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onStepBack}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-lg text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
        >
          <StepBackIcon />
        </button>
        <button
          type="button"
          onClick={onPlayPause}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-lg text-white shadow-lg shadow-red-900/40"
        >
          {status === "PLAYING" ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          onClick={onStepForward}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-lg text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
        >
          <StepForwardIcon />
        </button>

        <span className="text-zinc-400">{status}</span>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-current"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-current"
    >
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  );
}

function StepBackIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-current -translate-x-px"
    >
      <path d="M7 5h2v14H7zM19 6l-9 6 9 6z" />
    </svg>
  );
}

function StepForwardIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-current translate-x-px"
    >
      <path d="M15 5h2v14h-2zM5 6l9 6-9 6z" />
    </svg>
  );
}
