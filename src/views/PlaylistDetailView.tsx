import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Clock, Music, Compass } from 'lucide-react';
import { Playlist, Track } from '../types';
import { api } from '../services/api';
import { TrackCard } from '../components/TrackCard';
import { useAudioPlayer } from '../context/AudioPlayerContext';

interface PlaylistDetailViewProps {
  playlist: Playlist;
  onBack: () => void;
  onToggleFavorite: (trackId: string) => void;
  favoriteIds: Set<string>;
  onOpenShare: (title: string, subtitle: string) => void;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  playlist,
  onBack,
  onToggleFavorite,
  favoriteIds,
  onOpenShare
}) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrack } = useAudioPlayer();

  useEffect(() => {
    let isMounted = true;
    api.getPlaylist(playlist.id)
      .then(res => {
        if (isMounted) {
          setTracks(res.tracks);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [playlist.id]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  return (
    <div className="space-y-6 pb-32 pt-2 animate-fadeIn">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-950/40 via-neutral-900 to-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <img
          src={playlist.artworkUrl}
          alt={playlist.title}
          className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover shrink-0 shadow-2xl border border-neutral-800"
          referrerPolicy="no-referrer"
        />

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold uppercase tracking-wider">
            Curated Chhattisgarhi Playlist
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 mt-1">
            {playlist.title}
          </h1>

          <p className="text-xs sm:text-sm text-neutral-300 mt-2 max-w-xl leading-relaxed">
            {playlist.description}
          </p>

          <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-neutral-400 mt-3">
            <span>{tracks.length} tracks</span>
            <span>•</span>
            <span>Curated by CG Gaana Editorial</span>
          </div>

          <div className="mt-5 flex items-center justify-center sm:justify-start">
            <button
              onClick={handlePlayAll}
              disabled={tracks.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-lg shadow-amber-950/30 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Playlist</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tracks */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
          <Music className="w-4 h-4 text-amber-400" />
          <span>Tracklist</span>
        </h2>
        <div className="space-y-2">
          {tracks.map(track => (
            <TrackCard
              key={track.id}
              track={track}
              trackList={tracks}
              layout="row"
              isFavorite={favoriteIds.has(track.id)}
              onToggleFavorite={onToggleFavorite}
              onOpenShare={onOpenShare}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
