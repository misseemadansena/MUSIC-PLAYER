import React, { useState, useRef, useEffect } from 'react';
import { 
  Flame, Sparkles, TrendingUp, Music, Compass, 
  ChevronRight, UserCheck, ShieldCheck, Headphones,
  Radio, Play, ArrowRight, Zap, Loader2
} from 'lucide-react';
import { HomeFeedData, api } from '../services/api';
import { TrackCard } from '../components/TrackCard';
import { ExternalVideoCard } from '../components/ExternalVideoCard';
import { Track, Artist, Playlist, MusicRegion } from '../types';
import { REGION_CONFIGS } from '../components/RegionSelectorModal';

interface HomeViewProps {
  data: HomeFeedData;
  currentRegion: MusicRegion;
  onOpenRegionSelector: () => void;
  onOpenAiPlaystyle: () => void;
  onSelectArtist: (artist: Artist) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenTrendingExplanation: (track?: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  favoriteIds: Set<string>;
  onOpenShare: (title: string, subtitle: string) => void;
  onNavigate: (view: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  data,
  currentRegion,
  onOpenRegionSelector,
  onOpenAiPlaystyle,
  onSelectArtist,
  onSelectPlaylist,
  onOpenTrendingExplanation,
  onToggleFavorite,
  favoriteIds,
  onOpenShare,
  onNavigate
}) => {
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('All');
  const [visibleTrendingLimit, setVisibleTrendingLimit] = useState<number>(12);
  const [dynamicExtraTracks, setDynamicExtraTracks] = useState<Track[]>([]);
  const [dynamicPage, setDynamicPage] = useState<number>(1);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMoreDynamic, setHasMoreDynamic] = useState<boolean>(true);
  const [visibleNewLimit, setVisibleNewLimit] = useState<number>(6);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visibleExternalLimit, setVisibleExternalLimit] = useState<number>(8);

  const regionConfig = REGION_CONFIGS[currentRegion] || REGION_CONFIGS.cg;

  // Reset pagination and dynamic extras when switching region
  useEffect(() => {
    setDynamicExtraTracks([]);
    setDynamicPage(1);
    setVisibleTrendingLimit(12);
    setHasMoreDynamic(true);
  }, [currentRegion]);

  // Combine initial feed with dynamically loaded extra tracks
  const combinedTrending = [...data.trendingToday, ...dynamicExtraTracks];

  const filteredTrending = selectedGenreFilter === 'All'
    ? combinedTrending
    : combinedTrending.filter(t => t.genres?.includes(selectedGenreFilter));

  const filteredNew = selectedGenreFilter === 'All'
    ? data.newInCG
    : data.newInCG.filter(t => t.genres?.includes(selectedGenreFilter));

  // Dynamic infinite loader for songs
  const handleLoadMoreSongs = async () => {
    // If we have more already in combinedTrending than visible, first reveal them
    if (visibleTrendingLimit < filteredTrending.length) {
      setVisibleTrendingLimit(prev => prev + 12);
      return;
    }

    if (loadingMore || !hasMoreDynamic) return;

    // Otherwise, dynamically fetch fresh page of tracks with no limit
    setLoadingMore(true);
    try {
      const nextPage = dynamicPage + 1;
      const res = await api.getInfiniteTracks({
        region: currentRegion,
        page: nextPage,
        limit: 20
      });

      if (res && res.tracks && res.tracks.length > 0) {
        setDynamicExtraTracks(prev => {
          const existingIds = new Set(prev.map(t => t.id).concat(data.trendingToday.map(t => t.id)));
          const uniqueNew = res.tracks.filter(t => !existingIds.has(t.id));
          return [...prev, ...uniqueNew];
        });
        setDynamicPage(nextPage);
        setVisibleTrendingLimit(prev => prev + res.tracks.length);
        if (!res.hasMore) {
          setHasMoreDynamic(false);
        }
      } else {
        setHasMoreDynamic(false);
      }
    } catch (err) {
      setHasMoreDynamic(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Dynamically load as user scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMore && hasMoreDynamic) {
        handleLoadMoreSongs();
      }
    }, { rootMargin: '350px' });

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadingMore, hasMoreDynamic, visibleTrendingLimit, filteredTrending.length, dynamicPage, currentRegion]);

  return (
    <div className="space-y-7 pb-32 pt-2 animate-fadeIn">
      {/* Hero Culture Banner */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-925 to-neutral-950 border border-neutral-800 p-6 sm:p-8 shadow-2xl`}>
        <div className={`absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-r ${regionConfig.accentGradient} opacity-15 blur-3xl pointer-events-none`} />
        
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <button
              onClick={onOpenRegionSelector}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700 text-amber-300 text-xs font-semibold cursor-pointer transition-colors"
              title="Click to switch between CG, Bollywood, Punjabi, Bhojpuri"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>{regionConfig.label} ({regionConfig.hindiLabel})</span>
              <span className="text-[10px] text-neutral-400 font-normal ml-1 underline">Switch</span>
            </button>

            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>Authorized Streaming</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-neutral-100 tracking-tight leading-tight">
            {data.hero?.tagline || `${regionConfig.label}, हर धड़कन म`}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-xl leading-relaxed">
            {data.hero?.subtitle || regionConfig.subtitle}
          </p>

          <div className="flex items-center gap-3 sm:gap-4 mt-5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
              <Headphones className="w-4 h-4 text-amber-400" />
              <span>{data.hero?.activeListenersCount?.toLocaleString() || '384,200'} active listeners</span>
            </div>

            <button
              onClick={onOpenAiPlaystyle}
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate AI Playstyle Persona</span>
            </button>
          </div>
        </div>
      </div>

      {/* Genre Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedGenreFilter('All')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
            selectedGenreFilter === 'All'
              ? 'bg-amber-500 text-neutral-950 shadow-sm'
              : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
          }`}
        >
          All Genres ({regionConfig.badge})
        </button>
        {data.genres?.map(genre => (
          <button
            key={genre.id}
            onClick={() => setSelectedGenreFilter(genre.name)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              selectedGenreFilter === genre.name
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
            }`}
          >
            {genre.name} {genre.count ? `(${genre.count})` : ''}
          </button>
        ))}
      </div>

      {/* Trending Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-orange-500/10 text-orange-400">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-100">
                Trending in {regionConfig.label} Today
              </h2>
              <p className="text-xs text-neutral-400">
                Ranked by play velocity, completion rate & community favorites
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('trending')}
              className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span>See Top 20</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {filteredTrending.slice(0, visibleTrendingLimit).map((track, idx) => (
            <TrackCard
              key={track.id}
              track={track}
              trackList={filteredTrending}
              trendRank={idx + 1}
              trendScore={track.trendScore}
              isFavorite={favoriteIds.has(track.id)}
              onToggleFavorite={onToggleFavorite}
              onOpenShare={onOpenShare}
            />
          ))}
        </div>

        {/* Dynamically Load as User Scroll Sentinel */}
        <div ref={sentinelRef} className="mt-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 rounded-2xl bg-neutral-900/40 border border-neutral-800/60">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>
              Showing <strong className="text-neutral-100">{Math.min(visibleTrendingLimit, filteredTrending.length)}</strong> of <strong className="text-amber-400">{filteredTrending.length}+</strong> songs dynamically loaded
            </span>
          </div>

          <div className="flex items-center gap-3">
            {loadingMore && (
              <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading more songs as you scroll...</span>
              </div>
            )}
            <button
              onClick={() => onNavigate('search')}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 border border-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Search Catalog</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Fresh Releases: New in CG */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-100">
                New in {regionConfig.label} Releases
              </h2>
              <p className="text-xs text-neutral-400">
                Freshly authorized releases direct from regional artists and studios
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredNew.slice(0, visibleNewLimit).map(track => (
            <TrackCard
              key={track.id}
              track={track}
              trackList={filteredNew}
              layout="row"
              isFavorite={favoriteIds.has(track.id)}
              onToggleFavorite={onToggleFavorite}
              onOpenShare={onOpenShare}
            />
          ))}
        </div>

        {filteredNew.length > visibleNewLimit && (
          <div className="mt-3 text-center">
            <button
              onClick={() => setVisibleNewLimit(prev => prev + 8)}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-amber-400 transition-colors cursor-pointer"
            >
              Show More New Releases ({filteredNew.length - visibleNewLimit} more)
            </button>
          </div>
        )}
      </section>

      {/* Curated Regional Playlists */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-100">
                Curated Regional Playlists
              </h2>
              <p className="text-xs text-neutral-400">
                Handpicked collections for Bastar heritage, wedding DJ bass, and morning bhakti
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {data.playlists?.map(playlist => (
            <div
              key={playlist.id}
              onClick={() => onSelectPlaylist(playlist)}
              className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 transition-all cursor-pointer group flex gap-3.5 items-center"
            >
              <img
                src={playlist.artworkUrl}
                alt={playlist.title}
                className="w-16 h-16 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  Curated Collection
                </span>
                <h3 className="text-sm font-bold text-neutral-100 truncate group-hover:text-amber-400 transition-colors">
                  {playlist.title}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                  {playlist.description}
                </p>
                <div className="text-[11px] text-neutral-500 mt-1">
                  {playlist.trackIds.length} tracks
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Chhattisgarhi Artists */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-100">
                Featured Chhattisgarhi Artists
              </h2>
              <p className="text-xs text-neutral-400">
                Legendary voices and modern pioneers of the regional soundscape
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {data.artists?.map(artist => (
            <div
              key={artist.id}
              onClick={() => onSelectArtist(artist)}
              className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 transition-all cursor-pointer group flex flex-col items-center text-center"
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-neutral-800 mb-3 shadow-lg">
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex items-center gap-1">
                <h3 className="text-sm font-bold text-neutral-100 group-hover:text-amber-400 transition-colors">
                  {artist.name}
                </h3>
                {artist.verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {artist.region || 'Chhattisgarh'}
              </p>
              <span className="text-[11px] text-amber-500 font-medium mt-1">
                {artist.monthlyListeners?.toLocaleString() || '150,000'} listeners
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* External Discovery ("Find it on YouTube") with strict PRD Section 10 boundary */}
      <section className="p-5 sm:p-6 rounded-3xl bg-neutral-950 border border-neutral-800/90 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                External Discovery
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                Official Links Only
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-100 mt-1">
              Watch Official {regionConfig.label} Videos on YouTube
            </h2>
            <p className="text-xs text-neutral-400 max-w-2xl mt-0.5">
              CG Gaana provides direct reference links to official music videos on YouTube. Audio is streamed independently on CG Gaana from authorized master catalogs.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {data.externalDiscovery?.slice(0, visibleExternalLimit).map(item => (
            <ExternalVideoCard
              key={item.trackId}
              reference={item.externalReference}
              trackTitle={item.trackTitle}
              artistNames={item.artistNames}
              artworkUrl={item.artworkUrl}
            />
          ))}
        </div>

        {data.externalDiscovery && data.externalDiscovery.length > visibleExternalLimit && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setVisibleExternalLimit(prev => prev + 6)}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-amber-400 transition-colors cursor-pointer"
            >
              Show More Official Videos ({data.externalDiscovery.length - visibleExternalLimit} more)
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
