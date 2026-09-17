import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, Play, Heart, Users, MapPin, Disc } from 'lucide-react';
import { Artist, Track, Album } from '../types';
import { api } from '../services/api';
import { TrackCard } from '../components/TrackCard';
import { useAudioPlayer } from '../context/AudioPlayerContext';

interface ArtistDetailViewProps {
  artist: Artist;
  onBack: () => void;
  onToggleFavorite: (trackId: string) => void;
  favoriteIds: Set<string>;
  onOpenShare: (title: string, subtitle: string) => void;
}

export const ArtistDetailView: React.FC<ArtistDetailViewProps> = ({
  artist,
  onBack,
  onToggleFavorite,
  favoriteIds,
  onOpenShare
}) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrack } = useAudioPlayer();

  useEffect(() => {
    let isMounted = true;
    api.getArtistBySlug(artist.slug)
      .then(res => {
        if (isMounted) {
          setTracks(res.tracks);
          setAlbums(res.albums);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [artist.slug]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  return (
    <div className="space-y-6 pb-32 pt-2 animate-fadeIn">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Artist Profile Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-950/40 via-neutral-900 to-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-neutral-800 shrink-0 shadow-2xl border-2 border-amber-500/30">
          <img
            src={artist.imageUrl}
            alt={artist.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold uppercase tracking-wider">
              Verified Chhattisgarhi Artist
            </span>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-100">
              {artist.name}
            </h1>
            {artist.verified && (
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
            )}
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-neutral-400 mt-2">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>{artist.region || 'Chhattisgarh'}</span>
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>{artist.monthlyListeners?.toLocaleString() || '150,000'} monthly listeners</span>
            </span>
          </div>

          <p className="text-xs sm:text-sm text-neutral-300 mt-3 max-w-xl leading-relaxed">
            {artist.bio}
          </p>

          <div className="mt-5 flex items-center justify-center sm:justify-start gap-3">
            <button
              onClick={handlePlayAll}
              disabled={tracks.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-lg shadow-amber-950/30 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Top Tracks</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Tracks */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-3">
          Popular Chhattisgarhi Tracks
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

      {/* Albums */}
      {albums.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
            <Disc className="w-4 h-4 text-amber-400" />
            <span>Albums & EPs</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {albums.map(alb => (
              <div
                key={alb.id}
                className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800"
              >
                <img
                  src={alb.artworkUrl}
                  alt={alb.title}
                  className="w-full aspect-square rounded-xl object-cover mb-2"
                  referrerPolicy="no-referrer"
                />
                <h4 className="text-xs font-bold text-neutral-100 truncate">{alb.title}</h4>
                <p className="text-[11px] text-neutral-400">{alb.releaseDate?.slice(0, 4)} • {alb.recordLabel || 'CG World'}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
