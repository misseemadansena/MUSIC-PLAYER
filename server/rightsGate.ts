import crypto from 'crypto';
import { Track, RightsRecord, PlaybackTokenResponse, RightsStatus } from '../shared/types';

// Server-side secret for signing media stream tokens
const STREAM_SECRET = process.env.STREAM_SECRET || 'cg-gaana-secure-stream-key-2026';

export interface TokenPayload {
  trackId: string;
  assetId: string;
  expiresAt: number;
}

export class RightsGate {
  /**
   * Evaluates whether a track is legally and contractually authorized for playback.
   * Checks status, rights validity dates, and territory allowances.
   */
  evaluateTrackPlayback(track: Track, rightsRecord?: RightsRecord, userTerritory = 'IN'): {
    isPlayable: boolean;
    reason?: string;
    rightsStatus: RightsStatus;
  } {
    const status = track.status;

    // 1. Check publication/approval status
    if (status === 'pending_review') {
      return {
        isPlayable: false,
        reason: 'Track is currently pending catalog rights and moderation review.',
        rightsStatus: status
      };
    }

    if (status === 'rejected') {
      return {
        isPlayable: false,
        reason: 'Track rights documentation was rejected or failed moderation.',
        rightsStatus: status
      };
    }

    if (status === 'takedown') {
      return {
        isPlayable: false,
        reason: 'This track has been taken down following an owner or editorial request.',
        rightsStatus: status
      };
    }

    if (status === 'expired') {
      return {
        isPlayable: false,
        reason: 'The digital streaming license for this regional track has expired.',
        rightsStatus: status
      };
    }

    if (status === 'scheduled') {
      const pubDate = new Date(track.publishedAt).getTime();
      if (Date.now() < pubDate) {
        return {
          isPlayable: false,
          reason: `Track is scheduled for regional release on ${new Date(track.publishedAt).toLocaleDateString()}.`,
          rightsStatus: status
        };
      }
    }

    // 2. Validate linked RightsRecord if present
    if (rightsRecord) {
      const now = Date.now();
      const from = new Date(rightsRecord.validFrom).getTime();
      const to = new Date(rightsRecord.validTo).getTime();

      if (now < from || now > to) {
        return {
          isPlayable: false,
          reason: 'Rights record agreement window is currently inactive or lapsed.',
          rightsStatus: 'expired'
        };
      }

      // Check territory
      if (rightsRecord.territories && rightsRecord.territories.length > 0) {
        const allowed = rightsRecord.territories.includes('WW') || rightsRecord.territories.includes(userTerritory);
        if (!allowed) {
          return {
            isPlayable: false,
            reason: `Playback restricted to territory: ${rightsRecord.territories.join(', ')}.`,
            rightsStatus: status
          };
        }
      }
    }

    // Track is approved or published with valid window
    if (status === 'published' || status === 'approved') {
      return {
        isPlayable: true,
        rightsStatus: status
      };
    }

    return {
      isPlayable: false,
      reason: 'Track rights status does not permit streaming.',
      rightsStatus: status
    };
  }

  /**
   * Generates a tamper-proof, short-lived HMAC signed playback token.
   * Token expires in 15 minutes.
   */
  generatePlaybackToken(track: Track, assetId: string, ttlSeconds = 900): PlaybackTokenResponse {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const payload = `${track.id}:${assetId}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', STREAM_SECRET)
      .update(payload)
      .digest('hex');

    const token = `${Buffer.from(payload).toString('base64url')}.${signature}`;
    const streamUrl = `/api/stream/${assetId}?token=${token}`;

    return {
      allowed: true,
      trackId: track.id,
      token,
      streamUrl,
      expiresAt: new Date(expiresAt).toISOString(),
      rightsStatus: track.status
    };
  }

  /**
   * Validates a token sent to the audio streaming gateway.
   */
  verifyPlaybackToken(tokenString: string, requestedAssetId: string): { valid: boolean; trackId?: string; error?: string } {
    try {
      const [encodedPayload, signature] = tokenString.split('.');
      if (!encodedPayload || !signature) {
        return { valid: false, error: 'Malformed playback token' };
      }

      const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const [trackId, assetId, expiresAtStr] = payload.split(':');

      if (assetId !== requestedAssetId) {
        return { valid: false, error: 'Token asset mismatch' };
      }

      const expiresAt = parseInt(expiresAtStr, 10);
      if (isNaN(expiresAt) || Date.now() > expiresAt) {
        return { valid: false, error: 'Playback token has expired' };
      }

      const expectedSignature = crypto
        .createHmac('sha256', STREAM_SECRET)
        .update(payload)
        .digest('hex');

      if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return { valid: true, trackId };
      }

      return { valid: false, error: 'Invalid token signature' };
    } catch {
      return { valid: false, error: 'Failed to verify token' };
    }
  }
}

export const rightsGate = new RightsGate();
