import React from 'react';
import { X, TrendingUp, ShieldAlert, Cpu, Activity, CheckCircle, Flame } from 'lucide-react';
import { TrendFactorBreakdown } from '../types';

interface FactorBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackTitle?: string;
  trendScore?: number;
  factors?: TrendFactorBreakdown;
  explanation?: string;
}

export const FactorBreakdownModal: React.FC<FactorBreakdownModalProps> = ({
  isOpen,
  onClose,
  trackTitle,
  trendScore,
  factors,
  explanation
}) => {
  if (!isOpen) return null;

  const weights = [
    { name: 'Recent Play Velocity', weight: '35%', desc: 'Play acceleration across Raipur, Bilaspur, Bastar, and Durg in the last 24h.', value: factors?.playVelocityScore },
    { name: 'Completion Rate', weight: '20%', desc: 'Percentage of listeners who stream the full track (>80% duration).', value: factors?.completionScore },
    { name: 'Unique Listeners', weight: '15%', desc: 'Distinct verified listener sessions to prevent single-device looping.', value: factors?.uniqueListenersScore },
    { name: 'Favorite & Share Rate', weight: '10%', desc: 'Organic saves to user library and playlist additions.', value: factors?.favoriteRateScore },
    { name: 'Recency & Novelty', weight: '10%', desc: 'Fresh releases receive a logarithmic boost that decays gently over 14 days.', value: factors?.recencyScore },
    { name: 'Editorial Cultural Boost', weight: '10%', desc: 'Preservation boost for authentic folk genres (Karma, Dadariya, Panthi).', value: factors?.editorialBoostScore }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-neutral-950 border border-neutral-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-900">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-100">
                Trending Score Breakdown
              </h3>
              <p className="text-xs text-neutral-400">
                CG Gaana Weighted Ranking Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Track Snapshot if provided */}
        {trackTitle && (
          <div className="my-4 p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                Selected Track
              </span>
              <h4 className="text-sm font-bold text-neutral-100 truncate">
                {trackTitle}
              </h4>
              {explanation && (
                <p className="text-xs text-neutral-300 mt-0.5">
                  {explanation}
                </p>
              )}
            </div>

            {trendScore !== undefined && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono font-bold text-sm shrink-0">
                <Flame className="w-4 h-4 fill-current" />
                <span>{trendScore} pts</span>
              </div>
            )}
          </div>
        )}

        {/* Factor Breakdown Weights */}
        <div className="space-y-2.5 my-4 max-h-[42vh] overflow-y-auto pr-1">
          {weights.map((w, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/80">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-neutral-200">{w.name}</span>
                <span className="font-mono text-amber-400 font-bold bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                  {w.weight}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal">
                {w.desc}
              </p>
              {w.value !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full" 
                      style={{ width: `${Math.min(100, Math.max(0, w.value))}%` }} 
                    />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {Math.round(w.value)}/100
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Anti-Gaming Policy Box */}
        <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-neutral-300 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-amber-300">Anti-Gaming Safeguards: </span>
            A maximum of 5 plays per listener session within 15 minutes are counted toward velocity. Sudden unnatural spike velocities trigger an automatic damping factor.
          </div>
        </div>
      </div>
    </div>
  );
};
