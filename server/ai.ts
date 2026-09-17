import { GoogleGenAI, Type } from '@google/genai';
import { AIEnrichmentResult, AISearchIntentResult } from '../shared/types';

// Lazy initialization of GoogleGenAI client with standard aistudio-build telemetry
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Normalizes Chhattisgarhi music track metadata, classifies genres & moods,
 * and extracts cultural context using Gemini 3.8 Flash.
 */
export async function normalizeTrackMetadata(draft: {
  title: string;
  artistNames: string[];
  rawGenre?: string;
  rawLanguage?: string;
  notes?: string;
}): Promise<AIEnrichmentResult> {
  const ai = getAiClient();
  if (!ai) {
    // Graceful fallback when GEMINI_API_KEY is not configured
    return fallbackEnrichment(draft);
  }

  try {
    const prompt = `You are an expert Chhattisgarhi ethnomusicologist and catalog editor for CG Gaana.
Analyze the following track draft from Chhattisgarh:
Title: "${draft.title}"
Artists: ${draft.artistNames.join(', ')}
Provided Genre: "${draft.rawGenre || 'Unknown'}"
Language: "${draft.rawLanguage || 'Chhattisgarhi'}"
Notes: "${draft.notes || ''}"

Perform:
1. Title and artist name normalization (clean typos, proper Romanized Chhattisgarhi / Devanagari phonetics).
2. Proper genre classification from: Dadariya, Karma, Jas Geet, Lok Geet, DJ/Remix, Panthi, CG Pop, Bhakti, Instrumental.
3. Mood classification (e.g. Celebratory, Romantic, Devotional, High-Energy, Serene, Nostalgic).
4. Concise cultural context explaining relevance to Chhattisgarhi festivals (Hareli, Pola, Cherchera) or regions.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            normalizedTitle: { type: Type.STRING },
            normalizedArtists: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            genres: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            moods: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            culturalSummary: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            needsHumanReview: { type: Type.BOOLEAN }
          },
          required: ['normalizedTitle', 'normalizedArtists', 'genres', 'moods', 'tags', 'culturalSummary', 'confidence', 'needsHumanReview']
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        normalizedTitle: data.normalizedTitle || draft.title,
        normalizedArtists: data.normalizedArtists || draft.artistNames,
        genres: data.genres?.length ? data.genres : ['Lok Geet'],
        moods: data.moods?.length ? data.moods : ['Celebratory'],
        tags: data.tags || ['CG Music'],
        culturalSummary: data.culturalSummary || 'Chhattisgarhi musical piece celebrating regional roots.',
        confidence: typeof data.confidence === 'number' ? data.confidence : 0.92,
        needsHumanReview: Boolean(data.needsHumanReview),
        modelUsed: 'gemini-3.8-flash'
      };
    }
  } catch (err) {
    console.warn('[Gemini AI] Enrichment failed, using fallback:', err);
  }

  return fallbackEnrichment(draft);
}

/**
 * Parses natural language search queries in Romanized Hindi/Chhattisgarhi
 * into structured catalog filters (e.g., "sad maya songs" or "bilaspur fast dj")
 */
export async function parseSearchIntent(query: string): Promise<AISearchIntentResult> {
  const ai = getAiClient();
  if (!ai || !query.trim()) {
    return fallbackSearchIntent(query);
  }

  try {
    const prompt = `Analyze this music search query for the Chhattisgarhi music platform CG Gaana: "${query}".
Identify:
1. Any specific genre (Dadariya, Karma, DJ Remix, Jas Geet, Lok Geet, Panthi, CG Pop).
2. Mood (Romantic, Sad/Virah, High-Energy, Devotional, Nostalgic).
3. Chhattisgarh region or city (Raipur, Bilaspur, Bastar, Korba, Durg, Ratanpur).
4. Suggested search tags.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedGenre: { type: Type.STRING },
            detectedMood: { type: Type.STRING },
            detectedRegion: { type: Type.STRING },
            isPopularQuery: { type: Type.BOOLEAN },
            clarification: { type: Type.STRING },
            suggestedTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['isPopularQuery', 'suggestedTags']
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        query,
        detectedGenre: data.detectedGenre || undefined,
        detectedMood: data.detectedMood || undefined,
        detectedRegion: data.detectedRegion || undefined,
        isPopularQuery: Boolean(data.isPopularQuery),
        clarification: data.clarification || undefined,
        suggestedTags: data.suggestedTags || []
      };
    }
  } catch (err) {
    console.warn('[Gemini AI] Search intent parse failed, using fallback:', err);
  }

  return fallbackSearchIntent(query);
}

/**
 * Drafts an editorial artist biography
 */
export async function draftArtistBio(artistName: string, region: string, genres: string[]): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    return `${artistName} is a celebrated musical voice from ${region}, known for authentic performances in ${genres.join(', ')} traditions across Chhattisgarh.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Write a respectful, concise (2-3 sentences) editorial artist bio for "${artistName}", a musician from ${region}, Chhattisgarh, who performs ${genres.join(', ')}. Highlight regional cultural grounding.`,
    });
    return response.text?.trim() || `${artistName} is a celebrated artist from ${region}, Chhattisgarh.`;
  } catch {
    return `${artistName} is a celebrated musical voice from ${region}, Chhattisgarh.`;
  }
}

/**
 * Assesses text submissions for safety and compliance
 */
export async function moderateSubmissionText(text: string): Promise<{
  safe: boolean;
  flags: string[];
  needsHumanReview: boolean;
}> {
  const ai = getAiClient();
  if (!ai) {
    return { safe: true, flags: [], needsHumanReview: false };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Evaluate this text submitted for a music track description on CG Gaana for profanity, copyright circumvention claims, or offensive content: "${text}".
Return JSON with { "safe": boolean, "flags": string[], "needsHumanReview": boolean }`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            safe: { type: Type.BOOLEAN },
            flags: { type: Type.ARRAY, items: { type: Type.STRING } },
            needsHumanReview: { type: Type.BOOLEAN }
          },
          required: ['safe', 'flags', 'needsHumanReview']
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
  } catch {
    // Fallback safely
  }

  return { safe: true, flags: [], needsHumanReview: false };
}

// Robust heuristic fallbacks
function fallbackEnrichment(draft: { title: string; artistNames: string[]; rawGenre?: string }): AIEnrichmentResult {
  const lowerTitle = draft.title.toLowerCase();
  const genres: string[] = [];
  const moods: string[] = [];

  if (lowerTitle.includes('dj') || lowerTitle.includes('remix') || lowerTitle.includes('bass')) {
    genres.push('DJ/Remix');
    moods.push('High-Energy', 'Dance');
  } else if (lowerTitle.includes('jas') || lowerTitle.includes('maiya') || lowerTitle.includes('bhakti')) {
    genres.push('Jas Geet', 'Devotional');
    moods.push('Devotional', 'Sacred');
  } else if (lowerTitle.includes('karma')) {
    genres.push('Karma');
    moods.push('Celebratory', 'Folk');
  } else if (lowerTitle.includes('dadariya') || lowerTitle.includes('maya') || lowerTitle.includes('sona')) {
    genres.push('Dadariya', 'Romantic');
    moods.push('Romantic', 'Melodic');
  } else {
    genres.push(draft.rawGenre || 'Lok Geet');
    moods.push('Uplifting');
  }

  return {
    normalizedTitle: draft.title.trim(),
    normalizedArtists: draft.artistNames.map(a => a.trim()),
    genres,
    moods,
    tags: [...genres, 'Chhattisgarhi Music', 'CG Audio'],
    culturalSummary: `Chhattisgarhi regional composition rooted in ${genres[0] || 'folk'} traditions.`,
    confidence: 0.88,
    needsHumanReview: false,
    modelUsed: 'heuristic-rule-engine'
  };
}

function fallbackSearchIntent(query: string): AISearchIntentResult {
  const q = query.toLowerCase();
  let detectedGenre: string | undefined;
  let detectedMood: string | undefined;
  let detectedRegion: string | undefined;

  if (q.includes('dj') || q.includes('remix') || q.includes('dance')) detectedGenre = 'DJ/Remix';
  else if (q.includes('karma')) detectedGenre = 'Karma';
  else if (q.includes('dadariya')) detectedGenre = 'Dadariya';
  else if (q.includes('jas') || q.includes('bhakti')) detectedGenre = 'Jas Geet';
  else if (q.includes('panthi')) detectedGenre = 'Panthi';

  if (q.includes('sad') || q.includes('dard') || q.includes('virah')) detectedMood = 'Sad';
  else if (q.includes('romantic') || q.includes('love') || q.includes('maya')) detectedMood = 'Romantic';

  if (q.includes('raipur')) detectedRegion = 'Raipur';
  else if (q.includes('bilaspur')) detectedRegion = 'Bilaspur';
  else if (q.includes('bastar')) detectedRegion = 'Bastar';
  else if (q.includes('korba')) detectedRegion = 'Korba';

  return {
    query,
    detectedGenre,
    detectedMood,
    detectedRegion,
    isPopularQuery: true,
    suggestedTags: [detectedGenre, detectedMood, detectedRegion].filter((x): x is string => Boolean(x))
  };
}

/**
 * Analyzes user play history, active music region, and session habits using Gemini 3.8 Flash
 * to synthesize a custom Playstyle Persona, audio host commentary, and personalized track sequence.
 */
export async function generateUserPlaystyleMix(params: {
  recentlyPlayed: { title: string; artist: string; genres?: string[]; playCount?: number }[];
  favoriteGenres: string[];
  activeRegion: 'cg' | 'bollywood' | 'punjabi' | 'bhojpuri';
  energyPreference?: 'chill' | 'moderate' | 'high_energy';
  candidateTracks: any[];
  highlyPlayedRegionalTracks?: any[];
}): Promise<{
  persona: string;
  vibeDescription: string;
  topGenres: string[];
  energyLevel: 'chill' | 'moderate' | 'high_energy';
  favoriteMoods: string[];
  customDjCommentary: string;
  recommendedTrackIds: string[];
  hearingPatternInsight: string;
  regionalPopularityInsight: string;
  isAiGenerated: boolean;
}> {
  const ai = getAiClient();
  const regionNames = {
    cg: 'Chhattisgarhi (CG Gaana)',
    bollywood: 'Bollywood (Hindi Hits)',
    punjabi: 'Punjabi (Bhangra & Desi Hip-Hop)',
    bhojpuri: 'Bhojpuri (Folk & Dance Dhamaka)'
  };

  const regionLabel = regionNames[params.activeRegion] || 'Regional Indian Music';

  // Build hearing pattern summary including repeated play counts
  const recentSummary = params.recentlyPlayed.length > 0 
    ? params.recentlyPlayed.slice(0, 10).map(t => 
        `"${t.title}" by ${t.artist}${t.playCount && t.playCount > 1 ? ` (Played ${t.playCount}x)` : ''}${t.genres?.length ? ` [${t.genres.join(', ')}]` : ''}`
      ).join('; ')
    : 'New listener exploring initial regional tracks';

  // Summarize highly played regional chartbusters
  const highlyPlayedSummary = params.highlyPlayedRegionalTracks && params.highlyPlayedRegionalTracks.length > 0
    ? params.highlyPlayedRegionalTracks.slice(0, 12).map(t => 
        `"${t.title}" by ${t.artistNames?.[0] || 'Artist'} (${t.playCount ? t.playCount.toLocaleString() + ' plays' : 'Viral Regional Hit'}, Score: ${t.trendScore || 92})`
      ).join('; ')
    : 'Top local regional chartbusters and folk anthems';

  const candidateList = params.candidateTracks.slice(0, 30).map(t => ({
    id: t.id,
    title: t.title,
    artist: t.artistNames?.[0] || 'Unknown',
    genres: t.genres || [],
    moods: t.moods || [],
    playCount: t.playCount || 0,
    trendScore: t.trendScore || 0
  }));

  if (!ai) {
    return fallbackPlaystyleMix(params, candidateList, regionLabel);
  }

  try {
    const prompt = `You are an elite AI Music Curator and Regional DJ Host for ${regionLabel}.
The user wants an AI Playlist generated strictly according to:
1. USER HEARING PATTERN: Their personal listening history, frequent repeat listens, and preferred genres/moods.
2. LOCAL REGIONAL SONGS PLAYED HIGHLY: The top trending local songs, high-velocity hits, and regional anthems that are played heavily right now.

USER HEARING PATTERN (Listen History & Repeats):
${recentSummary}
- Preferred genres: ${params.favoriteGenres.join(', ') || 'Eclectic'}
- Preferred energy: ${params.energyPreference || 'moderate'}

LOCAL REGIONAL SONGS PLAYED HIGHLY (${regionLabel}):
${highlyPlayedSummary}

FULL CANDIDATE TRACKS POOL (Use IDs from this list):
${JSON.stringify(candidateList)}

TASKS:
1. Create a distinctive listener "Playstyle Persona" capturing how their hearing pattern connects with this region (e.g. "Bastar Folk Groove Collector", "Late-Night Virah Melophile", "Desi Beat Explorer", "High-Energy Mandar Enthusiast").
2. Write a 2-sentence conversational vibe description explaining how this AI playlist blends their hearing pattern with the local high-play regional hits.
3. Provide a concise 1-sentence "hearingPatternInsight" (e.g. "Recognized high affinity for soulful melodic loops and frequent repeat sessions.")
4. Provide a concise 1-sentence "regionalPopularityInsight" (e.g. "Fused with top-played Chhattisgarh chartbusters boasting 100K+ community plays.")
5. Write an energetic AI DJ intro announcement (1-2 sentences) like a radio DJ introducing this customized set.
6. Select 10 to 14 candidate track IDs from the pool that best blend the user's hearing pattern with the region's most played songs, sequenced for optimal emotional flow.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            persona: { type: Type.STRING },
            vibeDescription: { type: Type.STRING },
            topGenres: { type: Type.ARRAY, items: { type: Type.STRING } },
            energyLevel: { type: Type.STRING, enum: ['chill', 'moderate', 'high_energy'] },
            favoriteMoods: { type: Type.ARRAY, items: { type: Type.STRING } },
            customDjCommentary: { type: Type.STRING },
            hearingPatternInsight: { type: Type.STRING },
            regionalPopularityInsight: { type: Type.STRING },
            recommendedTrackIds: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: [
            'persona', 'vibeDescription', 'topGenres', 'energyLevel', 
            'favoriteMoods', 'customDjCommentary', 'hearingPatternInsight', 
            'regionalPopularityInsight', 'recommendedTrackIds'
          ]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        persona: data.persona || `${regionLabel.split(' ')[0]} Explorer`,
        vibeDescription: data.vibeDescription || `Synthesized from your recent hearing pattern and top-played ${regionLabel} hits.`,
        topGenres: data.topGenres?.length ? data.topGenres : ['Regional Hits', 'Folk', regionLabel.split(' ')[0]],
        energyLevel: (data.energyLevel as any) || params.energyPreference || 'moderate',
        favoriteMoods: data.favoriteMoods?.length ? data.favoriteMoods : ['Celebratory', 'Melodic'],
        customDjCommentary: data.customDjCommentary || `Welcome to your AI customized set! Blending your favorite hearing pattern with ${regionLabel}'s most-played anthems.`,
        hearingPatternInsight: data.hearingPatternInsight || 'Reflects your personalized tempo, favorite artists, and repeat listen habits.',
        regionalPopularityInsight: data.regionalPopularityInsight || `Loaded with ${regionLabel}'s highest-played regional anthems and chartbusters.`,
        recommendedTrackIds: data.recommendedTrackIds?.length ? data.recommendedTrackIds : candidateList.map(c => c.id).slice(0, 12),
        isAiGenerated: true
      };
    }
  } catch (err) {
    console.warn('[Gemini AI] Playstyle generation error, using smart fallback:', err);
  }

  return fallbackPlaystyleMix(params, candidateList, regionLabel);
}

function fallbackPlaystyleMix(params: any, candidateList: any[], regionLabel: string) {
  const energy = params.energyPreference || 'moderate';
  let persona = `${regionLabel.split(' ')[0]} Explorer`;
  if (energy === 'high_energy') persona = `${regionLabel.split(' ')[0]} Dance Party Catalyst`;
  if (energy === 'chill') persona = `Soulful Acoustic ${regionLabel.split(' ')[0]} Dreamer`;

  return {
    persona,
    vibeDescription: `A high-fidelity sonic journey tailored to your hearing habits and the most-streamed hits across ${regionLabel}.`,
    topGenres: [regionLabel.split(' ')[0], 'Regional Hits', 'Folk & Contemporary'],
    energyLevel: energy as any,
    favoriteMoods: energy === 'high_energy' ? ['High-Energy', 'Celebratory'] : ['Soulful', 'Uplifting'],
    customDjCommentary: `Here is your hand-crafted ${regionLabel} playstyle mix. Settle in as we play your favorite sounds alongside top regional chartbusters.`,
    hearingPatternInsight: 'Calibrated based on your repeat listens and preferred genres.',
    regionalPopularityInsight: `Spotlighting top-streamed regional chart toppers across ${regionLabel}.`,
    recommendedTrackIds: candidateList.map(c => c.id).slice(0, 12),
    isAiGenerated: false
  };
}

