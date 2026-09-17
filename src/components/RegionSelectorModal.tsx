import React from 'react';
import { MusicRegion, MusicRegionConfig } from '../types';
import { Sparkles, Check, X, Radio, ArrowRight, Disc3 } from 'lucide-react';

interface RegionSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRegion: MusicRegion;
  onSelectRegion: (region: MusicRegion) => void;
  onOpenAiPlaystyle?: () => void;
}

export const REGION_CONFIGS: Record<MusicRegion, MusicRegionConfig> = {
  cg: {
    id: 'cg',
    label: 'CG Gaana',
    hindiLabel: 'छत्तीसगढ़ी',
    subtitle: 'Karma, Dadariya, Jas Geet, Bastar Folk & Raipur DJ Remixes',
    badge: 'CG',
    color: '#f59e0b',
    accentGradient: 'from-amber-500 via-orange-500 to-yellow-500',
    searchDefaultQuery: 'chhattisgarhi geet hit songs',
    representativeArtists: ['Mamta Chandrakar', 'Kiran Chauhan', 'AVM Gana', 'Chandan Deep'],
    popularGenres: ['Karma', 'Dadariya', 'Jas Geet', 'Bastar Folk', 'CG DJ']
  },
  bollywood: {
    id: 'bollywood',
    label: 'Bollywood Gaana',
    hindiLabel: 'हिंदी',
    subtitle: 'Latest Hindi Blockbusters, Romantic Melodies & Chartbusters',
    badge: 'HINDI',
    color: '#ec4899',
    accentGradient: 'from-pink-500 via-rose-500 to-red-500',
    searchDefaultQuery: 'latest bollywood hit songs',
    representativeArtists: ['Arijit Singh', 'Shilpa Rao', 'Sachin-Jigar', 'Pritam'],
    popularGenres: ['Bollywood Hits', 'Romantic Melodies', 'Party Anthems', '90s Classics']
  },
  punjabi: {
    id: 'punjabi',
    label: 'Punjabi Gaana',
    hindiLabel: 'ਪੰਜਾਬੀ',
    subtitle: 'Bhangra, Desi Hip-Hop, Sidhu Moosewala, Diljit & AP Dhillon',
    badge: 'PUNJABI',
    color: '#06b6d4',
    accentGradient: 'from-cyan-500 via-teal-500 to-blue-500',
    searchDefaultQuery: 'latest punjabi hit songs',
    representativeArtists: ['Sidhu Moose Wala', 'Diljit Dosanjh', 'Karan Aujla', 'AP Dhillon'],
    popularGenres: ['Bhangra', 'Desi Hip-Hop', 'Panjabi Pop', 'UK Punjabi']
  },
  bhojpuri: {
    id: 'bhojpuri',
    label: 'Bhojpuri Gaana',
    hindiLabel: 'भोजपुरी',
    subtitle: 'Pawan Singh, Khesari Lal, Shilpi Raj & High-Energy Arkestra Hits',
    badge: 'BHOJPURI',
    color: '#a855f7',
    accentGradient: 'from-purple-500 via-violet-500 to-indigo-500',
    searchDefaultQuery: 'latest bhojpuri hit songs',
    representativeArtists: ['Pawan Singh', 'Khesari Lal Yadav', 'Shilpi Raj', 'Arshiya Arshi'],
    popularGenres: ['Bhojpuri Dance', 'Arkestra Hits', 'Lok Geet', 'Chhath Geet']
  }
};

export const RegionSelectorModal: React.FC<RegionSelectorModalProps> = ({
  isOpen,
  onClose,
  currentRegion,
  onSelectRegion,
  onOpenAiPlaystyle
}) => {
  if (!isOpen) return null;

  const regions: MusicRegion[] = ['cg', 'bollywood', 'punjabi', 'bhojpuri'];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg max-h-[90vh] bg-neutral-900/95 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-neutral-100 tracking-tight">
                  Select Music Hub
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                  Instant Switch
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Switch regional catalogs, top charts, and streaming rights
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition-colors flex items-center justify-center cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Region Cards List (Scrollable & Responsive) */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-2.5 relative z-10 scrollbar-thin">
          {regions.map((reg) => {
            const config = REGION_CONFIGS[reg];
            const isSelected = currentRegion === reg;

            return (
              <div
                key={reg}
                onClick={() => {
                  onSelectRegion(reg);
                  onClose();
                }}
                className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col gap-2 ${
                  isSelected
                    ? 'bg-neutral-850/90 border-amber-500/70 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                    : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850/60'
                }`}
              >
                {/* Top Row: Badge, Script & Selection Indicator */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider bg-gradient-to-r ${config.accentGradient} text-neutral-950 shadow-sm`}>
                      {config.badge}
                    </span>
                    <span className="text-xs font-bold text-neutral-300">
                      {config.hindiLabel}
                    </span>
                    <span className="text-xs text-neutral-500">•</span>
                    <h3 className="text-sm font-bold text-neutral-100 group-hover:text-white transition-colors">
                      {config.label}
                    </h3>
                  </div>

                  {isSelected ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Active</span>
                    </div>
                  ) : (
                    <span className="text-[11px] font-semibold text-neutral-400 group-hover:text-neutral-200 transition-colors flex items-center gap-1 shrink-0">
                      <span>Switch</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  )}
                </div>

                {/* Subtitle / Description */}
                <p className="text-xs text-neutral-400 leading-relaxed line-clamp-1">
                  {config.subtitle}
                </p>

                {/* Genre Tags & Artist preview */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {config.popularGenres.slice(0, 3).map((genre) => (
                      <span
                        key={genre}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800/80 text-neutral-400 border border-neutral-800 group-hover:border-neutral-700 transition-colors"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>

                  <span className="text-[10px] text-neutral-500 truncate hidden sm:inline">
                    {config.representativeArtists.slice(0, 2).join(', ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer with AI Playlist Shortcut */}
        <div className="p-3.5 sm:p-4 bg-neutral-950/90 border-t border-neutral-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-neutral-400">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="line-clamp-1">
              AI playlists will calibrate to your chosen hub & listening pattern
            </span>
          </div>

          {onOpenAiPlaystyle && (
            <button
              onClick={() => {
                onClose();
                onOpenAiPlaystyle();
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Make AI Playlist</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
