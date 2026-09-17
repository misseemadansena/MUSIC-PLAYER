/**
 * CG Gaana - Chhattisgarh Trending Music
 * Shared Domain Entities and API Contracts
 */

export type RightsStatus = 
  | 'pending_review' 
  | 'approved' 
  | 'scheduled' 
  | 'published' 
  | 'expired' 
  | 'rejected' 
  | 'takedown';

export type UserRole = 'guest' | 'listener' | 'artist' | 'editor' | 'admin';

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  preferences?: {
    favoriteGenres: string[];
    audioQuality: 'auto' | 'high' | 'saver';
    theme: 'dark' | 'light';
  };
  createdAt: string;
}

export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string;
  photoUrl: string;
  coverUrl?: string;
  region: string; // e.g. "Raipur", "Bilaspur", "Bastar", "Ratanpur"
  genres: string[];
  socialLinks?: {
    instagram?: string;
    youtube?: string; // Official artist channel reference only
    website?: string;
  };
  verificationStatus: 'verified' | 'emerging' | 'pending';
  monthlyListeners: number;
}

export interface Album {
  id: string;
  title: string;
  slug: string;
  artistIds: string[];
  artistNames: string[];
  artworkUrl: string;
  releaseDate: string;
  label: string;
  description: string;
  trackIds: string[];
}

export interface AudioAsset {
  id: string;
  storageKey: string;
  mimeType: string;
  bitrate: number;
  durationMs: number;
  checksum: string;
  rightsStatus: RightsStatus;
  createdAt: string;
}

export interface RightsRecord {
  id: string;
  trackId: string;
  rightsOwner: string;
  permissionBasis: 'Exclusive License' | 'Direct Artist Agreement' | 'Public Domain Folk' | 'Label Master Distribution' | 'Creative Commons BY-SA';
  evidenceRef: string;
  territories: string[]; // e.g. ["IN", "WW"]
  validFrom: string;
  validTo: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface Track {
  id: string;
  title: string;
  slug: string;
  artistIds: string[];
  artistNames: string[];
  albumId?: string;
  albumTitle?: string;
  durationMs: number;
  audioAssetId: string;
  artworkUrl: string;
  genres: string[];
  moods: string[];
  language: 'Chhattisgarhi' | 'Hindi-CG Mix' | 'Halbi' | 'Gondi';
  status: RightsStatus;
  publishedAt: string;
  playCount: number;
  favoriteCount: number;
  externalReference?: ExternalReference;
  lyricsSnippet?: string;
  culturalContext?: string;
  youtubeVideoId?: string;
  source?: 'catalog' | 'youtube';
  views?: string;
  channelTitle?: string;
  region?: MusicRegion;
  trendScore?: number;
}

export interface ExternalReference {
  id: string;
  entityId: string;
  entityType: 'track' | 'artist';
  provider: 'youtube' | 'official_site';
  externalId: string;
  canonicalUrl: string;
  title: string;
  channelTitle?: string;
  fetchedAt: string;
  notice: string; // E.g. "Official external music video reference. Opens in YouTube."
}

export interface Playlist {
  id: string;
  title: string;
  slug: string;
  description: string;
  artworkUrl: string;
  ownerType: 'editorial' | 'user' | 'artist';
  visibility: 'public' | 'private';
  trackIds: string[];
  tags: string[];
  createdAt: string;
}

export interface TrendFactorBreakdown {
  recentPlayVelocity: number; // 0-1 (35% weight)
  completionRate: number;      // 0-1 (20% weight)
  uniqueListeners: number;     // 0-1 (15% weight)
  favoriteRate: number;        // 0-1 (10% weight)
  recency: number;             // 0-1 (10% weight)
  editorBoost: number;         // 0-1 (10% weight)
}

export interface TrendSnapshot {
  id: string;
  trackId: string;
  trackTitle: string;
  artistNames: string[];
  artworkUrl: string;
  windowStart: string;
  windowEnd: string;
  score: number; // 0 - 100
  factorBreakdown: TrendFactorBreakdown;
  rank: number;
  previousRank?: number;
  rankDelta: number; // e.g. +3, -1, 0, new (999)
  explanation: string;
  antiFraudDampened?: boolean;
}

export interface PlayEvent {
  id: string;
  trackId: string;
  sessionId: string;
  userId?: string;
  startedAt: string;
  positionMs: number;
  completed: boolean;
  durationMs: number;
  source: 'home_trending' | 'search' | 'genre_feed' | 'playlist' | 'artist_profile' | 'queue';
  antiFraudFlags?: string[];
}

export interface EditorialAction {
  id: string;
  actorId: string;
  actorName: string;
  entityType: 'track' | 'rights' | 'artist' | 'submission';
  entityId: string;
  action: 'publish' | 'takedown' | 'approve_rights' | 'reject_rights' | 'edit_metadata' | 'feature' | 'editor_boost';
  reason: string;
  createdAt: string;
}

export interface ArtistSubmission {
  id: string;
  artistName: string;
  contactEmail: string;
  title: string;
  genre: string;
  mood: string;
  language: string;
  audioFileName: string;
  rightsOwner: string;
  permissionBasis: string;
  rightsDeclarationAccepted: boolean;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  notes?: string;
}

export interface PlaybackTokenResponse {
  allowed: boolean;
  trackId: string;
  token?: string;
  streamUrl?: string;
  youtubeVideoId?: string;
  isYouTube?: boolean;
  expiresAt?: string;
  rightsStatus: RightsStatus;
  message?: string;
}

export interface AIEnrichmentResult {
  tags: string[];
  normalizedTitle: string;
  normalizedArtists: string[];
  genres: string[];
  moods: string[];
  culturalSummary: string;
  confidence: number;
  needsHumanReview: boolean;
  modelUsed: string;
}

export type MusicRegion = 'cg' | 'bollywood' | 'punjabi' | 'bhojpuri';

export interface MusicRegionConfig {
  id: MusicRegion;
  label: string;
  hindiLabel: string;
  subtitle: string;
  badge: string;
  color: string;
  accentGradient: string;
  searchDefaultQuery: string;
  representativeArtists: string[];
  popularGenres: string[];
}

export interface UserPlaystyleProfile {
  persona: string;
  vibeDescription: string;
  topGenres: string[];
  energyLevel: 'chill' | 'moderate' | 'high_energy';
  favoriteMoods: string[];
  customDjCommentary: string;
  hearingPatternInsight?: string;
  regionalPopularityInsight?: string;
  recommendedTracks: Track[];
  curatedForRegion: MusicRegion;
  generatedAt: string;
  isAiGenerated: boolean;
}

export interface AISearchIntentResult {
  query: string;
  detectedGenre?: string;
  detectedMood?: string;
  detectedRegion?: string;
  isPopularQuery: boolean;
  clarification?: string;
  suggestedTags: string[];
}

