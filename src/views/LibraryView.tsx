import React, { useState, useEffect } from 'react';
import { Heart, Play, Compass, Lock, LogIn, Sparkles, Music2, LogOut, ArrowRight, UserCheck } from 'lucide-react';
import { api } from '../services/api';
import { Track, Playlist, User } from '../types';
import { TrackCard } from '../components/TrackCard';
import { useAudioPlayer } from '../context/AudioPlayerContext';

interface LibraryViewProps {
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onToggleFavorite: (trackId: string) => void;
  favoriteIds: Set<string>;
  onSelectPlaylist: (playlist: Playlist) => void;
  onNavigate: (view: string) => void;
  onOpenShare: (title: string, subtitle: string) => void;
  onLogout?: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  currentUser,
  onOpenAuthModal,
  onToggleFavorite,
  favoriteIds,
  onSelectPlaylist,
  onNavigate,
  onOpenShare,
  onLogout
}) => {
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [savedPlaylists, setSavedPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrack } = useAudioPlayer();

  useEffect(() => {
    if (!currentUser) {
      setFavorites([]);
      setSavedPlaylists([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api.getLibrary(currentUser.id)
      .then(data => {
        if (isMounted) {
          setFavorites(data.favorites || []);

          // Load server playlists + user-created AI playlists
          let userPlaylists = data.savedPlaylists || [];
          try {
            const savedAi = localStorage.getItem(`cg_ai_playlists_${currentUser.id}`) || localStorage.getItem('cg_ai_playlists');
            if (savedAi) {
              const parsed = JSON.parse(savedAi);
              if (Array.isArray(parsed)) {
                const mappedAiPlaylists: Playlist[] = parsed.map((p: any) => ({
                  id: p.id || `playlist-${Date.now()}`,
                  title: p.name || p.title || 'AI Personalized Mix',
                  slug: (p.name || p.title || 'ai-mix').toLowerCase().replace(/\s+/g, '-'),
                  description: p.description || 'Custom generated hearing mix',
                  artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
                  ownerType: 'user',
                  visibility: 'private',
                  trackIds: p.tracks?.map((t: any) => t.id) || p.trackIds || [],
                  tags: ['ai-mix', p.region || 'cg'],
                  createdAt: p.createdAt || new Date().toISOString()
                }));
                userPlaylists = [...mappedAiPlaylists, ...userPlaylists];
              }
            }
          } catch {}

          setSavedPlaylists(userPlaylists);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, favoriteIds]);

  const handlePlayAllFavorites = () => {
    if (favorites.length > 0) {
      playTrack(favorites[0], favorites);
    }
  };

  // If user is not logged in: display the Library Authentication Lock Gate
  if (!currentUser) {
    return (
      <div className="pb-32 pt-4 sm:pt-8 animate-fadeIn max-w-2xl mx-auto px-2">
        <div className="relative rounded-3xl bg-neutral-900/90 border border-neutral-800 p-6 sm:p-10 text-center shadow-2xl overflow-hidden">
          {/* Ambient background glow */}
          <div className="absolute -top-20 -right-20 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Locked Icon Badge */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 mx-auto mb-5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-neutral-950 rounded-[22px] flex items-center justify-center">
              <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full mb-3">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Private User Collection</span>
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 tracking-tight">
            Sign In to Access Your Library
          </h1>
          
          <p className="text-xs sm:text-sm text-neutral-300 mt-2.5 max-w-md mx-auto leading-relaxed">
            Each user has their own private favorites and saved playlists. Sign in or register to safely store, sync, and stream your personal music collection.
          </p>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6 sm:my-8 text-left">
            <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-2">
                <Heart className="w-4 h-4 fill-current" />
              </div>
              <h4 className="text-xs font-bold text-neutral-100">Private Favorites</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">Heart any song to sync it privately to your account.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-neutral-100">Saved AI Mixes</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">Generate and save custom playstyle mixes anytime.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                <Music2 className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-neutral-100">Cross-Device Play</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">Access your library seamlessly on mobile, tablet, & PC.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenAuthModal}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 text-sm font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-neutral-950" />
              <span>Sign In / Register</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('home')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-semibold transition-colors cursor-pointer"
            >
              Browse Music
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is logged in: show their private library
  return (
    <div className="space-y-6 pb-32 pt-2 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-rose-500">
            <Heart className="w-4 h-4 fill-current" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Personal Collection
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-100">
            My Music Library
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Logged in as <span className="text-amber-400 font-semibold">{currentUser.displayName || currentUser.email}</span>. Your private favorites and saved playlists.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {favorites.length > 0 && (
            <button
              onClick={handlePlayAllFavorites}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-md shadow-amber-950/30 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play All ({favorites.length})</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 text-xs font-medium border border-neutral-700/60 transition-colors cursor-pointer"
              title="Sign out from this account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Favorites List */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500 fill-current" />
          <span>Favorite Tracks ({favorites.length})</span>
        </h2>

        {loading ? (
          <div className="p-10 text-center text-neutral-400 text-xs animate-pulse">
            Loading your private collection...
          </div>
        ) : favorites.length === 0 ? (
          <div className="p-10 sm:p-12 text-center rounded-3xl bg-neutral-900/40 border border-neutral-800">
            <Heart className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-neutral-200">
              No favorites saved yet
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              Tap the heart icon on any song across CG Gaana to save it to your private library.
            </p>
            <button
              onClick={() => onNavigate('home')}
              className="mt-4 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              Discover Regional Hits
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {favorites.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                trackList={favorites}
                layout="row"
                isFavorite={true}
                onToggleFavorite={onToggleFavorite}
                onOpenShare={onOpenShare}
              />
            ))}
          </div>
        )}
      </section>

      {/* Saved Playlists */}
      {savedPlaylists.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Saved Playlists ({savedPlaylists.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {savedPlaylists.map(playlist => (
              <div
                key={playlist.id}
                onClick={() => onSelectPlaylist(playlist)}
                className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 transition-all cursor-pointer group flex items-center gap-3.5"
              >
                <img
                  src={playlist.artworkUrl}
                  alt={playlist.title}
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-neutral-100 truncate group-hover:text-amber-400 transition-colors">
                    {playlist.title}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {playlist.trackIds.length} tracks
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
