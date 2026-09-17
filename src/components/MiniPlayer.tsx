import React from 'react';
import { Play, Pause, SkipForward, ChevronUp, ListMusic, AlertCircle, Loader2 } from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export const MiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isLoadingAudio,
    errorMessage,
    togglePlay,
    nextTrack,
    setIsFullPlayerOpen,
    setIsQueueOpen,
    clearError
  } = useAudioPlayer();

  if (!currentTrack) return null;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-[56px] md:bottom-0 left-0 right-0 z-30 px-2 sm:px-4 pb-2 md:pb-3 pointer-events-none">
      <div className="max-w-4xl mx-auto pointer-events-auto">
        {/* Error Banner if Rights Gate blocked or stream issue */}
        {errorMessage && (
          <div className="mb-2 p-2.5 rounded-xl bg-red-950/90 border border-red-500/40 text-red-200 text-xs flex items-center justify-between shadow-xl backdrop-blur-md animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={clearError}
              className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-900/60 hover:bg-red-800 text-red-100 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="relative overflow-hidden rounded-2xl bg-neutral-900/95 border border-neutral-800 shadow-2xl backdrop-blur-xl transition-all hover:border-neutral-700">
          {/* Top Progress Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-800">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-150"
              style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
            />
          </div>

          <div className="flex items-center justify-between p-2.5 sm:p-3 gap-3">
            {/* Track Info (Tap to expand full player) */}
            <div 
              onClick={() => setIsFullPlayerOpen(true)}
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
            >
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-800 shadow-md">
                <img
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
                {isLoadingAudio && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-neutral-100 truncate group-hover:text-amber-400 transition-colors">
                    {currentTrack.title}
                  </h4>
                  <span className="text-[9px] px-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold uppercase tracking-wider shrink-0 hidden sm:inline">
                    Authorized
                  </span>
                </div>
                <p className="text-xs text-neutral-400 truncate">
                  {currentTrack.artistNames.join(', ')} {currentTrack.genres?.[0] ? `• ${currentTrack.genres[0]}` : ''}
                </p>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={togglePlay}
                disabled={isLoadingAudio}
                className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 flex items-center justify-center transition-all shadow-md shadow-amber-950/40 cursor-pointer disabled:opacity-50"
                title={isPlaying ? 'Pause' : 'Play'}
                aria-label={isPlaying ? 'Pause track' : 'Play track'}
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={nextTrack}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Next track"
                aria-label="Next track"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsQueueOpen(true)}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors hidden sm:flex cursor-pointer"
                title="View Queue"
                aria-label="View Queue"
              >
                <ListMusic className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsFullPlayerOpen(true)}
                className="p-2 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Expand player"
                aria-label="Expand player"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
