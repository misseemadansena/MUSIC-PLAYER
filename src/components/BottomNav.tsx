import React from 'react';
import { Home, TrendingUp, Search, Library, Sparkles } from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAiPlaystyle: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  currentView, 
  onNavigate, 
  onOpenAiPlaystyle 
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-lg border-t border-neutral-800/80 px-2 py-1 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around">
        {/* Home */}
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
            currentView === 'home'
              ? 'text-amber-400 font-bold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Home className={`w-5 h-5 transition-transform ${currentView === 'home' ? 'scale-110 text-amber-400' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight leading-none">
            Home
          </span>
        </button>

        {/* Trending */}
        <button
          onClick={() => onNavigate('trending')}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
            currentView === 'trending'
              ? 'text-amber-400 font-bold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <TrendingUp className={`w-5 h-5 transition-transform ${currentView === 'trending' ? 'scale-110 text-amber-400' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight leading-none">
            Trending
          </span>
        </button>

        {/* Center AI Playstyle Button */}
        <button
          onClick={onOpenAiPlaystyle}
          className="flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-xl text-amber-400 hover:text-amber-300 transition-all cursor-pointer group"
        >
          <div className="relative p-1 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/40 group-active:scale-95 transition-transform">
            <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
          </div>
          <span className="text-[10px] mt-1 font-bold text-amber-400 tracking-tight leading-none">
            AI Mix
          </span>
        </button>

        {/* Search */}
        <button
          onClick={() => onNavigate('search')}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
            currentView === 'search'
              ? 'text-amber-400 font-bold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Search className={`w-5 h-5 transition-transform ${currentView === 'search' ? 'scale-110 text-amber-400' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight leading-none">
            Search
          </span>
        </button>

        {/* Library */}
        <button
          onClick={() => onNavigate('library')}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
            currentView === 'library'
              ? 'text-amber-400 font-bold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Library className={`w-5 h-5 transition-transform ${currentView === 'library' ? 'scale-110 text-amber-400' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight leading-none">
            Library
          </span>
        </button>
      </div>
    </nav>
  );
};
