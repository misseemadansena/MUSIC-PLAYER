import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X, Music, User, Compass, Tag, Loader2, Play, Flame, Youtube, Radio } from 'lucide-react';
import { api, SearchResponse } from '../services/api';
import { TrackCard } from '../components/TrackCard';
import { Track, Artist, Playlist, AISearchIntentResult, MusicRegion } from '../types';
import { REGION_CONFIGS } from '../components/RegionSelectorModal';

interface SearchViewProps {
  currentRegion?: MusicRegion;
  onOpenAiPlaystyle?: () => void;
  onSelectArtist: (artist: Artist) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onToggleFavorite: (trackId: string) => void;
  favoriteIds: Set<string>;
  onOpenShare: (title: string, subtitle: string) => void;
}

type TabType = 'all' | 'youtube' | 'catalog' | 'artists' | 'playlists';

export const SearchView: React.FC<SearchViewProps> = ({
  currentRegion = 'cg',
  onOpenAiPlaystyle,
  onSelectArtist,
  onSelectPlaylist,
  onToggleFavorite,
  favoriteIds,
  onOpenShare
}) => {
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [results, setResults] = useState<SearchResponse['results']>({
    tracks: [],
    catalogTracks: [],
    youtubeTracks: [],
    artists: [],
    playlists: []
  });
  const [trendingYouTube, setTrendingYouTube] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [aiIntent, setAiIntent] = useState<AISearchIntentResult | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [searchPage, setSearchPage] = useState<number>(1);
  const [trendingPage, setTrendingPage] = useState<number>(1);
  const [loadingMoreResults, setLoadingMoreResults] = useState<boolean>(false);
  const [loadingMoreTrending, setLoadingMoreTrending] = useState<boolean>(false);
  const trendingSentinelRef = useRef<HTMLDivElement>(null);
  const searchSentinelRef = useRef<HTMLDivElement>(null);

  const regionConfig = REGION_CONFIGS[currentRegion] || REGION_CONFIGS.cg;

  // Regional search recommendations
  const getPopularTags = () => {
    switch (currentRegion) {
      case 'bollywood':
        return [
          { label: 'Arijit Singh Hits', query: 'Arijit Singh' },
          { label: 'Romantic Hindi Melodies', query: 'Romantic' },
          { label: 'Bollywood Party', query: 'Party' },
          { label: '90s Hindi Classics', query: '90s Hindi' },
          { label: 'Shreya Ghoshal', query: 'Shreya Ghoshal' },
          { label: 'Latest Soundtracks', query: 'Bollywood Soundtrack' }
        ];
      case 'punjabi':
        return [
          { label: 'Sidhu Moose Wala', query: 'Sidhu Moose Wala' },
          { label: 'Diljit Dosanjh', query: 'Diljit Dosanjh' },
          { label: 'Karan Aujla', query: 'Karan Aujla' },
          { label: 'Bhangra Dance Hits', query: 'Bhangra' },
          { label: 'Desi Hip-Hop', query: 'Desi Hip Hop' },
          { label: 'AP Dhillon', query: 'AP Dhillon' }
        ];
      case 'bhojpuri':
        return [
          { label: 'Pawan Singh Hits', query: 'Pawan Singh' },
          { label: 'Khesari Lal Yadav', query: 'Khesari Lal Yadav' },
          { label: 'Shilpi Raj', query: 'Shilpi Raj' },
          { label: 'Bhojpuri Arkestra', query: 'Bhojpuri Arkestra' },
          { label: 'DJ Dhamaka', query: 'Bhojpuri DJ Remix' },
          { label: 'Chhath Geet', query: 'Chhath' }
        ];
      case 'cg':
      default:
        return [
          { label: 'मया गीत (Love)', query: 'Maya' },
          { label: 'करमा (Karma)', query: 'Karma' },
          { label: 'ददरिया (Dadariya)', query: 'Dadariya' },
          { label: 'जस गीत (Jas Geet)', query: 'Jas Geet' },
          { label: 'डीजे रीमिक्स (DJ Bass)', query: 'DJ Remix' },
          { label: 'Dukalu Yadav', query: 'Dukalu Yadav' },
          { label: 'Sunil Soni', query: 'Sunil Soni' },
          { label: 'CG Song', query: 'CG Song' }
        ];
    }
  };

  const popularTags = getPopularTags();

  // Load trending tracks when component mounts or region changes
  useEffect(() => {
    let isMounted = true;
    setLoadingTrending(true);
    setTrendingPage(1);
    api.getYouTubeTrending(currentRegion, 1, 30)
      .then(tracks => {
        if (isMounted) {
          setTrendingYouTube(tracks);
        }
      })
      .catch(err => console.error('Failed to load initial trending tracks:', err))
      .finally(() => {
        if (isMounted) setLoadingTrending(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentRegion]);

  const handleSearch = async (searchQuery: string, genre?: string) => {
    setLoading(true);
    setSearchPage(1);
    try {
      const res = await api.search(searchQuery, genre, currentRegion, 1, 40);
      setResults(res.results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamically load more search results (No limit)
  const handleLoadMoreResults = async () => {
    if (!query.trim() && !activeGenre) return;
    setLoadingMoreResults(true);
    try {
      const nextPage = searchPage + 1;
      const res = await api.search(query, activeGenre, currentRegion, nextPage, 30);
      if (res && res.results && res.results.tracks.length > 0) {
        setResults(prev => {
          const existingIds = new Set(prev.tracks.map(t => t.id));
          const newTracks = res.results.tracks.filter(t => !existingIds.has(t.id));
          return {
            ...prev,
            tracks: [...prev.tracks, ...newTracks],
            youtubeTracks: [...prev.youtubeTracks, ...(res.results.youtubeTracks || [])]
          };
        });
        setSearchPage(nextPage);
      }
    } catch (err) {
      console.error('Failed to load more search results:', err);
    } finally {
      setLoadingMoreResults(false);
    }
  };

  // Dynamically load more trending songs (No limit)
  const handleLoadMoreTrending = async () => {
    setLoadingMoreTrending(true);
    try {
      const nextPage = trendingPage + 1;
      const moreTracks = await api.getYouTubeTrending(currentRegion, nextPage, 25);
      if (moreTracks && moreTracks.length > 0) {
        setTrendingYouTube(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const uniqueTracks = moreTracks.filter(t => !existingIds.has(t.id));
          return [...prev, ...uniqueTracks];
        });
        setTrendingPage(nextPage);
      }
    } catch (err) {
      console.error('Failed to load more trending tracks:', err);
    } finally {
      setLoadingMoreTrending(false);
    }
  };

  // Dynamically load trending songs on scroll
  useEffect(() => {
    if (!trendingSentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingTrending && !loadingMoreTrending && !query) {
        handleLoadMoreTrending();
      }
    }, { rootMargin: '300px' });

    observer.observe(trendingSentinelRef.current);
    return () => observer.disconnect();
  }, [loadingTrending, loadingMoreTrending, trendingPage, query, currentRegion]);

  // Dynamically load search results on scroll
  useEffect(() => {
    if (!searchSentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && !loadingMoreResults && (query || activeGenre)) {
        handleLoadMoreResults();
      }
    }, { rootMargin: '300px' });

    observer.observe(searchSentinelRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMoreResults, searchPage, query, activeGenre, currentRegion]);

  // Perform AI Search Intent Parsing
  const handleAiAnalyze = async () => {
    if (!query.trim()) return;
    setAnalyzingAi(true);
    try {
      const intent = await api.getSearchIntent(query);
      setAiIntent(intent);
      if (intent.suggestedTags && intent.suggestedTags.length > 0) {
        handleSearch(intent.suggestedTags[0], intent.detectedGenre);
      } else if (intent.detectedGenre) {
        handleSearch(query, intent.detectedGenre);
      }
    } catch (err) {
      console.error('AI Intent failed:', err);
    } finally {
      setAnalyzingAi(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query, activeGenre);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeGenre]);

  // Direct YouTube Search trigger
  const handleDirectYouTubeSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const ytTracks = await api.searchYouTube(query);
      setResults(prev => ({
        ...prev,
        tracks: ytTracks,
        youtubeTracks: ytTracks
      }));
      setActiveTab('youtube');
    } catch (err) {
      console.error('YouTube search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const displayedTracks = activeTab === 'youtube'
    ? (results.youtubeTracks && results.youtubeTracks.length > 0 ? results.youtubeTracks : results.tracks.filter(t => t.youtubeVideoId))
    : activeTab === 'catalog'
    ? (results.catalogTracks && results.catalogTracks.length > 0 ? results.catalogTracks : results.tracks.filter(t => !t.youtubeVideoId))
    : results.tracks;

  return (
    <div className="space-y-6 pb-32 pt-2 animate-fadeIn">
      {/* Search Input Bar */}
      <div className="p-4 sm:p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800 shadow-xl">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setAiIntent(null);
            }}
            placeholder="Search YouTube songs, artists, genres, or lyrics (e.g. 'मया के डोरी', 'Dukalu Yadav', 'DJ Karma')..."
            className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-sm sm:text-base text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
          />

          <div className="absolute right-2.5 flex items-center gap-1">
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setAiIntent(null);
                }}
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleAiAnalyze}
              disabled={!query.trim() || analyzingAi}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-neutral-950 text-xs font-bold transition-all shadow-sm disabled:opacity-40 cursor-pointer"
              title="Parse search intent using Gemini AI"
            >
              {analyzingAi ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">AI Search</span>
            </button>
          </div>
        </div>

        {/* AI Intent Insights Banner */}
        {aiIntent && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 animate-fadeIn">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>AI Search Intent Insights</span>
              </div>
              <span className="text-[10px] text-neutral-400">Powered by Gemini</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              {aiIntent.detectedGenre && (
                <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-200">
                  Genre: <strong className="text-amber-400">{aiIntent.detectedGenre}</strong>
                </span>
              )}
              {aiIntent.detectedMood && (
                <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-200">
                  Mood: <strong className="text-amber-400">{aiIntent.detectedMood}</strong>
                </span>
              )}
              {aiIntent.detectedRegion && (
                <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-200">
                  Region: <strong className="text-amber-400">{aiIntent.detectedRegion}</strong>
                </span>
              )}
              {aiIntent.confidence && (
                <span className="text-[11px] text-neutral-400 ml-auto">
                  Confidence: {Math.round(aiIntent.confidence * 100)}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Quick Tag Recommendations */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs text-neutral-500 flex items-center gap-1 shrink-0">
            <Tag className="w-3 h-3" />
            <span>Popular:</span>
          </span>
          {popularTags.map(tag => (
            <button
              key={tag.query}
              onClick={() => {
                setQuery(tag.query);
                handleSearch(tag.query);
              }}
              className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-amber-400 text-xs transition-colors shrink-0 cursor-pointer"
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs when search query is active */}
      {query && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            All Results ({results.tracks.length})
          </button>

          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'youtube'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-neutral-900 text-neutral-400 hover:text-red-400 border border-neutral-800'
            }`}
          >
            <Youtube className="w-3.5 h-3.5 fill-current" />
            <span>YouTube Songs ({results.youtubeTracks?.length || results.tracks.filter(t => t.youtubeVideoId).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            Catalog ({results.catalogTracks?.length || results.tracks.filter(t => !t.youtubeVideoId).length})
          </button>

          {results.artists.length > 0 && (
            <button
              onClick={() => setActiveTab('artists')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'artists'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              Artists ({results.artists.length})
            </button>
          )}

          {results.playlists.length > 0 && (
            <button
              onClick={() => setActiveTab('playlists')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'playlists'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              Playlists ({results.playlists.length})
            </button>
          )}
        </div>
      )}

      {/* Initial View: Trending YouTube Hits when Query is Empty */}
      {!query && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-neutral-100 flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500 fill-current" />
              <span>Trending {regionConfig.label} Songs on YouTube</span>
            </h2>
            <span className="text-xs text-neutral-400 flex items-center gap-1">
              <Youtube className="w-4 h-4 text-red-500" />
              <span>Live Updates</span>
            </span>
          </div>

          {loadingTrending ? (
            <div className="py-12 flex flex-col items-center justify-center text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500 mb-2" />
              <span className="text-xs">Fetching trending {regionConfig.label} songs...</span>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {trendingYouTube.map(track => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    trackList={trendingYouTube}
                    layout="row"
                    isFavorite={favoriteIds.has(track.id)}
                    onToggleFavorite={onToggleFavorite}
                    onOpenShare={onOpenShare}
                  />
                ))}
              </div>

              {trendingYouTube.length > 0 && (
                <div ref={trendingSentinelRef} className="pt-3 pb-1 text-center">
                  {loadingMoreTrending ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                      <span>Loading more trending songs as you scroll...</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-neutral-500">
                      Scroll to dynamically load more {regionConfig.label} songs
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Results Sections */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500 mb-2" />
          <span className="text-xs">Searching YouTube and regional catalog...</span>
        </div>
      ) : query && (
        <div className="space-y-6">
          {/* Tracks Results */}
          {(activeTab === 'all' || activeTab === 'youtube' || activeTab === 'catalog') && displayedTracks.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" />
                <span>Songs ({displayedTracks.length})</span>
              </h2>
              <div className="space-y-2">
                {displayedTracks.map(track => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    trackList={displayedTracks}
                    layout="row"
                    isFavorite={favoriteIds.has(track.id)}
                    onToggleFavorite={onToggleFavorite}
                    onOpenShare={onOpenShare}
                  />
                ))}
              </div>

              <div ref={searchSentinelRef} className="pt-3 pb-1 text-center">
                {loadingMoreResults ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>Loading more songs as you scroll...</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-neutral-500">
                    Scroll down to dynamically load more songs
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Artists Results */}
          {(activeTab === 'all' || activeTab === 'artists') && results.artists.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <span>Artists ({results.artists.length})</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {results.artists.map(artist => (
                  <div
                    key={artist.id}
                    onClick={() => onSelectArtist(artist)}
                    className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer group flex items-center gap-3"
                  >
                    <img
                      src={artist.imageUrl}
                      alt={artist.name}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-neutral-100 truncate group-hover:text-amber-400 transition-colors">
                        {artist.name}
                      </h4>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {artist.region}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Playlists Results */}
          {(activeTab === 'all' || activeTab === 'playlists') && results.playlists.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>Playlists ({results.playlists.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {results.playlists.map(pl => (
                  <div
                    key={pl.id}
                    onClick={() => onSelectPlaylist(pl)}
                    className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer group flex items-center gap-3"
                  >
                    <img
                      src={pl.artworkUrl}
                      alt={pl.title}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-neutral-100 truncate group-hover:text-amber-400 transition-colors">
                        {pl.title}
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        {pl.trackIds.length} tracks
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* No results */}
          {displayedTracks.length === 0 && results.artists.length === 0 && results.playlists.length === 0 && query && (
            <div className="py-16 text-center text-neutral-400 space-y-4">
              <p className="text-sm">No songs found in local catalog matching "{query}".</p>
              <button
                onClick={handleDirectYouTubeSearch}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
              >
                <Youtube className="w-4 h-4 fill-current" />
                <span>Search YouTube for "{query}"</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

