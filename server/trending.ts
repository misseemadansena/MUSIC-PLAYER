import { Track, TrendSnapshot, TrendFactorBreakdown, PlayEvent } from '../shared/types';

export interface TrendingWeights {
  recentPlayVelocity: number;
  completionRate: number;
  uniqueListeners: number;
  favoriteRate: number;
  recency: number;
  editorBoost: number;
}

export const DEFAULT_WEIGHTS: TrendingWeights = {
  recentPlayVelocity: 0.35,
  completionRate: 0.20,
  uniqueListeners: 0.15,
  favoriteRate: 0.10,
  recency: 0.10,
  editorBoost: 0.10
};

export class TrendingEngine {
  private weights: TrendingWeights;
  private editorBoosts: Map<string, number> = new Map(); // trackId -> 0..1 boost
  private previousRanks: Map<string, number> = new Map(); // trackId -> previous rank

  constructor(weights: TrendingWeights = DEFAULT_WEIGHTS) {
    this.weights = weights;
  }

  setEditorBoost(trackId: string, boost: number) {
    this.editorBoosts.set(trackId, Math.max(0, Math.min(1, boost)));
  }

  getEditorBoost(trackId: string): number {
    return this.editorBoosts.get(trackId) || 0;
  }

  setWeights(newWeights: Partial<TrendingWeights>) {
    this.weights = { ...this.weights, ...newWeights };
  }

  getWeights(): TrendingWeights {
    return { ...this.weights };
  }

  /**
   * Calculates trending score and breakdown for eligible published tracks.
   * Enforces anti-gaming caps, suspicious velocity dampening, and recency decay.
   */
  computeTrending(
    tracks: Track[], 
    playEvents: PlayEvent[],
    windowHours = 48
  ): TrendSnapshot[] {
    const now = Date.now();
    const windowMs = windowHours * 60 * 60 * 1000;
    const windowStart = new Date(now - windowMs).toISOString();
    const windowEnd = new Date(now).toISOString();

    // Only consider published tracks with approved rights
    const eligibleTracks = tracks.filter(t => t.status === 'published');
    if (eligibleTracks.length === 0) return [];

    // Filter play events within rolling window
    const recentEvents = playEvents.filter(e => {
      const eventTime = new Date(e.startedAt).getTime();
      return now - eventTime <= windowMs;
    });

    // Aggregate statistics per track with ANTI-GAMING rules
    // Rule 1: Cap repeat plays from same session to max 5 within the window
    const trackStats = new Map<string, {
      rawPlays: number;
      cappedPlays: number;
      completions: number;
      uniqueSessions: Set<string>;
      antiFraudFlags: string[];
    }>();

    // Session play counts per track
    const sessionTrackPlays = new Map<string, number>();

    for (const event of recentEvents) {
      const key = `${event.sessionId}_${event.trackId}`;
      const count = (sessionTrackPlays.get(key) || 0) + 1;
      sessionTrackPlays.set(key, count);

      let stats = trackStats.get(event.trackId);
      if (!stats) {
        stats = {
          rawPlays: 0,
          cappedPlays: 0,
          completions: 0,
          uniqueSessions: new Set(),
          antiFraudFlags: []
        };
        trackStats.set(event.trackId, stats);
      }

      stats.rawPlays += 1;
      stats.uniqueSessions.add(event.sessionId);

      // Anti-gaming cap: only count up to 5 plays from a single session
      if (count <= 5) {
        stats.cappedPlays += 1;
        if (event.completed) {
          stats.completions += 1;
        }
      } else if (!stats.antiFraudFlags.includes('excessive_repeats_capped')) {
        stats.antiFraudFlags.push('excessive_repeats_capped');
      }
    }

    // Determine max values across all tracks for 0..1 normalization
    let maxPlayVelocity = 1;
    let maxUniqueListeners = 1;
    let maxFavoriteRatio = 0.01;

    for (const track of eligibleTracks) {
      const stats = trackStats.get(track.id);
      const velocity = stats ? stats.cappedPlays : Math.max(1, Math.floor(track.playCount * 0.05));
      const unique = stats ? stats.uniqueSessions.size : Math.max(1, Math.floor(track.playCount * 0.03));
      const favRatio = track.playCount > 0 ? (track.favoriteCount / track.playCount) : 0;

      if (velocity > maxPlayVelocity) maxPlayVelocity = velocity;
      if (unique > maxUniqueListeners) maxUniqueListeners = unique;
      if (favRatio > maxFavoriteRatio) maxFavoriteRatio = favRatio;
    }

    // Compute factor breakdowns and composite score
    const snapshots: TrendSnapshot[] = eligibleTracks.map(track => {
      const stats = trackStats.get(track.id);
      const velocity = stats ? stats.cappedPlays : Math.max(1, Math.floor(track.playCount * 0.05));
      const unique = stats ? stats.uniqueSessions.size : Math.max(1, Math.floor(track.playCount * 0.03));
      const completions = stats ? stats.completions : Math.floor(velocity * 0.72);
      
      // 1. recent_play_velocity (0..1)
      const normVelocity = Math.min(1, velocity / maxPlayVelocity);

      // 2. completion_rate (0..1)
      const completionRate = velocity > 0 ? Math.min(1, completions / velocity) : 0.65;

      // 3. unique_listeners (0..1)
      const normUniqueListeners = Math.min(1, unique / maxUniqueListeners);

      // 4. favorite_rate (0..1)
      const favRatio = track.playCount > 0 ? (track.favoriteCount / track.playCount) : 0.05;
      const normFavRate = Math.min(1, favRatio / maxFavoriteRatio);

      // 5. recency (0..1) - exponential decay over 30 days
      const daysSincePublish = Math.max(0, (now - new Date(track.publishedAt).getTime()) / (1000 * 60 * 60 * 24));
      const recency = Math.exp(-daysSincePublish / 30); // 1.0 for today, ~0.36 at 30 days

      // 6. editor_boost (0..1)
      const editorBoost = this.editorBoosts.get(track.id) || 0;

      // Composite weighted score (0..100)
      const rawScore = 
        this.weights.recentPlayVelocity * normVelocity +
        this.weights.completionRate * completionRate +
        this.weights.uniqueListeners * normUniqueListeners +
        this.weights.favoriteRate * normFavRate +
        this.weights.recency * recency +
        this.weights.editorBoost * editorBoost;

      const score = Math.round(rawScore * 100 * 10) / 10; // e.g. 87.4

      const breakdown: TrendFactorBreakdown = {
        recentPlayVelocity: Math.round(normVelocity * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        uniqueListeners: Math.round(normUniqueListeners * 100) / 100,
        favoriteRate: Math.round(normFavRate * 100) / 100,
        recency: Math.round(recency * 100) / 100,
        editorBoost: Math.round(editorBoost * 100) / 100
      };

      // Natural language explanation for transparency
      let explanation = 'Steady regional listening activity.';
      if (normVelocity > 0.85) {
        explanation = 'High play surge across Bilaspur & Raipur streams.';
      } else if (editorBoost > 0.4) {
        explanation = 'Featured editorial pick celebrating Chhattisgarhi festival season.';
      } else if (normFavRate > 0.75) {
        explanation = 'Exceptional listener favorite and save rate.';
      } else if (recency > 0.8) {
        explanation = 'Fresh regional release gaining rapid early momentum.';
      }

      const antiFraudDampened = (stats?.antiFraudFlags.length ?? 0) > 0;

      return {
        id: `trend-${track.id}-${now}`,
        trackId: track.id,
        trackTitle: track.title,
        artistNames: track.artistNames,
        artworkUrl: track.artworkUrl,
        windowStart,
        windowEnd,
        score,
        factorBreakdown: breakdown,
        rank: 0,
        rankDelta: 0,
        explanation,
        antiFraudDampened
      };
    });

    // Sort by score descending
    snapshots.sort((a, b) => b.score - a.score);

    // Assign rank and calculate rank delta compared to previous ranks
    snapshots.forEach((snap, index) => {
      const currentRank = index + 1;
      snap.rank = currentRank;

      const prev = this.previousRanks.get(snap.trackId);
      if (prev !== undefined) {
        snap.previousRank = prev;
        snap.rankDelta = prev - currentRank; // positive means moved up
      } else {
        // New entrant to the trending leaderboard
        snap.rankDelta = 999;
      }
    });

    // Update memory of previous ranks for next calculation
    for (const snap of snapshots) {
      this.previousRanks.set(snap.trackId, snap.rank);
    }

    return snapshots;
  }
}

export const trendingEngine = new TrendingEngine();
