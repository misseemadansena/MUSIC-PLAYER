import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, TrendingUp, ArrowUp, ArrowDown, 
  Minus, Sparkles, Clock, ShieldCheck, Info, Loader2
} from 'lucide-react';
import { api, TrendingResponse } from '../services/api';
import { Track, MusicRegion } from '../types';
import { TrackCard } from '../components/TrackCard';
import { REGION_CONFIGS } from '../components/RegionSelectorModal';

interface TrendingViewProps {
  currentRegion?: MusicRegion;
  onOpenTrendingExplanation: (track?: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  favoriteIds: Set<string>;
  onOpenShare: (title: string, subtitle: string) => void;
}

export const TrendingView: React.FC<TrendingViewProps> = ({
  currentRegion = 'cg',
  onOpenTrendingExplanation,
  onToggleFavorite,
  favoriteIds,
  onOpenShare
}) => {
  const [windowTime, setWindowTime] = useState<'today' | 'week' | 'month'>('today');
  const [trendingData, setTrendingData] = useState<TrendingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const regionConfig = REGION_CONFIGS[currentRegion] || REGION_CONFIGS.cg;
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setPage(1);
    api.getTrending(windowTime, currentRegion, 1, 30)
      .then(res => {
        if (isMounted) {
          setTrendingData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load trending:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [windowTime, currentRegion]);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await api.getTrending(windowTime, currentRegion, nextPage, 25);
      if (res && res.leaderboard && res.leaderboard.length > 0) {
        setTrendingData(prev => {
          if (!prev) return res;
          const existingIds = new Set(prev.leaderboard.map(item => item.trackId));
          const newItems = res.leaderboard.filter(item => !existingIds.has(item.trackId));
          return {
            ...prev,
            leaderboard: [...prev.leaderboard, ...newItems],
            totalRanked: prev.leaderboard.length + newItems.length
          };
        });
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Failed to load more trending tracks:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Dynamically load as user scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && !loadingMore) {
        handleLoadMore();
      }
    }, { rootMargin: '350px' });

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, page, windowTime, currentRegion]);

  const tracks = trendingData?.leaderboard.map(item => item.track).filter(Boolean) as Track[];

  return (
    <div className="space-y-6 pb-32 pt-2 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-orange-950/60 via-neutral-900 to-neutral-950 border border-orange-500/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-orange-500/20 text-orange-400">
              <Flame className="w-4 h-4 fill-current" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
              {regionConfig.label} Regional Leaderboard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-100">
            {regionConfig.title} Trending Charts
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-xl">
            Real-time ranked music velocity and live YouTube streaming count. 100% transparent and continuously updated.
          </p>
        </div>

        {/* Time Window Selector & Explanation Trigger */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center bg-neutral-900/90 border border-neutral-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setWindowTime('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                windowTime === 'today'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setWindowTime('week')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                windowTime === 'week'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setWindowTime('month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                windowTime === 'month'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All-Time Hits
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Table / Rows */}
      {loading ? (
        <div className="py-20 text-center text-sm text-neutral-400">
          Calculating regional velocity scores...
        </div>
      ) : (
        <div className="space-y-3">
          {trendingData?.leaderboard.map((snapshot) => {
            const track = snapshot.track;
            if (!track) return null;

            return (
              <div
                key={`${snapshot.trackId}-${snapshot.rank}`}
                className="group relative rounded-2xl bg-neutral-900/60 border border-neutral-800/90 hover:bg-neutral-900 hover:border-neutral-700 transition-all p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Rank & Delta */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="flex flex-col items-center justify-center w-8 shrink-0">
                    <span className={`text-lg sm:text-xl font-extrabold font-mono ${
                      snapshot.rank === 1 ? 'text-amber-400' :
                      snapshot.rank === 2 ? 'text-neutral-200' :
                      snapshot.rank === 3 ? 'text-amber-600' : 'text-neutral-500'
                    }`}>
                      #{snapshot.rank}
                    </span>
                    <div className="text-[10px] font-mono flex items-center mt-0.5">
                      {snapshot.rankDelta > 0 ? (
                        <span className="text-emerald-400 flex items-center font-bold">
                          <ArrowUp className="w-2.5 h-2.5" />
                          {snapshot.rankDelta}
                        </span>
                      ) : snapshot.rankDelta < 0 ? (
                        <span className="text-rose-400 flex items-center font-bold">
                          <ArrowDown className="w-2.5 h-2.5" />
                          {Math.abs(snapshot.rankDelta)}
                        </span>
                      ) : (
                        <span className="text-neutral-500 flex items-center">
                          <Minus className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Embed the Track Card Row */}
                  <div className="min-w-0 flex-1">
                    <TrackCard
                      track={track}
                      trackList={tracks}
                      layout="row"
                      isFavorite={favoriteIds.has(track.id)}
                      onToggleFavorite={onToggleFavorite}
                      onOpenShare={onOpenShare}
                      trendScore={snapshot.score}
                    />
                  </div>
                </div>

                {/* Right: Explanation & Factor Pill */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pl-11 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800/60">
                  <div className="text-left sm:text-right">
                    <div className="text-xs font-semibold text-neutral-300">
                      {snapshot.explanation || 'High completion & YouTube velocity'}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Score: <span className="font-mono text-amber-400 font-bold">{snapshot.score}</span> / 100
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenTrendingExplanation(track)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-amber-400 text-xs font-medium transition-colors cursor-pointer shrink-0"
                    title="Inspect mathematical breakdown"
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}

          {/* Dynamically Load As User Scroll Sentinel */}
          <div ref={sentinelRef} className="pt-6 pb-4 text-center">
            {loadingMore ? (
              <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Dynamically loading songs as you scroll...</span>
              </div>
            ) : (
              <div className="text-[11px] text-neutral-500 font-medium">
                Dynamically loads songs as you scroll
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
