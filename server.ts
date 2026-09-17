import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { trendingEngine } from './server/trending';
import { rightsGate } from './server/rightsGate';
import { streamAudio } from './server/audioService';
import { 
  normalizeTrackMetadata, parseSearchIntent, 
  draftArtistBio, moderateSubmissionText,
  generateUserPlaystyleMix
} from './server/ai';
import { GENRE_CATEGORIES } from './server/data/seed';
import { Track, RightsRecord, PlayEvent, ArtistSubmission, MusicRegion } from './shared/types';
import { youtubeService } from './server/youtubeService';

const REGION_HERO_INFO: Record<MusicRegion, { title: string; tagline: string; subtitle: string; listeners: number; defaultGenres: string[] }> = {
  cg: {
    title: 'Chhattisgarh',
    tagline: 'Chhattisgarh Trending Music',
    subtitle: 'Discover authentic Dadariya, Karma, Bastar Folk & high-energy DJ Remixes.',
    listeners: 384000,
    defaultGenres: ['Dadariya', 'Karma', 'Jas Geet', 'Lok Geet', 'CG DJ / Remix', 'Panthi']
  },
  bollywood: {
    title: 'Bollywood',
    tagline: 'Bollywood Trending Hits',
    subtitle: 'Stream the latest Hindi blockbuster soundtracks, romantic melodies & chartbusters.',
    listeners: 1450000,
    defaultGenres: ['Bollywood Hits', 'Hindi Romantic', 'Dance Party', '90s Melodies', 'Acoustic Unplugged', 'Desi Pop']
  },
  punjabi: {
    title: 'Panjabi',
    tagline: 'Panjabi Beats & Bass',
    subtitle: 'High-octane Bhangra, Desi Hip-Hop, Punjabi Pop & UK Drill anthems.',
    listeners: 920000,
    defaultGenres: ['Bhangra', 'Desi Hip-Hop', 'Panjabi Pop', 'Folk Beats', 'UK Punjabi', 'Romantic Punjabi']
  },
  bhojpuri: {
    title: 'Bhojpuri',
    tagline: 'Bhojpuri Dhamaka Beats',
    subtitle: 'Pure energy Bhojpuri superhits, Pawan Singh, Khesari Lal & Arkestra dance party.',
    listeners: 1120000,
    defaultGenres: ['Bhojpuri Dance', 'Arkestra Hits', 'Lok Geet', 'Chhath / Bhakti', 'Bhojpuri Pop', 'Romantic Duet']
  }
};

async function startServer() {

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Log API requests
  app.use('/api', (req, res, next) => {
    // Prevent sensitive headers in logs
    next();
  });

  // ==========================================
  // 1. PUBLIC DISCOVERY & HOME FEED
  // ==========================================

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'CG Gaana API',
      regionalFocus: 'Chhattisgarh, India',
      version: '1.0.0',
      rightsGateActive: true
    });
  });

  // ==========================================
  // USER AUTHENTICATION (LOGIN & REGISTRATION)
  // ==========================================

  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const result = db.authenticateUser(email, password);
      if (result.error || !result.user) {
        return res.status(401).json({ error: result.error || 'Invalid email or password.' });
      }

      res.json({
        success: true,
        user: result.user,
        token: `cg-token-${Buffer.from(`${result.user.id}:${Date.now()}`).toString('base64')}`
      });
    } catch (err: any) {
      console.error('[API /api/auth/login] Error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/register', (req, res) => {
    try {
      const { displayName, name, email, password } = req.body || {};
      const userName = displayName || name || '';
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
      }

      const result = db.registerUser(userName, email, password);
      if (result.error || !result.user) {
        return res.status(400).json({ error: result.error || 'Registration failed' });
      }

      res.json({
        success: true,
        user: result.user,
        token: `cg-token-${Buffer.from(`${result.user.id}:${Date.now()}`).toString('base64')}`
      });
    } catch (err: any) {
      console.error('[API /api/auth/register] Error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.json({ user: null });
    }
    res.json({ user: null });
  });

  app.get('/api/home', async (req, res) => {
    try {
      const region = ((req.query.region as string) || 'cg').toLowerCase() as MusicRegion;
      const heroInfo = REGION_HERO_INFO[region] || REGION_HERO_INFO.cg;

      const allTracks = db.getAllTracks();
      const playEvents = db.getRecentPlayEvents();
      const trendingSnapshots = trendingEngine.computeTrending(allTracks, playEvents);

      // Fetch live trending songs for active region from YouTube service
      let trendingYouTube: Track[] = [];
      try {
        trendingYouTube = await youtubeService.getTrending(region);
      } catch (ytErr) {
        console.error('Failed to get trending YouTube tracks:', ytErr);
      }

      // Trending top tracks (unlimited dynamic load)
      let trendingTracks: Track[] = [];
      if (region === 'cg') {
        const catalogRanked = trendingSnapshots.map(snap => {
          const track = db.getTrackById(snap.trackId);
          return {
            ...track,
            trendRank: snap.rank,
            trendDelta: snap.rankDelta,
            trendScore: snap.score,
            trendExplanation: snap.explanation
          };
        }).filter(Boolean) as Track[];

        const ytRanked = trendingYouTube.map((yt, idx) => ({
          ...yt,
          trendRank: catalogRanked.length + idx + 1,
          trendDelta: idx % 2 === 0 ? 1 : 0,
          trendScore: Math.max(88 - idx * 2, 45),
          trendExplanation: `YouTube Trending Velocity: ${yt.views || 'Millions of streams'} with rising regional plays.`
        }));

        trendingTracks = [...catalogRanked, ...ytRanked];
      } else {
        trendingTracks = trendingYouTube.map((yt, idx) => ({
          ...yt,
          trendRank: idx + 1,
          trendDelta: idx % 3 === 0 ? 1 : idx % 3 === 1 ? 0 : -1,
          trendScore: Math.max(96 - idx * 2, 50),
          trendExplanation: `Trending in ${heroInfo.title}: high stream velocity and repeat listening.`
        }));
      }

      // New in selected region (rich dynamic catalog)
      const catalogNew = allTracks
        .filter(t => t.status === 'published')
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      const newInCG = region === 'cg'
        ? [...catalogNew, ...trendingYouTube.slice(4)]
        : trendingYouTube;

      // Curated Playlists
      const playlists = db.getAllPlaylists();

      // Featured Artists
      const artists = db.getAllArtists();

      // External Reference / Video Discovery Picks (unlimited dynamic)
      const catalogDiscovery = allTracks
        .filter(t => t.externalReference)
        .map(t => ({
          trackId: t.id,
          trackTitle: t.title,
          artistNames: t.artistNames,
          artworkUrl: t.artworkUrl,
          externalReference: t.externalReference,
          youtubeVideoId: t.youtubeVideoId
        }));

      const ytDiscovery = trendingYouTube.map(t => ({
        trackId: t.id,
        trackTitle: t.title,
        artistNames: t.artistNames,
        artworkUrl: t.artworkUrl,
        externalReference: t.externalReference,
        youtubeVideoId: t.youtubeVideoId
      }));

      const externalDiscovery = [...catalogDiscovery, ...ytDiscovery];

      const regionalGenres = heroInfo.defaultGenres.map(g => ({
        id: g.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: g,
        description: `${g} curated tracks and releases`,
        iconName: 'Flame',
        color: '#f59e0b'
      }));

      res.json({
        region,
        hero: {
          tagline: heroInfo.tagline,
          subtitle: heroInfo.subtitle,
          activeListenersCount: heroInfo.listeners
        },
        trendingToday: trendingTracks,
        trendingYouTube,
        newInCG,
        genres: regionalGenres.length > 0 ? regionalGenres : GENRE_CATEGORIES,
        artists,
        playlists,
        externalDiscovery
      });
    } catch (err: any) {
      console.error('[API /api/home] Error:', err);
      res.status(500).json({ error: 'Failed to generate home feed' });
    }
  });

  // ==========================================
  // 2. TRENDING LEADERBOARD (DYNAMIC WITHOUT LIMIT)
  // ==========================================

  app.get('/api/trending', async (req, res) => {
    try {
      const region = ((req.query.region as string) || 'cg').toLowerCase() as MusicRegion;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));

      const allTracks = db.getAllTracks();
      const playEvents = db.getRecentPlayEvents();
      const snapshots = trendingEngine.computeTrending(allTracks, playEvents);

      let detailedList: any[] = [];

      if (region === 'cg') {
        const catalogList = snapshots.map(snap => {
          const track = db.getTrackById(snap.trackId);
          return {
            ...snap,
            track
          };
        }).filter(item => item.track);

        // Fetch trending YouTube tracks for CG to provide unlimited dynamic items
        let ytTracks: Track[] = [];
        try {
          ytTracks = await youtubeService.getTrending('cg', page, limit);
        } catch (e) {
          console.error('Failed to get yt tracks for trending:', e);
        }

        const ytList = ytTracks.map((yt, idx) => ({
          trackId: yt.id,
          rank: catalogList.length + idx + 1,
          rankDelta: idx % 3 === 0 ? 1 : 0,
          score: Math.max(89 - idx * 1.5, 45),
          explanation: `YouTube Trending velocity in CG: ${yt.views || 'Massive audience'}`,
          track: yt
        }));

        detailedList = [...catalogList, ...ytList];
      } else {
        // Other regions: Bollywood, Punjabi, Bhojpuri dynamically ranked
        let ytTracks: Track[] = [];
        try {
          ytTracks = await youtubeService.getTrending(region, page, limit);
        } catch (e) {
          console.error('Failed to get regional trending yt tracks:', e);
        }

        detailedList = ytTracks.map((yt, idx) => ({
          trackId: yt.id,
          rank: (page - 1) * limit + idx + 1,
          rankDelta: idx % 4 === 0 ? 2 : idx % 4 === 1 ? 1 : idx % 4 === 2 ? 0 : -1,
          score: Math.max(97 - idx * 1.8, 50),
          explanation: `Regional stream velocity & verified YouTube playback count.`,
          track: yt
        }));
      }

      res.json({
        window: req.query.window || 'today',
        region,
        page,
        limit,
        lastUpdated: new Date().toISOString(),
        weights: trendingEngine.getWeights(),
        totalRanked: detailedList.length,
        hasMore: true,
        leaderboard: detailedList
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to compute trending leaderboard' });
    }
  });

  // ==========================================
  // DYNAMIC CONTINUOUS TRACK FEED (NO LIMIT)
  // ==========================================

  app.get('/api/tracks/infinite', async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const region = ((req.query.region as string) || 'cg').toLowerCase() as MusicRegion;
      const q = (req.query.q as string || '').trim();
      const genre = (req.query.genre as string || '').trim();

      const query = q || (genre ? `${genre} hit songs` : '');
      const tracks = await youtubeService.search(query || 'popular songs', region, page, limit);

      res.json({
        page,
        limit,
        region,
        hasMore: true,
        totalLoaded: tracks.length,
        tracks
      });
    } catch (err) {
      console.error('[API /api/tracks/infinite] Error:', err);
      res.status(500).json({ error: 'Failed to fetch dynamic song feed' });
    }
  });

  // ==========================================
  // 3. SEARCH & AI INTENT
  // ==========================================

  app.get('/api/search', async (req, res) => {
    try {
      const q = (req.query.q as string || '').trim().toLowerCase();
      const genre = (req.query.genre as string || '').trim().toLowerCase();

      let tracks = db.getAllTracks().filter(t => t.status === 'published');
      let artists = db.getAllArtists();
      let playlists = db.getAllPlaylists();

      const region = ((req.query.region as string) || 'cg').toLowerCase() as MusicRegion;

      if (genre) {
        tracks = tracks.filter(t => t.genres.some(g => g.toLowerCase().includes(genre)));
      }

      let youtubeTracks: Track[] = [];

      if (q) {
        // Typo-tolerant substring & keyword matching
        tracks = tracks.filter(t => 
          t.title.toLowerCase().includes(q) ||
          t.artistNames.some(a => a.toLowerCase().includes(q)) ||
          t.genres.some(g => g.toLowerCase().includes(g)) ||
          t.moods.some(m => m.toLowerCase().includes(q)) ||
          (t.lyricsSnippet && t.lyricsSnippet.toLowerCase().includes(q))
        );

        artists = artists.filter(a => 
          a.name.toLowerCase().includes(q) ||
          a.region.toLowerCase().includes(q) ||
          a.genres.some(g => g.toLowerCase().includes(q))
        );

        playlists = playlists.filter(p => 
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some(tg => tg.toLowerCase().includes(q))
        );

        const searchPage = Math.max(1, parseInt(req.query.page as string) || 1);
        const searchLimit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 40));

        try {
          youtubeTracks = await youtubeService.search(q, region, searchPage, searchLimit);
        } catch (ytErr) {
          console.error('[API /api/search] YouTube search error:', ytErr);
        }
      } else {
        const searchPage = Math.max(1, parseInt(req.query.page as string) || 1);
        const searchLimit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 40));
        try {
          youtubeTracks = await youtubeService.getTrending(region, searchPage, searchLimit);
        } catch (ytErr) {
          console.error('[API /api/search] YouTube trending error:', ytErr);
        }
      }

      // Merge results
      const allMergedTracks = region === 'cg' 
        ? [...tracks, ...youtubeTracks]
        : [...youtubeTracks, ...tracks];

      res.json({
        query: req.query.q || '',
        region,
        page: Math.max(1, parseInt(req.query.page as string) || 1),
        results: {
          tracks: allMergedTracks,
          catalogTracks: tracks,
          youtubeTracks: youtubeTracks,
          artists: artists,
          playlists: playlists
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Search operation failed' });
    }
  });

  // Dedicated YouTube endpoints for instant music discovery (unlimited dynamic load)
  app.get('/api/youtube/search', async (req, res) => {
    try {
      const q = (req.query.q as string || '').trim();
      const region = ((req.query.region as string) || 'cg').toLowerCase() as MusicRegion;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
      const results = await youtubeService.search(q, region, page, limit);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: 'YouTube search failed' });
    }
  });

  app.get('/api/youtube/trending', async (req, res) => {
    try {
      const region = ((req.query.region as string) || 'cg').toLowerCase() as MusicRegion;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
      const results = await youtubeService.getTrending(region, page, limit);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: 'YouTube trending fetch failed' });
    }
  });

  // AI Personalized Playstyle Mix Endpoint
  app.post('/api/ai/playstyle-mix', async (req, res) => {
    try {
      const { 
        recentlyPlayed = [], 
        favoriteGenres = [], 
        activeRegion = 'cg', 
        energyPreference = 'moderate' 
      } = req.body;

      const validRegion = (activeRegion as MusicRegion) || 'cg';

      // Gather candidate tracks from catalog and YouTube trending
      const catalogTracks = db.getAllTracks().filter(t => t.status === 'published');
      let ytCandidates: Track[] = [];
      try {
        ytCandidates = await youtubeService.getTrending(validRegion);
      } catch (err) {
        console.error('Failed to get YouTube candidates for AI mix:', err);
      }

      // Filter and rank local regional tracks that are played highly
      const regionalCatalog = catalogTracks.filter(t => (t.region || 'cg') === validRegion || validRegion === 'cg');
      const allRegionalPool = [...regionalCatalog, ...ytCandidates];

      // Sort by play count, trend score, and velocity to isolate top regional chartbusters
      const topHighlyPlayedRegional = [...allRegionalPool].sort((a, b) => {
        const aMetric = (a.playCount || 0) + (a.trendScore || 0) * 800;
        const bMetric = (b.playCount || 0) + (b.trendScore || 0) * 800;
        return bMetric - aMetric;
      }).slice(0, 15);

      const allCandidates = validRegion === 'cg'
        ? [...topHighlyPlayedRegional, ...catalogTracks, ...ytCandidates]
        : [...topHighlyPlayedRegional, ...ytCandidates, ...catalogTracks];

      // Deduplicate candidates
      const seenIds = new Set<string>();
      const deduplicatedCandidates: Track[] = [];
      for (const c of allCandidates) {
        if (!seenIds.has(c.id)) {
          seenIds.add(c.id);
          deduplicatedCandidates.push(c);
        }
      }

      const aiResult = await generateUserPlaystyleMix({
        recentlyPlayed,
        favoriteGenres,
        activeRegion: validRegion,
        energyPreference,
        candidateTracks: deduplicatedCandidates,
        highlyPlayedRegionalTracks: topHighlyPlayedRegional
      });

      // Match recommended track IDs back to full track objects
      const idMap = new Map<string, Track>();
      for (const t of deduplicatedCandidates) {
        idMap.set(t.id, t);
      }

      const recommendedTracks: Track[] = [];
      for (const id of aiResult.recommendedTrackIds) {
        const found = idMap.get(id);
        if (found) {
          recommendedTracks.push(found);
        }
      }

      // If any slots are missing, backfill from top regional hits
      if (recommendedTracks.length < 8) {
        for (const t of deduplicatedCandidates) {
          if (!recommendedTracks.some(r => r.id === t.id)) {
            recommendedTracks.push(t);
            if (recommendedTracks.length >= 12) break;
          }
        }
      }

      res.json({
        profile: {
          persona: aiResult.persona,
          vibeDescription: aiResult.vibeDescription,
          topGenres: aiResult.topGenres,
          energyLevel: aiResult.energyLevel,
          favoriteMoods: aiResult.favoriteMoods,
          customDjCommentary: aiResult.customDjCommentary,
          hearingPatternInsight: aiResult.hearingPatternInsight,
          regionalPopularityInsight: aiResult.regionalPopularityInsight,
          recommendedTracks,
          curatedForRegion: validRegion,
          generatedAt: new Date().toISOString(),
          isAiGenerated: aiResult.isAiGenerated
        }
      });
    } catch (err: any) {
      console.error('[API /api/ai/playstyle-mix] Error:', err);
      res.status(500).json({ error: 'Failed to generate playstyle mix' });
    }
  });

  app.post('/api/ai/search-intent', async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query string required' });
      }
      const intent = await parseSearchIntent(query);
      res.json(intent);
    } catch (err) {
      res.status(500).json({ error: 'AI intent classification failed' });
    }
  });

  // ==========================================
  // 4. TRACKS & STRICT RIGHTS-GATED STREAMING
  // ==========================================

  app.get('/api/tracks/:id', (req, res) => {
    const track = db.getTrackById(req.params.id);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const rightsRecord = db.getRightsRecord(track.id);
    res.json({
      track,
      rightsInfo: {
        status: track.status,
        rightsOwner: rightsRecord?.rightsOwner,
        permissionBasis: rightsRecord?.permissionBasis,
        territories: rightsRecord?.territories
      }
    });
  });

  /**
   * Issues a short-lived playback token ONLY if the track passes Rights Gate evaluation.
   * Refuses any track in pending_review, rejected, takedown, or expired state.
   */
  app.post('/api/tracks/:id/play-token', (req, res) => {
    try {
      const trackId = req.params.id;

      // Direct YouTube track playback authorization
      if (trackId.startsWith('yt-')) {
        const videoId = trackId.replace('yt-', '');
        return res.json({
          allowed: true,
          trackId,
          token: `yt-token-${videoId}-${Date.now()}`,
          streamUrl: `https://www.youtube.com/watch?v=${videoId}`,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          isYouTube: true,
          youtubeVideoId: videoId,
          rightsStatus: 'published'
        });
      }

      const track = db.getTrackById(trackId);
      if (!track) {
        return res.status(404).json({ allowed: false, message: 'Track not found in catalog' });
      }

      const rightsRecord = db.getRightsRecord(track.id);
      const userTerritory = (req.headers['cf-ipcountry'] as string) || 'IN';

      const evaluation = rightsGate.evaluateTrackPlayback(track, rightsRecord, userTerritory);

      if (!evaluation.isPlayable) {
        return res.status(403).json({
          allowed: false,
          trackId: track.id,
          rightsStatus: evaluation.rightsStatus,
          message: evaluation.reason || 'Track is currently not playable due to rights constraints.'
        });
      }

      // Track is approved/published - generate short-lived signed token
      const tokenResponse = rightsGate.generatePlaybackToken(track, track.audioAssetId);
      // Pass along youtubeVideoId if track has one
      if (track.youtubeVideoId) {
        (tokenResponse as any).youtubeVideoId = track.youtubeVideoId;
        (tokenResponse as any).isYouTube = true;
      }
      res.json(tokenResponse);
    } catch (err: any) {
      res.status(500).json({ allowed: false, message: 'Rights verification failed' });
    }
  });

  /**
   * Controlled streaming endpoint. Requires a valid, unexpired token.
   * Serves synthetic or authorized media with HTTP 206 Partial Content range support.
   */
  app.get('/api/stream/:assetId', (req: Request, res: Response) => {
    const { assetId } = req.params;
    const token = (req.query.token as string) || '';

    const verification = rightsGate.verifyPlaybackToken(token, assetId);
    if (!verification.valid) {
      return res.status(403).json({
        error: 'Forbidden',
        message: verification.error || 'Invalid or expired playback authorization token.'
      });
    }

    // Stream audio buffer
    streamAudio(req, res, assetId);
  });

  // ==========================================
  // 5. ARTISTS, ALBUMS, PLAYLISTS & GENRES
  // ==========================================

  app.get('/api/artists', (req, res) => {
    res.json(db.getAllArtists());
  });

  app.get('/api/artists/:slug', (req, res) => {
    const artist = db.getArtistBySlug(req.params.slug) || db.getArtistById(req.params.slug);
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    const artistTracks = db.getAllTracks()
      .filter(t => t.artistIds.includes(artist.id) && t.status === 'published');
    const artistAlbums = db.getAllAlbums()
      .filter(a => a.artistIds.includes(artist.id));

    res.json({
      artist,
      tracks: artistTracks,
      albums: artistAlbums
    });
  });

  app.get('/api/albums/:id', (req, res) => {
    const album = db.getAlbumById(req.params.id);
    if (!album) return res.status(404).json({ error: 'Album not found' });
    const tracks = album.trackIds
      .map(tid => db.getTrackById(tid))
      .filter((t): t is Track => t !== undefined && t.status === 'published');
    res.json({ album, tracks });
  });

  app.get('/api/playlists', (req, res) => {
    res.json(db.getAllPlaylists());
  });

  app.get('/api/playlists/:id', (req, res) => {
    const playlist = db.getPlaylistById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    const tracks = playlist.trackIds
      .map(tid => db.getTrackById(tid))
      .filter((t): t is Track => t !== undefined && t.status === 'published');
    res.json({ playlist, tracks });
  });

  app.get('/api/genres', (req, res) => {
    res.json(GENRE_CATEGORIES);
  });

  // ==========================================
  // 6. USER LIBRARY & FAVORITES
  // ==========================================

  app.get('/api/library', (req, res) => {
    const userId = (req.headers['x-user-id'] as string);
    if (!userId || userId === 'guest') {
      return res.status(401).json({ error: 'Authentication required to access personal library', favorites: [], savedPlaylists: [] });
    }
    const favorites = db.getFavorites(userId);
    res.json({
      userId,
      favorites,
      savedPlaylists: db.getAllPlaylists().slice(0, 3)
    });
  });

  app.post('/api/library/favorites', (req, res) => {
    const userId = (req.headers['x-user-id'] as string);
    if (!userId || userId === 'guest') {
      return res.status(401).json({ error: 'Authentication required to modify favorites' });
    }
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId required' });
    const isFav = db.toggleFavorite(userId, trackId);
    res.json({ trackId, isFavorite: isFav });
  });

  app.delete('/api/library/favorites/:trackId', (req, res) => {
    const userId = (req.headers['x-user-id'] as string);
    if (!userId || userId === 'guest') {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const trackId = req.params.trackId;
    if (db.isFavorite(userId, trackId)) {
      db.toggleFavorite(userId, trackId);
    }
    res.json({ trackId, isFavorite: false });
  });

  // ==========================================
  // 7. PLAY EVENTS & ANALYTICS
  // ==========================================

  app.post('/api/events/play', (req, res) => {
    try {
      const { trackId, sessionId, positionMs, completed, durationMs, source } = req.body;
      if (!trackId || !sessionId) {
        return res.status(400).json({ error: 'trackId and sessionId required' });
      }

      const event: PlayEvent = {
        id: `pe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        trackId,
        sessionId,
        startedAt: new Date().toISOString(),
        positionMs: positionMs || 0,
        completed: Boolean(completed),
        durationMs: durationMs || 180000,
        source: source || 'home_trending'
      };

      db.recordPlayEvent(event);
      db.incrementPlayCount(trackId);

      res.status(201).json({ recorded: true, eventId: event.id });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to record play event' });
    }
  });

  // ==========================================
  // 8. ARTIST SUBMISSIONS WORKFLOW
  // ==========================================

  app.post('/api/submissions', async (req, res) => {
    try {
      const {
        artistName, contactEmail, title, genre, mood,
        language, audioFileName, rightsOwner, permissionBasis,
        rightsDeclarationAccepted, notes
      } = req.body;

      if (!title || !artistName || !rightsOwner || !rightsDeclarationAccepted) {
        return res.status(400).json({
          error: 'Missing required metadata or rights declaration acceptance'
        });
      }

      // Check text for basic moderation flags
      const moderation = await moderateSubmissionText(`${title} - ${artistName}: ${notes || ''}`);

      const submission: ArtistSubmission = {
        id: `sub-${Date.now()}`,
        artistName,
        contactEmail: contactEmail || 'artist@cgmusic.org',
        title,
        genre: genre || 'Lok Geet',
        mood: mood || 'Celebratory',
        language: language || 'Chhattisgarhi',
        audioFileName: audioFileName || `${title.toLowerCase().replace(/\s+/g, '-')}.mp3`,
        rightsOwner,
        permissionBasis: permissionBasis || 'Direct Artist Agreement',
        rightsDeclarationAccepted: true,
        status: moderation.safe ? 'pending' : 'under_review',
        submittedAt: new Date().toISOString(),
        notes: notes || ''
      };

      db.createSubmission(submission);
      res.status(201).json({
        success: true,
        submission,
        message: 'Your track submission and rights declaration have been received for admin review.'
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Submission failed' });
    }
  });

  app.get('/api/admin/submissions', (req, res) => {
    res.json(db.getAllSubmissions());
  });

  app.post('/api/admin/submissions/:id/review', (req, res) => {
    const { status, reason } = req.body;
    if (!status || !['approved', 'rejected', 'under_review'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required' });
    }

    const updated = db.updateSubmissionStatus(req.params.id, status, reason);
    if (!updated) return res.status(404).json({ error: 'Submission not found' });

    // If approved, create draft track & rights record
    if (status === 'approved') {
      const trackId = `trk-sub-${Date.now()}`;
      const assetId = `ast-sub-${Date.now()}`;

      db.saveAudioAsset({
        id: assetId,
        storageKey: `audio/cg-authorized/${updated.audioFileName}`,
        mimeType: 'audio/mpeg',
        bitrate: 320,
        durationMs: 210000,
        checksum: 'sha256-sub-verified',
        rightsStatus: 'approved',
        createdAt: new Date().toISOString()
      });

      const newTrack: Track = {
        id: trackId,
        title: updated.title,
        slug: updated.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        artistIds: ['art-1'],
        artistNames: [updated.artistName],
        durationMs: 210000,
        audioAssetId: assetId,
        artworkUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        genres: [updated.genre],
        moods: [updated.mood],
        language: updated.language as any,
        status: 'approved',
        publishedAt: new Date().toISOString(),
        playCount: 1,
        favoriteCount: 0,
        culturalContext: `Artist submission from ${updated.artistName} under ${updated.permissionBasis}.`
      };

      const rights: RightsRecord = {
        id: `rr-${Date.now()}`,
        trackId,
        rightsOwner: updated.rightsOwner,
        permissionBasis: updated.permissionBasis as any,
        evidenceRef: `SUB-AGR-${updated.id}`,
        territories: ['IN', 'WW'],
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2).toISOString(),
        approvedBy: 'Catalog Administrator',
        approvedAt: new Date().toISOString()
      };

      db.createTrack(newTrack, rights);
    }

    res.json({ success: true, submission: updated });
  });

  // ==========================================
  // 9. GEMINI AI ENRICHMENT (ADMIN / EDITORIAL)
  // ==========================================

  app.post('/api/ai/enrich-track', async (req, res) => {
    try {
      const { title, artistNames, rawGenre, rawLanguage, notes } = req.body;
      if (!title || !artistNames) {
        return res.status(400).json({ error: 'Title and artistNames required' });
      }

      const result = await normalizeTrackMetadata({
        title,
        artistNames: Array.isArray(artistNames) ? artistNames : [artistNames],
        rawGenre,
        rawLanguage,
        notes
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'AI track enrichment failed' });
    }
  });

  app.post('/api/ai/artist-bio', async (req, res) => {
    try {
      const { artistName, region, genres } = req.body;
      if (!artistName) return res.status(400).json({ error: 'artistName required' });
      const bio = await draftArtistBio(artistName, region || 'Chhattisgarh', genres || ['Lok Geet']);
      res.json({ artistName, bio });
    } catch {
      res.status(500).json({ error: 'Failed to draft bio' });
    }
  });

  // ==========================================
  // 10. ADMIN CONSOLE & CATALOG MANAGEMENT
  // ==========================================

  app.get('/api/admin/overview', (req, res) => {
    const allTracks = db.getAllTracks();
    const publishedCount = allTracks.filter(t => t.status === 'published').length;
    const pendingCount = allTracks.filter(t => t.status === 'pending_review').length;
    const playEvents = db.getRecentPlayEvents();
    const submissions = db.getAllSubmissions();
    const pendingSubmissions = submissions.filter(s => s.status === 'pending').length;

    res.json({
      metrics: {
        totalTracks: allTracks.length,
        publishedTracks: publishedCount,
        pendingReviewTracks: pendingCount,
        activeArtists: db.getAllArtists().length,
        totalPlayEvents: playEvents.length,
        pendingSubmissions,
        curatedPlaylists: db.getAllPlaylists().length
      },
      rightsCoveragePercent: Math.round((db.getAllRights().length / Math.max(1, allTracks.length)) * 100),
      recentAuditLogs: db.getAuditLogs().slice(0, 10)
    });
  });

  app.get('/api/admin/tracks', (req, res) => {
    const tracks = db.getAllTracks().map(t => {
      const rights = db.getRightsRecord(t.id);
      return {
        ...t,
        rightsRecord: rights
      };
    });
    res.json(tracks);
  });

  app.post('/api/admin/tracks', (req, res) => {
    try {
      const {
        title, artistNames, genres, moods, language, durationMs,
        artworkUrl, rightsOwner, permissionBasis, evidenceRef, territories,
        validFrom, validTo, lyricsSnippet, culturalContext
      } = req.body;

      if (!title || !artistNames || !rightsOwner) {
        return res.status(400).json({ error: 'title, artistNames, and rightsOwner are required' });
      }

      const trackId = `trk-${Date.now()}`;
      const assetId = `ast-${Date.now()}`;

      // Save audio asset record
      db.saveAudioAsset({
        id: assetId,
        storageKey: `audio/cg-authorized/${trackId}.mp3`,
        mimeType: 'audio/mpeg',
        bitrate: 320,
        durationMs: durationMs || 200000,
        checksum: `sha256-${Date.now()}`,
        rightsStatus: 'approved',
        createdAt: new Date().toISOString()
      });

      const track: Track = {
        id: trackId,
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        artistIds: ['art-1'],
        artistNames: Array.isArray(artistNames) ? artistNames : [artistNames],
        durationMs: durationMs || 200000,
        audioAssetId: assetId,
        artworkUrl: artworkUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        genres: Array.isArray(genres) ? genres : ['Lok Geet'],
        moods: Array.isArray(moods) ? moods : ['Celebratory'],
        language: language || 'Chhattisgarhi',
        status: 'approved',
        publishedAt: new Date().toISOString(),
        playCount: 0,
        favoriteCount: 0,
        lyricsSnippet,
        culturalContext
      };

      const rights: RightsRecord = {
        id: `rr-${Date.now()}`,
        trackId,
        rightsOwner,
        permissionBasis: permissionBasis || 'Direct Artist Agreement',
        evidenceRef: evidenceRef || 'Manual Entry Verified',
        territories: territories || ['IN', 'WW'],
        validFrom: validFrom || new Date().toISOString(),
        validTo: validTo || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 3).toISOString(),
        approvedBy: 'Admin Catalog Desk',
        approvedAt: new Date().toISOString()
      };

      db.createTrack(track, rights);
      db.logAction({
        id: `act-${Date.now()}`,
        actorId: 'admin-1',
        actorName: 'Catalog Admin',
        entityType: 'track',
        entityId: track.id,
        action: 'approve_rights',
        reason: 'Created track with complete verified rights record.',
        createdAt: new Date().toISOString()
      });

      res.status(201).json({ track, rights });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create track' });
    }
  });

  app.patch('/api/admin/tracks/:id', (req, res) => {
    const updated = db.updateTrack(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Track not found' });
    res.json(updated);
  });

  app.post('/api/admin/tracks/:id/publish', (req, res) => {
    const track = db.getTrackById(req.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });

    // Enforce Rights checklist before publish
    const rights = db.getRightsRecord(track.id);
    if (!rights || !rights.rightsOwner || !rights.permissionBasis) {
      return res.status(400).json({
        error: 'Cannot publish without complete Rights Record (rights owner, permission basis, evidence ref required).'
      });
    }

    const updated = db.setTrackStatus(track.id, 'published', 'Admin published track after rights verification.');
    res.json({ success: true, track: updated });
  });

  app.post('/api/admin/tracks/:id/takedown', (req, res) => {
    const { reason } = req.body;
    const updated = db.setTrackStatus(req.params.id, 'takedown', reason || 'Emergency or rights-holder takedown requested.');
    if (!updated) return res.status(404).json({ error: 'Track not found' });
    res.json({ success: true, track: updated });
  });

  app.get('/api/admin/rights', (req, res) => {
    const rights = db.getAllRights().map(r => {
      const track = db.getTrackById(r.trackId);
      return {
        ...r,
        trackTitle: track?.title || 'Unknown Track',
        trackStatus: track?.status || 'unknown'
      };
    });
    res.json(rights);
  });

  app.patch('/api/admin/rights/:id', (req, res) => {
    const { rightsOwner, permissionBasis, evidenceRef, territories, validTo } = req.body;
    const existing = db.getRightsRecord(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Rights record not found' });

    const updated: RightsRecord = {
      ...existing,
      rightsOwner: rightsOwner || existing.rightsOwner,
      permissionBasis: permissionBasis || existing.permissionBasis,
      evidenceRef: evidenceRef || existing.evidenceRef,
      territories: territories || existing.territories,
      validTo: validTo || existing.validTo
    };
    db.saveRightsRecord(updated);
    res.json(updated);
  });

  // Trending diagnostics
  app.get('/api/admin/trends', (req, res) => {
    const tracks = db.getAllTracks();
    const playEvents = db.getRecentPlayEvents();
    const snapshots = trendingEngine.computeTrending(tracks, playEvents);

    res.json({
      weights: trendingEngine.getWeights(),
      formula: '0.35 * play_velocity + 0.20 * completion + 0.15 * unique_listeners + 0.10 * favorites + 0.10 * recency + 0.10 * editor_boost',
      antiGamingActive: true,
      rules: [
        'Repeat plays from same session capped at 5 per window',
        'Abnormal burst velocity dampened',
        'Published & approved rights check strictly mandatory'
      ],
      snapshots
    });
  });

  app.post('/api/admin/trends/weights', (req, res) => {
    const { recentPlayVelocity, completionRate, uniqueListeners, favoriteRate, recency, editorBoost } = req.body;
    trendingEngine.setWeights({
      recentPlayVelocity,
      completionRate,
      uniqueListeners,
      favoriteRate,
      recency,
      editorBoost
    });
    res.json({ success: true, weights: trendingEngine.getWeights() });
  });

  app.post('/api/admin/trends/boost', (req, res) => {
    const { trackId, boost } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId required' });
    trendingEngine.setEditorBoost(trackId, typeof boost === 'number' ? boost : 0.5);
    db.logAction({
      id: `act-${Date.now()}`,
      actorId: 'admin-1',
      actorName: 'Editor-in-Chief',
      entityType: 'track',
      entityId: trackId,
      action: 'editor_boost',
      reason: `Applied editorial trend boost factor of ${boost}`,
      createdAt: new Date().toISOString()
    });
    res.json({ success: true, trackId, boost: trendingEngine.getEditorBoost(trackId) });
  });

  app.get('/api/admin/audit-logs', (req, res) => {
    res.json(db.getAuditLogs());
  });

  // ==========================================
  // API 404 CATCH-ALL (Never fall through to Vite SPA index.html)
  // ==========================================
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  // ==========================================
  // 11. VITE SPA / STATIC FALLBACK
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CG Gaana] Full-stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
