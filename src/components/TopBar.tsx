import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Sparkles, Music2, ChevronDown, Radio, 
  User as UserIcon, LogIn, LogOut, ShieldAlert, 
  Settings, FolderHeart, Check
} from 'lucide-react';
import { MusicRegion, User } from '../types';
import { REGION_CONFIGS } from './RegionSelectorModal';

interface TopBarProps {
  currentRegion: MusicRegion;
  currentUser: User | null;
  onOpenRegionSelector: () => void;
  onOpenAiPlaystyle: () => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  currentView: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentRegion,
  currentUser,
  onOpenRegionSelector,
  onOpenAiPlaystyle,
  onOpenAuthModal,
  onLogout,
  onNavigate,
  currentView
}) => {
  const activeConfig = REGION_CONFIGS[currentRegion] || REGION_CONFIGS.cg;
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 px-3 sm:px-4 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Interactive Region Switcher */}
        <div 
          onClick={onOpenRegionSelector} 
          className="flex items-center gap-2.5 cursor-pointer group select-none py-1 px-1.5 -ml-1.5 rounded-2xl hover:bg-neutral-900/80 transition-all active:scale-98"
          title="Click to switch music hub: CG, Bollywood, Punjabi, Bhojpuri"
        >
          {/* Animated Music Hub Icon */}
          <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr ${activeConfig.accentGradient} p-0.5 shadow-lg shadow-black/40 group-hover:scale-105 transition-transform shrink-0`}>
            <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
              <Music2 className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-200 bg-clip-text text-transparent">
                {activeConfig.label}
              </span>
              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black uppercase tracking-wider">
                <span>{activeConfig.badge}</span>
                <ChevronDown className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-medium leading-none tracking-normal truncate max-w-[140px] sm:max-w-none">
              {activeConfig.hindiLabel} • Switch Hub
            </p>
          </div>
        </div>

        {/* Center Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-neutral-900/80 p-1 rounded-xl border border-neutral-800 text-sm">
          <button
            onClick={() => onNavigate('home')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              currentView === 'home' 
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm' 
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('trending')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              currentView === 'trending' 
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm' 
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
            }`}
          >
            Trending
          </button>
          <button
            onClick={onOpenAiPlaystyle}
            className="px-3 py-1.5 rounded-lg font-medium transition-all text-neutral-300 hover:text-amber-300 hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer group"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>AI Playstyle</span>
          </button>
          <button
            onClick={() => onNavigate('search')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              currentView === 'search' 
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm' 
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
            }`}
          >
            Search
          </button>
          <button
            onClick={() => onNavigate('library')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              currentView === 'library' 
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm' 
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
            }`}
          >
            My Library
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'admin' 
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm' 
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Admin Studio</span>
            </button>
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick AI Playstyle Button */}
          <button
            onClick={onOpenAiPlaystyle}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 text-xs font-bold transition-all shadow-md shadow-amber-500/10 active:scale-95 cursor-pointer"
            title="Open AI Playstyle Radio"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">AI Playstyle</span>
            <span className="sm:hidden">AI Mix</span>
          </button>

          {/* Quick Search Button (Mobile/Tablet) */}
          <button
            onClick={() => onNavigate('search')}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-amber-400 hover:border-neutral-700 transition-colors md:hidden cursor-pointer"
            title="Search tracks and artists"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Region Switcher Pill button (direct tap) */}
          <button
            onClick={onOpenRegionSelector}
            className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
            title="Change Hub"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>{activeConfig.badge}</span>
            <ChevronDown className="w-3 h-3 text-neutral-500" />
          </button>

          {/* User Account / Login & Register Button */}
          {!currentUser ? (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:border-amber-500/40"
              title="Sign In or Register"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign In</span>
            </button>
          ) : (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-neutral-950 flex items-center justify-center font-bold text-[11px] shrink-0">
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden sm:inline font-medium max-w-[100px] truncate">
                  {currentUser.displayName || currentUser.email.split('@')[0]}
                </span>
                {currentUser.role === 'admin' && (
                  <span className="hidden sm:inline px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold uppercase tracking-wider">
                    Admin
                  </span>
                )}
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-bold text-neutral-100 truncate">
                        {currentUser.displayName || 'CG Gaana User'}
                      </p>
                      {currentUser.role === 'admin' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-neutral-950 text-[9px] font-extrabold uppercase tracking-wider">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 font-mono truncate">
                      {currentUser.email}
                    </p>
                  </div>

                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onNavigate('admin');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors text-left cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-amber-400" />
                      <span>Admin Catalog Studio</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onNavigate('library');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition-colors text-left cursor-pointer"
                  >
                    <FolderHeart className="w-4 h-4 text-neutral-400" />
                    <span>My Saved Songs & Playlists</span>
                  </button>

                  <div className="my-1 border-t border-neutral-800" />

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

