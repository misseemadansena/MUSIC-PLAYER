/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AudioPlayerProvider, useAudioPlayer } from './context/AudioPlayerContext';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { YouTubePlayerHost } from './components/YouTubePlayerHost';
import { FullPlayerModal } from './components/FullPlayerModal';
import { FactorBreakdownModal } from './components/FactorBreakdownModal';
import { RegionSelectorModal } from './components/RegionSelectorModal';
import { AiPlaystyleModal } from './components/AiPlaystyleModal';
import { AuthModal } from './components/AuthModal';
import { ShareModal } from './components/ShareModal';
import { HomeView } from './views/HomeView';
import { TrendingView } from './views/TrendingView';
import { SearchView } from './views/SearchView';
import { LibraryView } from './views/LibraryView';
import { ArtistDetailView } from './views/ArtistDetailView';
import { PlaylistDetailView } from './views/PlaylistDetailView';
import { AdminView } from './views/AdminView';
import { api, HomeFeedData } from './services/api';
import { Track, Artist, Playlist, MusicRegion, User } from './types';
import { Loader2 } from 'lucide-react';

function MainApp() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [currentRegion, setCurrentRegion] = useState<MusicRegion>(() => {
    try {
      const saved = localStorage.getItem('cg_music_region');
      if (saved && ['cg', 'bollywood', 'punjabi', 'bhojpuri'].includes(saved)) {
        return saved as MusicRegion;
      }
    } catch {}
    return 'cg';
  });

  const [homeData, setHomeData] = useState<HomeFeedData | null>(null);
  const [loadingHome, setLoadingHome] = useState(true);

  // Selected entities for drill-down views
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  // Favorites state
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set(['trk-1', 'trk-2', 'trk-4']));

  // Modals state
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isAiPlaystyleOpen, setIsAiPlaystyleOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('cg_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isFactorModalOpen, setIsFactorModalOpen] = useState(false);
  const [factorModalTrack, setFactorModalTrack] = useState<Track | undefined>(undefined);
  const [shareData, setShareData] = useState<{ title: string; subtitle: string } | null>(null);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('cg_user', JSON.stringify(user));
    } catch {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('cg_user');
      localStorage.removeItem('cg_auth_token');
    } catch {}
    if (currentView === 'admin') {
      setCurrentView('home');
    }
  };

  const { currentTrack, isPlaying, togglePlay, seek, currentTime, toggleMute } = useAudioPlayer();

  const loadHomeFeed = async (region: MusicRegion = currentRegion) => {
    setLoadingHome(true);
    try {
      const data = await api.getHome(region);
      setHomeData(data);
    } catch (err) {
      console.error('Failed to load home feed:', err);
    } finally {
      setLoadingHome(false);
    }
  };

  useEffect(() => {
    loadHomeFeed(currentRegion);
  }, [currentRegion]);

  useEffect(() => {
    if (currentUser) {
      api.getLibrary(currentUser.id)
        .then(lib => {
          if (lib?.favorites) {
            setFavoriteIds(new Set(lib.favorites.map(t => t.id)));
          }
        })
        .catch(() => {});
    } else {
      setFavoriteIds(new Set());
    }
  }, [currentUser]);

  // Desktop keyboard shortcuts (Space: Play/Pause, ArrowLeft: -5s, ArrowRight: +5s, M: Mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seek(Math.max(0, currentTime - 5));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seek(currentTime + 5);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seek, currentTime, toggleMute]);

  const handleRegionChange = (newRegion: MusicRegion) => {
    setCurrentRegion(newRegion);
    try {
      localStorage.setItem('cg_music_region', newRegion);
    } catch {}
    loadHomeFeed(newRegion);
  };

  const handleToggleFavorite = async (trackId: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const res = await api.toggleFavorite(trackId, currentUser.id);
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (res.isFavorite) {
          next.add(trackId);
        } else {
          next.delete(trackId);
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectArtist = (artist: Artist) => {
    setSelectedArtist(artist);
    setCurrentView('artist-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setCurrentView('playlist-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTrendingExplanation = (track?: Track) => {
    setFactorModalTrack(track);
    setIsFactorModalOpen(true);
  };

  const handleOpenShare = (title: string, subtitle: string) => {
    setShareData({ title, subtitle });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950">
      {/* Top Bar Header */}
      <TopBar
        currentRegion={currentRegion}
        onOpenRegionSelector={() => setIsRegionModalOpen(true)}
        onOpenAiPlaystyle={() => setIsAiPlaystyleOpen(true)}
        onNavigate={handleNavigate}
        currentView={currentView}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
        {loadingHome && !homeData ? (
          <div className="py-32 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
            <h3 className="text-base font-bold text-neutral-200">
              Initializing Regional Audio Catalog...
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Synchronizing high-fidelity rights streams and trending velocity scores.
            </p>
          </div>
        ) : (
          <>
            {currentView === 'home' && homeData && (
              <HomeView
                data={homeData}
                currentRegion={currentRegion}
                onOpenRegionSelector={() => setIsRegionModalOpen(true)}
                onOpenAiPlaystyle={() => setIsAiPlaystyleOpen(true)}
                onSelectArtist={handleSelectArtist}
                onSelectPlaylist={handleSelectPlaylist}
                onOpenTrendingExplanation={handleOpenTrendingExplanation}
                onToggleFavorite={handleToggleFavorite}
                favoriteIds={favoriteIds}
                onOpenShare={handleOpenShare}
                onNavigate={handleNavigate}
              />
            )}

            {currentView === 'trending' && (
              <TrendingView
                currentRegion={currentRegion}
                onOpenTrendingExplanation={handleOpenTrendingExplanation}
                onToggleFavorite={handleToggleFavorite}
                favoriteIds={favoriteIds}
                onOpenShare={handleOpenShare}
              />
            )}

            {currentView === 'search' && (
              <SearchView
                currentRegion={currentRegion}
                onOpenAiPlaystyle={() => setIsAiPlaystyleOpen(true)}
                onSelectArtist={handleSelectArtist}
                onSelectPlaylist={handleSelectPlaylist}
                onToggleFavorite={handleToggleFavorite}
                favoriteIds={favoriteIds}
                onOpenShare={handleOpenShare}
              />
            )}

            {currentView === 'library' && (
              <LibraryView
                currentUser={currentUser}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onToggleFavorite={handleToggleFavorite}
                favoriteIds={favoriteIds}
                onSelectPlaylist={handleSelectPlaylist}
                onNavigate={handleNavigate}
                onOpenShare={handleOpenShare}
                onLogout={handleLogout}
              />
            )}

            {currentView === 'artist-detail' && selectedArtist && (
              <ArtistDetailView
                artist={selectedArtist}
                onBack={() => handleNavigate('home')}
                onToggleFavorite={handleToggleFavorite}
                favoriteIds={favoriteIds}
                onOpenShare={handleOpenShare}
              />
            )}

            {currentView === 'playlist-detail' && selectedPlaylist && (
              <PlaylistDetailView
                playlist={selectedPlaylist}
                onBack={() => handleNavigate('home')}
                onToggleFavorite={handleToggleFavorite}
                favoriteIds={favoriteIds}
                onOpenShare={handleOpenShare}
              />
            )}

            {currentView === 'admin' && (
              <AdminView
                onExit={() => handleNavigate('home')}
                currentUser={currentUser}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Persistent YouTube Player Bridge */}
      <YouTubePlayerHost />

      {/* Mini Player Persistent Dock */}
      <MiniPlayer />

      {/* Mobile & Tablet Bottom Navigation */}
      <BottomNav
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAiPlaystyle={() => setIsAiPlaystyleOpen(true)}
      />

      {/* Full Player Modal & Queue */}
      <FullPlayerModal
        onOpenShare={handleOpenShare}
        isFavorite={currentTrack ? favoriteIds.has(currentTrack.id) : false}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Region Selector Modal */}
      <RegionSelectorModal
        isOpen={isRegionModalOpen}
        onClose={() => setIsRegionModalOpen(false)}
        currentRegion={currentRegion}
        onSelectRegion={handleRegionChange}
        onOpenAiPlaystyle={() => {
          setIsRegionModalOpen(false);
          setIsAiPlaystyleOpen(true);
        }}
      />

      {/* AI Playstyle Customized Radio Modal */}
      <AiPlaystyleModal
        isOpen={isAiPlaystyleOpen}
        onClose={() => setIsAiPlaystyleOpen(false)}
        activeRegion={currentRegion}
        onSelectRegion={handleRegionChange}
      />

      {/* User Login / Register Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Trending Factor Explanation Modal */}
      <FactorBreakdownModal
        isOpen={isFactorModalOpen}
        onClose={() => setIsFactorModalOpen(false)}
        trackTitle={factorModalTrack?.title}
        trendScore={(factorModalTrack as any)?.trendScore}
        explanation={(factorModalTrack as any)?.trendExplanation}
      />

      {/* Share Track Modal */}
      <ShareModal
        isOpen={!!shareData}
        onClose={() => setShareData(null)}
        title={shareData?.title || ''}
        subtitle={shareData?.subtitle || ''}
      />
    </div>
  );
}

export default function App() {
  return (
    <AudioPlayerProvider>
      <MainApp />
    </AudioPlayerProvider>
  );
}
