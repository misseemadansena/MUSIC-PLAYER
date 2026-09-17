import React from 'react';
import { Play, Pause, Heart, ListPlus, Share2, ExternalLink, ShieldCheck, Flame } from 'lucide-react';
import { Track } from '../types';
import { useAudioPlayer } from '../context/AudioPlayerContext';

interface TrackCardProps {
  track: Track;
  trackList?: Track[];
  isFavorite?: boolean;
  onToggleFavorite?: (trackId: string) => void;
  onOpenShare?: (title: string, subtitle: string) => void;
  trendRank?: number;
  trendScore?: number;
  layout?: 'grid' | 'row';
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  trackList,
  isFavorite = false,
  onToggleFavorite,
  onOpenShare,
  trendRank,
  trendScore,
  layout = 'grid'
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue } = useAudioPlayer();

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrent && isPlaying;

  const handlePlayClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, trackList || [track]);
    }
  };

  const formatDuration = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (layout === 'row') {
    return (
      <div className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all ${
        isCurrent
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-neutral-900/60 border-neutral-800/80 hover:bg-neutral-900 hover:border-neutral-700'
      }`}>
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          {/* Rank Badge if in trending list */}
          {trendRank !== undefined && (
            <div className="w-6 text-center font-extrabold text-sm sm:text-base font-mono">
              {trendRank <= 3 ? (
                <span className="text-amber-400">#{trendRank}</span>
              ) : (
                <span className="text-neutral-500">#{trendRank}</span>
              )}
            </div>
          )}

          {/* Artwork & Overlay Play */}
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-neutral-800 shrink-0 shadow-md">
            <img
              src={track.artworkUrl}
              alt={track.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={handlePlayClick}
              className={`absolute inset-0 flex items-center justify-center transition-all cursor-pointer ${
                isCurrentlyPlaying
                  ? 'bg-black/50 opacity-100 text-amber-400'
                  : 'bg-black/40 opacity-0 group-hover:opacity-100 text-white'
              }`}
            >
              {isCurrentlyPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`text-sm sm:text-base font-bold truncate ${isCurrent ? 'text-amber-400' : 'text-neutral-100'}`}>
                {track.title}
              </h4>
              {track.youtubeVideoId && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>YouTube</span>
                </span>
              )}
              {trendScore && (
                <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                  <Flame className="w-3 h-3 fill-current" />
                  <span>{trendScore}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 truncate mt-0.5 flex items-center gap-2">
              <span>{track.artistNames.join(', ')}</span>
              <span>•</span>
              <span>{track.genres?.[0] || 'CG Folk'}</span>
              {track.views && (
                <>
                  <span>•</span>
                  <span className="text-neutral-500">{track.views}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <span className="text-xs text-neutral-500 font-mono hidden md:inline mr-2">
            {formatDuration(track.durationMs)}
          </span>

          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(track.id)}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isFavorite
                  ? 'text-rose-500 bg-rose-500/10'
                  : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
              }`}
              title="Favorite"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}

          <button
            onClick={() => addToQueue(track)}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Add to queue"
          >
            <ListPlus className="w-4 h-4" />
          </button>

          {onOpenShare && (
            <button
              onClick={() => onOpenShare(track.title, track.artistNames.join(', '))}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors hidden sm:block cursor-pointer"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Grid Card Layout
  return (
    <div className={`group relative rounded-2xl p-3 border transition-all flex flex-col justify-between ${
      isCurrent
        ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-950/20'
        : 'bg-neutral-900/60 border-neutral-800/90 hover:bg-neutral-900 hover:border-neutral-700 hover:shadow-xl'
    }`}>
      {/* Artwork */}
      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-neutral-800 shadow-md mb-3">
        <img
          src={track.artworkUrl}
          alt={track.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
        />

        {/* Rights & YouTube badge */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-neutral-950/80 backdrop-blur-md border border-neutral-700/60 flex items-center gap-1 text-[9px] font-bold text-amber-400">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Authorized</span>
        </div>

        {track.youtubeVideoId && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-red-950/85 backdrop-blur-md border border-red-700/60 flex items-center gap-1 text-[9px] font-bold text-red-300">
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>YouTube</span>
          </div>
        )}

        {/* Play Button Overlay */}
        <button
          onClick={handlePlayClick}
          className={`absolute bottom-3 right-3 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg cursor-pointer ${
            isCurrentlyPlaying
              ? 'bg-amber-500 text-neutral-950 opacity-100 scale-100'
              : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-90 active:scale-95'
          }`}
          title={isCurrentlyPlaying ? 'Pause' : 'Play'}
        >
          {isCurrentlyPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>
      </div>

      {/* Info */}
      <div className="min-w-0">
        <h4 className={`text-sm font-bold truncate leading-tight ${isCurrent ? 'text-amber-400' : 'text-neutral-100'}`}>
          {track.title}
        </h4>
        <p className="text-xs text-neutral-400 truncate mt-1">
          {track.artistNames.join(', ')}
        </p>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400">
          <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
            {track.genres?.[0] || 'CG Folk'}
          </span>

          <div className="flex items-center gap-1">
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(track.id)}
                className={`p-1 rounded hover:bg-neutral-800 transition-colors ${
                  isFavorite ? 'text-rose-500' : 'text-neutral-400 hover:text-neutral-100'
                }`}
                title="Favorite"
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}
            <button
              onClick={() => addToQueue(track)}
              className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
              title="Add to queue"
            >
              <ListPlus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
