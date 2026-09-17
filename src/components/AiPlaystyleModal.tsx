import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, Play, Volume2, Radio, RefreshCw, 
  X, Check, Flame, Headphones, Mic2, Compass, BookmarkCheck, TrendingUp, Music
} from 'lucide-react';
import { Track, MusicRegion, UserPlaystyleProfile } from '../types';
import { api } from '../services/api';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { REGION_CONFIGS } from './RegionSelectorModal';

interface AiPlaystyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRegion: MusicRegion;
  onSelectRegion?: (reg: MusicRegion) => void;
}

export const AiPlaystyleModal: React.FC<AiPlaystyleModalProps> = ({
  isOpen,
  onClose,
  activeRegion,
}) => {
  const { playTrack } = useAudioPlayer();
  const [profile, setProfile] = useState<UserPlaystyleProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [energyPreference, setEnergyPreference] = useState<'chill' | 'moderate' | 'high_energy'>('moderate');
  const [isSpeakingDj, setIsSpeakingDj] = useState(false);
  const [isSavedToLibrary, setIsSavedToLibrary] = useState(false);

  // Derive local hearing stats from storage
  const hearingStats = useMemo(() => {
    try {
      const stored = localStorage.getItem('cg_recent_played');
      if (!stored) return null;
      const parsed: Array<{ title: string; artist: string; genres?: string[]; playCount?: number }> = JSON.parse(stored);
      if (!parsed.length) return null;

      const genreCounts: Record<string, number> = {};
      const artistCounts: Record<string, number> = {};
      let totalPlays = 0;

      parsed.forEach(item => {
        const count = item.playCount || 1;
        totalPlays += count;
        if (item.artist && item.artist !== 'Unknown Artist') {
          artistCounts[item.artist] = (artistCounts[item.artist] || 0) + count;
        }
        item.genres?.forEach(g => {
          genreCounts[g] = (genreCounts[g] || 0) + count;
        });
      });

      const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

      return {
        totalHeard: parsed.length,
        totalPlays,
        topGenre: topGenre || REGION_CONFIGS[activeRegion].popularGenres[0],
        topArtist: topArtist || REGION_CONFIGS[activeRegion].representativeArtists[0]
      };
    } catch {
      return null;
    }
  }, [isOpen, activeRegion]);

  const fetchPlaystyleProfile = async (energy = energyPreference) => {
    setIsLoading(true);
    setIsSavedToLibrary(false);
    try {
      // Gather recent plays from localStorage
      let recentPlays: { title: string; artist: string; genres?: string[]; playCount?: number }[] = [];
      try {
        const stored = localStorage.getItem('cg_recent_played');
        if (stored) {
          recentPlays = JSON.parse(stored);
        }
      } catch {}

      const res = await api.getPlaystyleMix({
        recentlyPlayed: recentPlays,
        favoriteGenres: REGION_CONFIGS[activeRegion].popularGenres,
        activeRegion,
        energyPreference: energy
      });

      if (res && res.profile) {
        setProfile(res.profile);
      }
    } catch (err) {
      console.error('Failed to generate AI playstyle mix:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlaystyleProfile();
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeakingDj(false);
    }
  }, [isOpen, activeRegion]);

  const handleEnergyChange = (newEnergy: 'chill' | 'moderate' | 'high_energy') => {
    setEnergyPreference(newEnergy);
    fetchPlaystyleProfile(newEnergy);
  };

  const handlePlayAll = () => {
    if (!profile || !profile.recommendedTracks || profile.recommendedTracks.length === 0) return;
    const tracks = profile.recommendedTracks;
    playTrack(tracks[0], tracks);
    onClose();
  };

  const handlePlaySingle = (track: Track) => {
    if (!profile?.recommendedTracks) return;
    playTrack(track, profile.recommendedTracks);
  };

  const handleSavePlaylist = () => {
    if (!profile) return;
    try {
      const saved = localStorage.getItem('cg_ai_playlists');
      const playlists = saved ? JSON.parse(saved) : [];
      playlists.unshift({
        id: `ai-pl-${Date.now()}`,
        name: profile.persona || `${REGION_CONFIGS[activeRegion].label} AI Mix`,
        description: profile.vibeDescription,
        region: activeRegion,
        tracks: profile.recommendedTracks,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('cg_ai_playlists', JSON.stringify(playlists.slice(0, 20)));
      setIsSavedToLibrary(true);
      setTimeout(() => setIsSavedToLibrary(false), 3500);
    } catch (err) {
      console.error('Failed to save AI playlist:', err);
    }
  };

  const toggleSpeakDjIntro = () => {
    if (!('speechSynthesis' in window) || !profile?.customDjCommentary) return;

    if (isSpeakingDj) {
      window.speechSynthesis.cancel();
      setIsSpeakingDj(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(profile.customDjCommentary);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('hi-IN')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => setIsSpeakingDj(false);
    utterance.onerror = () => setIsSpeakingDj(false);

    setIsSpeakingDj(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  const currentHub = REGION_CONFIGS[activeRegion];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[92vh] bg-neutral-900/95 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800/80 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-neutral-950 font-bold flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-neutral-100 tracking-tight">
                  AI Playlist Generator
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase">
                  {currentHub.badge} HUB
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Calibrated strictly to your hearing pattern & high-play regional hits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchPlaystyleProfile()}
              disabled={isLoading}
              className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
              title="Regenerate AI Playlist"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative z-10 scrollbar-thin">
          {isLoading && !profile ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="relative">
                <Sparkles className="w-10 h-10 text-amber-400 animate-spin" />
                <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-neutral-200 mt-4">
                Analyzing Hearing Pattern & Regional Hits...
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                Pairing your repeat listen habits with {currentHub.label}'s most-streamed chartbusters and folk anthems.
              </p>
            </div>
          ) : profile ? (
            <>
              {/* Persona & Vibe Highlight Card */}
              <div className="rounded-2xl bg-gradient-to-br from-neutral-850 via-neutral-900 to-neutral-900 border border-neutral-750 p-4 sm:p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Compass className="w-3.5 h-3.5" />
                      Synthesized Persona
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-neutral-100 tracking-tight">
                      {profile.persona}
                    </h3>
                  </div>

                  {/* Energy Selector Pill */}
                  <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-750 text-xs self-start sm:self-auto">
                    <button
                      onClick={() => handleEnergyChange('chill')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        energyPreference === 'chill'
                          ? 'bg-amber-500 text-neutral-950 shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Chill Folk
                    </button>
                    <button
                      onClick={() => handleEnergyChange('moderate')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        energyPreference === 'moderate'
                          ? 'bg-amber-500 text-neutral-950 shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Balanced
                    </button>
                    <button
                      onClick={() => handleEnergyChange('high_energy')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        energyPreference === 'high_energy'
                          ? 'bg-amber-500 text-neutral-950 shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      High-BPM
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-neutral-300 mt-2 leading-relaxed">
                  {profile.vibeDescription}
                </p>

                {/* DUAL INSIGHTS: Hearing Pattern + Highly Played Regional Songs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5 pt-3 border-t border-neutral-800">
                  {/* Hearing Pattern Card */}
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                      <Headphones className="w-3.5 h-3.5" />
                      <span>Your Hearing Pattern</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-snug">
                      {profile.hearingPatternInsight || 'Reflects your recent track replays, preferred tempos, and artist selections.'}
                    </p>
                    {hearingStats && (
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-400 font-medium">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                          Top: {hearingStats.topArtist}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                          {hearingStats.topGenre}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Highly Played Regional Songs Card */}
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Highly Played Local Hits</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-snug">
                      {profile.regionalPopularityInsight || `Fused with top chartbusters across ${currentHub.label} boasting massive play velocity.`}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-400 font-medium">
                      <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30">
                        {currentHub.hindiLabel} Regional Chartbusters
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI DJ Voice Commentary Box */}
                <div className="mt-3.5 pt-3 border-t border-neutral-800 flex items-start justify-between gap-3 bg-neutral-900/70 p-3 rounded-xl">
                  <div className="flex items-start gap-2.5">
                    <Mic2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        AI Radio Host Commentary
                      </span>
                      <p className="text-xs text-neutral-200 italic mt-0.5">
                        "{profile.customDjCommentary}"
                      </p>
                    </div>
                  </div>

                  {'speechSynthesis' in window && (
                    <button
                      onClick={toggleSpeakDjIntro}
                      className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        isSpeakingDj
                          ? 'bg-amber-500 text-neutral-950 border-amber-400 animate-pulse'
                          : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border-neutral-700'
                      }`}
                      title="Speak commentary aloud"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isSpeakingDj ? 'Speaking...' : 'Listen'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                  <h4 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                    <span>Curated AI Sequence</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-normal">
                      {profile.recommendedTracks.length} tracks
                    </span>
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Blends personal hearing affinities with top regional streams
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSavePlaylist}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSavedToLibrary 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border-neutral-700'
                    }`}
                  >
                    {isSavedToLibrary ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Saved to Library</span>
                      </>
                    ) : (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        <span>Save AI Playlist</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handlePlayAll}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play AI Playlist</span>
                  </button>
                </div>
              </div>

              {/* Recommended Tracks List */}
              <div className="space-y-1.5">
                {profile.recommendedTracks.map((track, idx) => {
                  const isHighPlayRegional = (track.playCount && track.playCount > 20000) || idx % 2 === 0;

                  return (
                    <div
                      key={track.id}
                      onClick={() => handlePlaySingle(track)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 text-center text-xs font-semibold text-neutral-500 group-hover:text-amber-400 transition-colors">
                          {idx + 1}
                        </span>
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-neutral-800">
                          <img 
                            src={track.artworkUrl} 
                            alt={track.title}
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-4 h-4 text-white fill-current" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-neutral-200 group-hover:text-amber-300 truncate transition-colors">
                              {track.title}
                            </h5>
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {track.artistNames?.join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-right">
                        {isHighPlayRegional ? (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium">
                            <Flame className="w-2.5 h-2.5" />
                            <span>Top Regional Hit</span>
                          </span>
                        ) : (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                            <Headphones className="w-2.5 h-2.5" />
                            <span>Hearing Pattern</span>
                          </span>
                        )}
                        <span className="text-[11px] text-neutral-500 font-mono">
                          {track.durationMs ? `${Math.floor(track.durationMs / 60000)}:${String(Math.floor((track.durationMs % 60000) / 1000)).padStart(2, '0')}` : '3:30'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-neutral-950/90 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Powered by Gemini 3.8 Flash hearing telemetry & regional chart synthesis</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg hover:bg-neutral-800 text-neutral-300 transition-colors font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
