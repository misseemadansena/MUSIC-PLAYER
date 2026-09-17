import { 
  Track, Artist, Album, AudioAsset, RightsRecord, Playlist, 
  PlayEvent, EditorialAction, ArtistSubmission, RightsStatus,
  User, UserRole
} from '../shared/types';
import { 
  SEED_TRACKS, SEED_ARTISTS, SEED_ALBUMS, 
  SEED_AUDIO_ASSETS, SEED_RIGHTS, SEED_PLAYLISTS 
} from './data/seed';

export interface StoredUser {
  id: string;
  displayName: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: string;
}

export class Database {
  private tracks: Map<string, Track> = new Map();
  private artists: Map<string, Artist> = new Map();
  private albums: Map<string, Album> = new Map();
  private audioAssets: Map<string, AudioAsset> = new Map();
  private rightsRecords: Map<string, RightsRecord> = new Map();
  private playlists: Map<string, Playlist> = new Map();
  private playEvents: PlayEvent[] = [];
  private editorialActions: EditorialAction[] = [];
  private submissions: ArtistSubmission[] = [];
  private userFavorites: Map<string, Set<string>> = new Map(); // userId/sessionId -> Set<trackId>
  private users: Map<string, StoredUser> = new Map(); // normalized email -> StoredUser

  constructor() {
    this.seed();
    this.seedUsers();
  }

  private seedUsers() {
    // Pre-seed Admin User requested:
    // Email: bantydansena@gmail.com
    // Password: Priyanka@09
    const adminUser: StoredUser = {
      id: 'usr-admin-banty',
      displayName: 'Banty Dansena',
      email: 'bantydansena@gmail.com',
      password: 'Priyanka@09',
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    this.users.set('bantydansena@gmail.com'.toLowerCase(), adminUser);
  }

  private seed() {
    SEED_TRACKS.forEach(t => this.tracks.set(t.id, { ...t }));
    SEED_ARTISTS.forEach(a => this.artists.set(a.id, { ...a }));
    SEED_ALBUMS.forEach(alb => this.albums.set(alb.id, { ...alb }));
    SEED_AUDIO_ASSETS.forEach(ast => this.audioAssets.set(ast.id, { ...ast }));
    SEED_RIGHTS.forEach(r => this.rightsRecords.set(r.trackId, { ...r }));
    SEED_PLAYLISTS.forEach(p => this.playlists.set(p.id, { ...p }));

    // Seed initial editorial action
    this.editorialActions.push({
      id: 'ea-init-1',
      actorId: 'admin-system',
      actorName: 'Chief Catalog Administrator',
      entityType: 'track',
      entityId: 'trk-1',
      action: 'publish',
      reason: 'Verified direct artist agreement and audio asset validation.',
      createdAt: new Date().toISOString()
    });

    // Seed initial submissions demo
    this.submissions.push({
      id: 'sub-demo-1',
      artistName: 'Sukhdev Yadav & Troupe',
      contactEmail: 'sukhdev.folk@cgmusic.org',
      title: 'Bastar Karma Dholak Rhythm',
      genre: 'Karma',
      mood: 'Celebratory',
      language: 'Chhattisgarhi',
      audioFileName: 'sukhdev_karma_master_2026.wav',
      rightsOwner: 'Sukhdev Yadav Independent',
      permissionBasis: 'Direct Artist Agreement',
      rightsDeclarationAccepted: true,
      status: 'pending',
      submittedAt: new Date(Date.now() - 3600 * 1000 * 14).toISOString(),
      notes: 'Recorded live during Bastar Dussehra festival rehearsals.'
    });
  }

  // --- Tracks ---
  getAllTracks(): Track[] {
    return Array.from(this.tracks.values());
  }

  getTrackById(id: string): Track | undefined {
    if (this.tracks.has(id)) {
      return this.tracks.get(id);
    }
    if (id.startsWith('yt-')) {
      const videoId = id.replace('yt-', '');
      const ytTrack: Track = {
        id,
        title: 'Chhattisgarhi YouTube Track',
        slug: id,
        artistIds: ['art-yt'],
        artistNames: ['YouTube CG Artist'],
        durationMs: 240000,
        audioAssetId: `ast-${id}`,
        artworkUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        genres: ['Chhattisgarhi', 'YouTube Hits'],
        moods: ['Celebratory'],
        language: 'Chhattisgarhi',
        status: 'published',
        publishedAt: new Date().toISOString(),
        playCount: 100000,
        favoriteCount: 5000,
        youtubeVideoId: videoId,
        source: 'youtube',
        externalReference: {
          id: `ext-${id}`,
          entityId: id,
          entityType: 'track',
          provider: 'youtube',
          externalId: videoId,
          canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
          title: 'YouTube Track',
          channelTitle: 'YouTube',
          fetchedAt: new Date().toISOString(),
          notice: 'Official YouTube track'
        }
      };
      this.tracks.set(id, ytTrack);
      return ytTrack;
    }
    return undefined;
  }

  getTrackBySlug(slug: string): Track | undefined {
    return Array.from(this.tracks.values()).find(t => t.slug === slug);
  }

  createTrack(track: Track, rights?: RightsRecord): Track {
    this.tracks.set(track.id, track);
    if (rights) {
      this.rightsRecords.set(track.id, rights);
    }
    return track;
  }

  updateTrack(id: string, updates: Partial<Track>): Track | undefined {
    const track = this.tracks.get(id);
    if (!track) return undefined;
    const updated = { ...track, ...updates };
    this.tracks.set(id, updated);
    return updated;
  }

  setTrackStatus(id: string, status: RightsStatus, reason: string, actorName = 'Admin'): Track | undefined {
    const track = this.tracks.get(id);
    if (!track) return undefined;
    track.status = status;
    this.tracks.set(id, track);

    // Record editorial action
    this.logAction({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      actorId: 'admin-user',
      actorName,
      entityType: 'track',
      entityId: id,
      action: status === 'published' ? 'publish' : status === 'takedown' ? 'takedown' : 'edit_metadata',
      reason,
      createdAt: new Date().toISOString()
    });

    return track;
  }

  incrementPlayCount(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.playCount += 1;
      this.tracks.set(trackId, track);
    }
  }

  // --- Artists ---
  getAllArtists(): Artist[] {
    return Array.from(this.artists.values());
  }

  getArtistById(id: string): Artist | undefined {
    return this.artists.get(id);
  }

  getArtistBySlug(slug: string): Artist | undefined {
    return Array.from(this.artists.values()).find(a => a.slug === slug);
  }

  createArtist(artist: Artist): Artist {
    this.artists.set(artist.id, artist);
    return artist;
  }

  // --- Albums ---
  getAllAlbums(): Album[] {
    return Array.from(this.albums.values());
  }

  getAlbumById(id: string): Album | undefined {
    return this.albums.get(id);
  }

  // --- Playlists ---
  getAllPlaylists(): Playlist[] {
    return Array.from(this.playlists.values());
  }

  getPlaylistById(id: string): Playlist | undefined {
    return this.playlists.get(id);
  }

  // --- Rights & Assets ---
  getRightsRecord(trackId: string): RightsRecord | undefined {
    return this.rightsRecords.get(trackId);
  }

  getAllRights(): RightsRecord[] {
    return Array.from(this.rightsRecords.values());
  }

  saveRightsRecord(rights: RightsRecord): void {
    this.rightsRecords.set(rights.trackId, rights);
  }

  getAudioAsset(id: string): AudioAsset | undefined {
    return this.audioAssets.get(id);
  }

  saveAudioAsset(asset: AudioAsset): void {
    this.audioAssets.set(asset.id, asset);
  }

  // --- Play Events & Analytics ---
  recordPlayEvent(event: PlayEvent): void {
    this.playEvents.push(event);
    if (this.playEvents.length > 5000) {
      this.playEvents.splice(0, 1000); // trim rolling buffer
    }
  }

  getRecentPlayEvents(): PlayEvent[] {
    return [...this.playEvents];
  }

  // --- Favorites ---
  toggleFavorite(userId: string, trackId: string): boolean {
    let favs = this.userFavorites.get(userId);
    if (!favs) {
      favs = new Set();
      this.userFavorites.set(userId, favs);
    }
    const track = this.tracks.get(trackId);
    if (favs.has(trackId)) {
      favs.delete(trackId);
      if (track && track.favoriteCount > 0) track.favoriteCount -= 1;
      return false; // removed
    } else {
      favs.add(trackId);
      if (track) track.favoriteCount += 1;
      return true; // added
    }
  }

  getFavorites(userId: string): Track[] {
    const favs = this.userFavorites.get(userId);
    if (!favs) return [];
    return Array.from(favs)
      .map(id => this.tracks.get(id))
      .filter((t): t is Track => t !== undefined && t.status === 'published');
  }

  isFavorite(userId: string, trackId: string): boolean {
    return this.userFavorites.get(userId)?.has(trackId) ?? false;
  }

  // --- Submissions ---
  getAllSubmissions(): ArtistSubmission[] {
    return [...this.submissions];
  }

  createSubmission(sub: ArtistSubmission): ArtistSubmission {
    this.submissions.unshift(sub);
    return sub;
  }

  updateSubmissionStatus(id: string, status: ArtistSubmission['status'], rejectionReason?: string): ArtistSubmission | undefined {
    const sub = this.submissions.find(s => s.id === id);
    if (!sub) return undefined;
    sub.status = status;
    if (rejectionReason) sub.rejectionReason = rejectionReason;
    return sub;
  }

  // --- Audit Log ---
  logAction(action: EditorialAction): void {
    this.editorialActions.unshift(action);
    if (this.editorialActions.length > 500) {
      this.editorialActions.pop();
    }
  }

  getAuditLogs(): EditorialAction[] {
    return [...this.editorialActions];
  }

  // --- Users & Authentication ---
  getUserByEmail(email: string): StoredUser | undefined {
    return this.users.get(email.trim().toLowerCase());
  }

  getUserById(id: string): StoredUser | undefined {
    return Array.from(this.users.values()).find(u => u.id === id);
  }

  registerUser(displayName: string, email: string, password: string): { user?: User; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { error: 'Email and password are required.' };
    }

    if (this.users.has(cleanEmail)) {
      return { error: 'An account with this email already exists. Please sign in.' };
    }

    // Determine role: if bantydansena@gmail.com, grant admin, otherwise listener
    const isAdminEmail = cleanEmail === 'bantydansena@gmail.com';
    const role: UserRole = isAdminEmail ? 'admin' : 'listener';

    const newUser: StoredUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      displayName: displayName.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      password: password,
      role: role,
      createdAt: new Date().toISOString()
    };

    this.users.set(cleanEmail, newUser);

    const safeUser: User = {
      id: newUser.id,
      displayName: newUser.displayName,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
    };

    return { user: safeUser };
  }

  authenticateUser(email: string, password: string): { user?: User; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const stored = this.users.get(cleanEmail);

    if (!stored) {
      return { error: 'No account found with this email. Please register.' };
    }

    if (stored.password !== password) {
      return { error: 'Incorrect password. Please try again.' };
    }

    const safeUser: User = {
      id: stored.id,
      displayName: stored.displayName,
      email: stored.email,
      role: stored.role,
      createdAt: stored.createdAt
    };

    return { user: safeUser };
  }
}

export const db = new Database();
