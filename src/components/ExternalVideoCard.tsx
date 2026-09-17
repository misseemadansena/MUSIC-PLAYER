import React from 'react';
import { ExternalLink, Video, Info, ShieldAlert } from 'lucide-react';
import { ExternalReference } from '../types';

interface ExternalVideoCardProps {
  reference: ExternalReference;
  trackTitle: string;
  artistNames: string[];
  artworkUrl: string;
}

export const ExternalVideoCard: React.FC<ExternalVideoCardProps> = ({
  reference,
  trackTitle,
  artistNames,
  artworkUrl
}) => {
  const handleOpenExternal = () => {
    // Strictly open official YouTube video directly in new browser tab
    window.open(reference.canonicalUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 transition-all group">
      <div className="flex items-start gap-3">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-neutral-800 shrink-0 shadow-md">
          <img
            src={artworkUrl}
            alt={trackTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Video className="w-5 h-5 text-red-500" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold uppercase tracking-wider">
              YouTube Reference
            </span>
          </div>
          <h4 className="text-sm font-bold text-neutral-100 truncate group-hover:text-amber-400 transition-colors">
            {reference.title || trackTitle}
          </h4>
          <p className="text-xs text-neutral-400 truncate mt-0.5">
            Channel: {reference.channelTitle || artistNames.join(', ')}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between gap-2">
        <p className="text-[10px] text-neutral-400 flex items-center gap-1 leading-tight flex-1">
          <Info className="w-3 h-3 text-neutral-400 shrink-0" />
          <span>Official video link. Audio is streamed independently on CG Gaana.</span>
        </p>

        <button
          onClick={handleOpenExternal}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-all cursor-pointer shrink-0 active:scale-95"
          title="Open official video on YouTube"
        >
          <span>Watch</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
