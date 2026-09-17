import { 
  Track, Artist, Album, Playlist, RightsRecord, TrendSnapshot, 
  PlaybackTokenResponse, AIEnrichmentResult, AISearchIntentResult, 
  ArtistSubmission, EditorialAction, TrendFactorBreakdown,
  MusicRegion, UserPlaystyleProfile, User
} from '../types';

const API_BASE = '/api';

export interface HomeFeedData {
  region?: MusicRegion;
  hero: {
    tagline: string;
    subtitle: string;
    activeListenersCount: number;
  };
  trendingToday: (Track & { trendRank: number; trendDelta: number; trendScore: number; trendExplanation: string })[];
  trendingYouTube?: Track[];
  newInCG: Track[];
  genres: { id: string; name: string; description?: string; count?: number; color?: string; iconName?: string; icon?: string }[];
  artists: Artist[];
  playlists: Playlist[];
  externalDiscovery: {
    trackId: string;
    trackTitle: string;
    artistNames: string[];
    artworkUrl: string;
    externalReference: any;
    youtubeVideoId?: string;
  }[];
}

export interface TrendingResponse {
  window: string;
  lastUpdated: string;
  weights: any;
  totalRanked: number;
  leaderboard: (TrendSnapshot & { track?: Track })[];
}

export interface SearchResponse {
  query: string;
  region?: MusicRegion;
  results: {
    tracks: Track[];
    catalogTracks?: Track[];
    youtubeTracks?: Track[];
    artists: Artist[];
    playlists: Playlist[];
  };
}

export interface AdminOverviewData {
  metrics: {
    totalTracks: number;
    publishedTracks: number;
    pendingReviewTracks: number;
    activeArtists: number;
    totalPlayEvents: number;
    pendingSubmissions: number;
    curatedPlaylists: number;
  };
  rightsCoveragePercent: number;
  recentAuditLogs: EditorialAction[];
}

export const api = {
  // Public Feeds
  async getHome(region: string = 'cg'): Promise<HomeFeedData> {
    const res = await fetch(`${API_BASE}/home?region=${encodeURIComponent(region)}`);
    if (!res.ok) throw new Error('Failed to fetch home feed');
    return res.json();
  },

  async getTrending(window = 'today', region: string = 'cg', page = 1, limit = 30): Promise<TrendingResponse> {
    const res = await fetch(`${API_BASE}/trending?window=${window}&region=${encodeURIComponent(region)}&page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to fetch trending chart (${res.status})`);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Unexpected non-JSON response from server: ${res.status}`);
    }
    return res.json();
  },

  async getInfiniteTracks(params: {
    region?: string;
    page?: number;
    limit?: number;
    genre?: string;
    q?: string;
  }): Promise<{ page: number; limit: number; region: string; hasMore: boolean; tracks: Track[] }> {
    const queryParams = new URLSearchParams();
    if (params.region) queryParams.set('region', params.region);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.genre) queryParams.set('genre', params.genre);
    if (params.q) queryParams.set('q', params.q);

    try {
      const res = await fetch(`${API_BASE}/tracks/infinite?${queryParams.toString()}`);
      if (!res.ok) {
        return {
          page: params.page || 1,
          limit: params.limit || 20,
          region: params.region || 'cg',
          hasMore: false,
          tracks: []
        };
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return {
          page: params.page || 1,
          limit: params.limit || 20,
          region: params.region || 'cg',
          hasMore: false,
          tracks: []
        };
      }
      return await res.json();
    } catch {
      return {
        page: params.page || 1,
        limit: params.limit || 20,
        region: params.region || 'cg',
        hasMore: false,
        tracks: []
      };
    }
  },

  async search(query: string, genre?: string, region: string = 'cg', page = 1, limit = 40): Promise<SearchResponse> {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (genre) params.set('genre', genre);
    params.set('region', region);
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    const res = await fetch(`${API_BASE}/search?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to perform search');
    return res.json();
  },

  async searchYouTube(query: string, region: string = 'cg', page = 1, limit = 30): Promise<Track[]> {
    const res = await fetch(`${API_BASE}/youtube/search?q=${encodeURIComponent(query)}&region=${encodeURIComponent(region)}&page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to search YouTube');
    return res.json();
  },

  async getYouTubeTrending(region: string = 'cg', page = 1, limit = 30): Promise<Track[]> {
    const res = await fetch(`${API_BASE}/youtube/trending?region=${encodeURIComponent(region)}&page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch trending YouTube tracks');
    return res.json();
  },

  async getPlaystyleMix(params: {
    recentlyPlayed: { title: string; artist: string; genres?: string[] }[];
    favoriteGenres: string[];
    activeRegion: MusicRegion;
    energyPreference?: 'chill' | 'moderate' | 'high_energy';
  }): Promise<{ profile: UserPlaystyleProfile }> {
    const res = await fetch(`${API_BASE}/ai/playstyle-mix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed to generate playstyle mix');
    return res.json();
  },

  async getSearchIntent(query: string): Promise<AISearchIntentResult> {

    const res = await fetch(`${API_BASE}/ai/search-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error('Failed to analyze search intent');
    return res.json();
  },

  // Playback & Rights Gate
  async getPlayToken(trackId: string): Promise<PlaybackTokenResponse> {
    const res = await fetch(`${API_BASE}/tracks/${trackId}/play-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async recordPlayEvent(data: {
    trackId: string;
    sessionId: string;
    positionMs: number;
    completed: boolean;
    durationMs: number;
    source?: string;
  }): Promise<void> {
    try {
      await fetch(`${API_BASE}/events/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch {
      // Non-blocking telemetry
    }
  },

  // Artists & Playlists
  async getArtists(): Promise<Artist[]> {
    const res = await fetch(`${API_BASE}/artists`);
    return res.json();
  },

  async getArtistBySlug(slug: string): Promise<{ artist: Artist; tracks: Track[]; albums: Album[] }> {
    const res = await fetch(`${API_BASE}/artists/${slug}`);
    if (!res.ok) throw new Error('Artist not found');
    return res.json();
  },

  async getPlaylist(id: string): Promise<{ playlist: Playlist; tracks: Track[] }> {
    const res = await fetch(`${API_BASE}/playlists/${id}`);
    if (!res.ok) throw new Error('Playlist not found');
    return res.json();
  },

  // Library & Favorites
  async getLibrary(userId = 'guest-listener-demo'): Promise<{ favorites: Track[]; savedPlaylists: Playlist[] }> {
    const res = await fetch(`${API_BASE}/library`, {
      headers: { 'x-user-id': userId }
    });
    return res.json();
  },

  async toggleFavorite(trackId: string, userId = 'guest-listener-demo'): Promise<{ trackId: string; isFavorite: boolean }> {
    const res = await fetch(`${API_BASE}/library/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ trackId })
    });
    return res.json();
  },

  // Artist Submissions
  async submitTrack(payload: Partial<ArtistSubmission>): Promise<{ success: boolean; submission: ArtistSubmission; message: string }> {
    const res = await fetch(`${API_BASE}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Submission failed');
    }
    return res.json();
  },

  // Admin APIs
  async getAdminOverview(): Promise<AdminOverviewData> {
    const res = await fetch(`${API_BASE}/admin/overview`);
    return res.json();
  },

  async getAdminTracks(): Promise<(Track & { rightsRecord?: RightsRecord })[]> {
    const res = await fetch(`${API_BASE}/admin/tracks`);
    return res.json();
  },

  async createAdminTrack(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create track');
    }
    return res.json();
  },

  async publishTrack(trackId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/tracks/${trackId}/publish`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to publish track');
    }
    return res.json();
  },

  async takedownTrack(trackId: string, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/tracks/${trackId}/takedown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  async getAdminRights(): Promise<(RightsRecord & { trackTitle: string; trackStatus: string })[]> {
    const res = await fetch(`${API_BASE}/admin/rights`);
    return res.json();
  },

  async getAdminSubmissions(): Promise<ArtistSubmission[]> {
    const res = await fetch(`${API_BASE}/admin/submissions`);
    return res.json();
  },

  async reviewSubmission(id: string, status: string, reason?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/submissions/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason })
    });
    return res.json();
  },

  async getAdminTrends(): Promise<{ weights: any; formula: string; snapshots: TrendSnapshot[] }> {
    const res = await fetch(`${API_BASE}/admin/trends`);
    return res.json();
  },

  async setAdminTrendWeights(weights: Partial<TrendFactorBreakdown>): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/trends/weights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weights)
    });
    return res.json();
  },

  async applyEditorBoost(trackId: string, boost: number): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/trends/boost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, boost })
    });
    return res.json();
  },

  async enrichTrackWithAI(draft: { title: string; artistNames: string[]; rawGenre?: string; notes?: string }): Promise<AIEnrichmentResult> {
    const res = await fetch(`${API_BASE}/ai/enrich-track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft)
    });
    if (!res.ok) throw new Error('AI enrichment failed');
    return res.json();
  },

  async getAuditLogs(): Promise<EditorialAction[]> {
    const res = await fetch(`${API_BASE}/admin/audit-logs`);
    return res.json();
  },

  // Authentication API
  async login(email: string, password: string): Promise<{ success: boolean; user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign in. Please verify your credentials.');
    }
    return data;
  },

  async register(displayName: string, email: string, password: string): Promise<{ success: boolean; user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create account.');
    }
    return data;
  }
};
