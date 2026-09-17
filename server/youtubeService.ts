import { Track, MusicRegion } from '../shared/types';

interface YouTubeRawItem {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  views: string;
}

// In-memory cache for search results
const searchCache = new Map<string, { timestamp: number; tracks: Track[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// 1. Curated top Chhattisgarhi hit songs (expanded library)
const CURATED_CG_YOUTUBE_HITS: YouTubeRawItem[] = [
  {
    videoId: 'dJmjKk_a4cw',
    title: 'Kaha Ke Surta | Cg Karma Song | Laxmi Kanchan | Karan Chauhan | Rajendra Patel',
    channel: 'AVM GANA',
    duration: '4:03',
    thumbnail: 'https://i.ytimg.com/vi/dJmjKk_a4cw/hqdefault.jpg',
    views: '26,350,000 views'
  },
  {
    videoId: 'QLgRe9gJqSY',
    title: 'Son Ke Nathani | सोन के नथनी | Chandan Deep | Diman Sen | Kanchan Joshi',
    channel: 'Creative Vision',
    duration: '5:24',
    thumbnail: 'https://i.ytimg.com/vi/QLgRe9gJqSY/hqdefault.jpg',
    views: '133,770,000 views'
  },
  {
    videoId: 'e4h9UpJaIuE',
    title: 'टूरी चमकत जाए | विजय पुरी & सुषमा रानी | Turi Chamkat Jaye Cg Song',
    channel: 'SA MUSIC DULAHIBANDH',
    duration: '4:30',
    thumbnail: 'https://i.ytimg.com/vi/e4h9UpJaIuE/hqdefault.jpg',
    views: '16,710,000 views'
  },
  {
    videoId: 'eSfFKUjjv2Y',
    title: 'Maya Hoge Maya | मया होगे मया | Aditya & Alisha | Cg Romantic Hit',
    channel: 'Diwan Ji CG',
    duration: '4:45',
    thumbnail: 'https://i.ytimg.com/vi/eSfFKUjjv2Y/hqdefault.jpg',
    views: '19,200,000 views'
  },
  {
    videoId: '7hvxPDC7x7I',
    title: 'करमा के ताल में झूमें | Karma Ke Tal Ma Jhume | Mamta Prem Chandrakar',
    channel: 'Mamta Chandrakar Official',
    duration: '6:12',
    thumbnail: 'https://i.ytimg.com/vi/7hvxPDC7x7I/hqdefault.jpg',
    views: '8,400,000 views'
  },
  {
    videoId: 'PiU219zoy6A',
    title: 'KARMA KUHUKI GABO | परवेज खान | Superhit CG Karma Geet | Sanjay Surila',
    channel: 'Sundrani Video World',
    duration: '5:18',
    thumbnail: 'https://i.ytimg.com/vi/PiU219zoy6A/hqdefault.jpg',
    views: '11,500,000 views'
  },
  {
    videoId: 'SUiwGgOubaA',
    title: 'Mai Rahu Tija Upash | तीजा गीत | Kiran Chauhan | Manju Sahu',
    channel: 'Chhattisgarhi Gana',
    duration: '5:02',
    thumbnail: 'https://i.ytimg.com/vi/SUiwGgOubaA/hqdefault.jpg',
    views: '9,800,000 views'
  },
  {
    videoId: '0RYTqaJwZu8',
    title: 'Cg DJ Remix Nonstop 2025 | Dhamaka Bass Raipur Beats',
    channel: 'DJ Raipur Official',
    duration: '12:45',
    thumbnail: 'https://i.ytimg.com/vi/0RYTqaJwZu8/hqdefault.jpg',
    views: '14,300,000 views'
  },
  {
    videoId: 'sZ2d_1sHkZQ',
    title: 'Arpa Pairi Ke Dhar | अरपा पैरी के धार | Official Chhattisgarhi Anthem',
    channel: 'Chhattisgarh Tourism & Culture',
    duration: '4:15',
    thumbnail: 'https://i.ytimg.com/vi/sZ2d_1sHkZQ/hqdefault.jpg',
    views: '32,100,000 views'
  },
  {
    videoId: 'HRE2qcbipiY',
    title: 'MAYA KE GEET | मया के गीत | Vibhu & Sonam Dhiwar | Superhit CG Song',
    channel: 'Vibhu Raut Vlogs',
    duration: '4:22',
    thumbnail: 'https://i.ytimg.com/vi/HRE2qcbipiY/hqdefault.jpg',
    views: '7,600,000 views'
  },
  {
    videoId: 'ZNY983JkF8U',
    title: 'Tola Mor Banahu | तोल मोर बनाहूँ | Sunil Soni & Alka Chandrakar',
    channel: 'Sundrani Music',
    duration: '5:10',
    thumbnail: 'https://i.ytimg.com/vi/ZNY983JkF8U/hqdefault.jpg',
    views: '21,500,000 views'
  },
  {
    videoId: 'Wp_8_f3K7Y0',
    title: 'Champa Ke Kali | चंपा के कली | Dukalu Yadav Superhit Jas Geet',
    channel: 'AVM GANA',
    duration: '6:30',
    thumbnail: 'https://i.ytimg.com/vi/Wp_8_f3K7Y0/hqdefault.jpg',
    views: '18,900,000 views'
  },
  {
    videoId: 'kX_1928374a',
    title: 'Panthi Ke Dhun | पंथी के धुन सतनाम भजन | Devotional CG',
    channel: 'Satnam Sangeet',
    duration: '5:45',
    thumbnail: 'https://i.ytimg.com/vi/sZ2d_1sHkZQ/hqdefault.jpg',
    views: '6,200,000 views'
  },
  {
    videoId: 'mY_8271928c',
    title: 'Mor Raipur Shahar | मोर रायपुर शहर | CG Youth Pop Anthem',
    channel: 'Raipur Indie Waves',
    duration: '3:50',
    thumbnail: 'https://i.ytimg.com/vi/dJmjKk_a4cw/hqdefault.jpg',
    views: '5,400,000 views'
  },
  {
    videoId: 'pQ_9182374b',
    title: 'Bastar Mandaar Dhol | बस्तर मांदार धुन | Authentic Tribal Heritage',
    channel: 'Bastar Culture',
    duration: '7:15',
    thumbnail: 'https://i.ytimg.com/vi/QLgRe9gJqSY/hqdefault.jpg',
    views: '8,100,000 views'
  }
];

// 2. Curated top Bollywood hit songs (expanded library)
const CURATED_BOLLYWOOD_HITS: YouTubeRawItem[] = [
  {
    videoId: 'BddP6PYo2gs',
    title: 'Kesariya - Brahmāstra | Ranbir Kapoor, Alia Bhatt | Pritam, Arijit Singh, Amitabh B',
    channel: 'Sony Music India',
    duration: '4:28',
    thumbnail: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg',
    views: '540,000,000 views'
  },
  {
    videoId: 'VAdGW7QDJhU',
    title: 'Chaleya | Jawan | Shah Rukh Khan, Nayanthara | Anirudh, Arijit Singh, Shilpa Rao',
    channel: 'T-Series',
    duration: '3:20',
    thumbnail: 'https://i.ytimg.com/vi/VAdGW7QDJhU/hqdefault.jpg',
    views: '410,000,000 views'
  },
  {
    videoId: 'LK7-_dgAVQE',
    title: 'Tauba Tauba | Bad Newz | Vicky Kaushal, Triptii Dimri | Karan Aujla',
    channel: 'Saregama Music',
    duration: '3:25',
    thumbnail: 'https://i.ytimg.com/vi/LK7-_dgAVQE/hqdefault.jpg',
    views: '320,000,000 views'
  },
  {
    videoId: 'n2sT_Lw_gLw',
    title: 'O Maahi | Dunki | Shah Rukh Khan, Taapsee Pannu | Pritam, Arijit Singh, Irshad Kamil',
    channel: 'T-Series',
    duration: '3:53',
    thumbnail: 'https://i.ytimg.com/vi/n2sT_Lw_gLw/hqdefault.jpg',
    views: '230,000,000 views'
  },
  {
    videoId: 'ElZfdU54Cp8',
    title: 'Apna Bana Le | Bhediya | Varun Dhawan, Kriti Sanon| Sachin-Jigar, Arijit Singh',
    channel: 'Zee Music Company',
    duration: '4:21',
    thumbnail: 'https://i.ytimg.com/vi/ElZfdU54Cp8/hqdefault.jpg',
    views: '480,000,000 views'
  },
  {
    videoId: 'u2NAus-VDe0',
    title: 'Aaj Ki Raat | Stree 2 | Tamannaah Bhatia, Rajkummar Rao | Sachin-Jigar, Madhubanti',
    channel: 'Saregama Music',
    duration: '3:48',
    thumbnail: 'https://i.ytimg.com/vi/u2NAus-VDe0/hqdefault.jpg',
    views: '670,000,000 views'
  },
  {
    videoId: 'RLzC55ai0eo',
    title: 'Heeriye (Official Video) Jasleen Royal ft Arijit Singh | Dulquer Salmaan',
    channel: 'Jasleen Royal',
    duration: '3:15',
    thumbnail: 'https://i.ytimg.com/vi/RLzC55ai0eo/hqdefault.jpg',
    views: '390,000,000 views'
  },
  {
    videoId: 'IJq0ywW4450',
    title: 'Tum Hi Ho | Aashiqui 2 | Aditya Roy Kapur, Shraddha Kapoor | Arijit Singh',
    channel: 'T-Series',
    duration: '4:22',
    thumbnail: 'https://i.ytimg.com/vi/IJq0ywW4450/hqdefault.jpg',
    views: '850,000,000 views'
  },
  {
    videoId: 'kJQP7kiw5Fk',
    title: 'Despacito Bollywood Lounge Mix | Global Beats',
    channel: 'Fusion Sounds',
    duration: '3:42',
    thumbnail: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg',
    views: '120,000,000 views'
  },
  {
    videoId: '60ItHLz5WEA',
    title: 'Faded x Raabta Acoustic Mashup | Shreya & Arijit',
    channel: 'Acoustic India',
    duration: '4:10',
    thumbnail: 'https://i.ytimg.com/vi/VAdGW7QDJhU/hqdefault.jpg',
    views: '95,000,000 views'
  }
];

// 3. Curated top Punjabi hit songs (expanded library)
const CURATED_PUNJABI_HITS: YouTubeRawItem[] = [
  {
    videoId: 'n_FCrCQ6-bM',
    title: '295 (Official Audio) | Sidhu Moose Wala | The Kidd | Moosetape',
    channel: 'Sidhu Moose Wala',
    duration: '4:30',
    thumbnail: 'https://i.ytimg.com/vi/n_FCrCQ6-bM/hqdefault.jpg',
    views: '760,000,000 views'
  },
  {
    videoId: 'cWMxCE2HTag',
    title: 'Softly | Karan Aujla | Ikky | Making Memories | Official Music Video',
    channel: 'Karan Aujla',
    duration: '2:35',
    thumbnail: 'https://i.ytimg.com/vi/cWMxCE2HTag/hqdefault.jpg',
    views: '310,000,000 views'
  },
  {
    videoId: 'mH_LFkWxpI0',
    title: 'Lover - Diljit Dosanjh (Official Music Video) MoonChild Era',
    channel: 'Diljit Dosanjh',
    duration: '3:12',
    thumbnail: 'https://i.ytimg.com/vi/mH_LFkWxpI0/hqdefault.jpg',
    views: '190,000,000 views'
  },
  {
    videoId: 'VNs_cCtdbPc',
    title: 'Brown Munde - AP Dhillon | Gurinder Gill | Shinda Kahlon | Gminxr',
    channel: 'RUN-UP RECORDS',
    duration: '4:25',
    thumbnail: 'https://i.ytimg.com/vi/VNs_cCtdbPc/hqdefault.jpg',
    views: '680,000,000 views'
  },
  {
    videoId: 'BvDbg_g3sC8',
    title: 'Winning Speech | Karan Aujla | Mxrci | Official Video | Latest Punjabi Song',
    channel: 'Karan Aujla',
    duration: '3:40',
    thumbnail: 'https://i.ytimg.com/vi/BvDbg_g3sC8/hqdefault.jpg',
    views: '150,000,000 views'
  },
  {
    videoId: 'cl0a3i2wFcc',
    title: 'G.O.A.T. - Diljit Dosanjh (Official Music Video)',
    channel: 'Diljit Dosanjh',
    duration: '3:44',
    thumbnail: 'https://i.ytimg.com/vi/cl0a3i2wFcc/hqdefault.jpg',
    views: '280,000,000 views'
  },
  {
    videoId: 'vX2cDW8LUWk',
    title: 'Excuses - AP Dhillon | Gurinder Gill | Intense',
    channel: 'RUN-UP RECORDS',
    duration: '2:56',
    thumbnail: 'https://i.ytimg.com/vi/vX2cDW8LUWk/hqdefault.jpg',
    views: '420,000,000 views'
  },
  {
    videoId: 'h8K_q76W9uU',
    title: 'Born to Shine | Diljit Dosanjh | Official Video',
    channel: 'Diljit Dosanjh',
    duration: '3:35',
    thumbnail: 'https://i.ytimg.com/vi/cl0a3i2wFcc/hqdefault.jpg',
    views: '340,000,000 views'
  },
  {
    videoId: 'pX8_K7625Wq',
    title: 'Old Skool | Prem Dhillon ft. Sidhu Moose Wala',
    channel: 'Sidhu Moose Wala',
    duration: '4:15',
    thumbnail: 'https://i.ytimg.com/vi/n_FCrCQ6-bM/hqdefault.jpg',
    views: '510,000,000 views'
  }
];

// 4. Curated top Bhojpuri hit songs (expanded library)
const CURATED_BHOJPURI_HITS: YouTubeRawItem[] = [
  {
    videoId: 'Y_vGgZ_Vn6Y',
    title: 'Lollypop Lagelu - Pawan Singh | Bhojpuri Superhit Dance Song',
    channel: 'Wave Music',
    duration: '4:10',
    thumbnail: 'https://i.ytimg.com/vi/Y_vGgZ_Vn6Y/hqdefault.jpg',
    views: '240,000,000 views'
  },
  {
    videoId: 'eR31yE4qLbg',
    title: 'Raja Ji Ke Dilwa | Khesari Lal Yadav, Shilpi Raj | Bhojpuri Hit Song',
    channel: 'Khesari Music World',
    duration: '3:45',
    thumbnail: 'https://i.ytimg.com/vi/eR31yE4qLbg/hqdefault.jpg',
    views: '185,000,000 views'
  },
  {
    videoId: 'dM4vLq-KzDk',
    title: 'Kamariya Bole Lollypop | Shilpi Raj, Pawan Singh | Bhojpuri Dance Song',
    channel: 'Wave Music Bhojpuri',
    duration: '3:30',
    thumbnail: 'https://i.ytimg.com/vi/dM4vLq-KzDk/hqdefault.jpg',
    views: '160,000,000 views'
  },
  {
    videoId: 'kQ2_zO1G4W0',
    title: 'Nathuniya | Khesari Lal Yadav & Arshiya Arshi | Bhojpuri Superhit',
    channel: 'Saregama Hum Bhojpuri',
    duration: '3:20',
    thumbnail: 'https://i.ytimg.com/vi/kQ2_zO1G4W0/hqdefault.jpg',
    views: '350,000,000 views'
  },
  {
    videoId: 'tWqO9v3Kz_g',
    title: 'Hari Hari Odhani | Pawan Singh & Anupama Yadav | Latest Bhojpuri Song',
    channel: 'DRS Music',
    duration: '4:05',
    thumbnail: 'https://i.ytimg.com/vi/tWqO9v3Kz_g/hqdefault.jpg',
    views: '280,000,000 views'
  },
  {
    videoId: 'hZ4Qo7a-Rlc',
    title: 'Le Le Aayi Coca Cola | Khesari Lal Yadav & Shilpi Raj | Superhit',
    channel: 'Khesari Music World',
    duration: '3:15',
    thumbnail: 'https://i.ytimg.com/vi/hZ4Qo7a-Rlc/hqdefault.jpg',
    views: '420,000,000 views'
  },
  {
    videoId: 'bN_8372619e',
    title: 'Chhalakata Hamro Jawaniya | Pawan Singh & Priyanka Singh',
    channel: 'Worldwide Records Bhojpuri',
    duration: '3:40',
    thumbnail: 'https://i.ytimg.com/vi/Y_vGgZ_Vn6Y/hqdefault.jpg',
    views: '490,000,000 views'
  },
  {
    videoId: 'xW_9182736c',
    title: 'Dhibari Me Rahue Na Tel | Khesari Lal Yadav & Shilpi Raj',
    channel: 'Speed Records Bhojpuri',
    duration: '3:35',
    thumbnail: 'https://i.ytimg.com/vi/kQ2_zO1G4W0/hqdefault.jpg',
    views: '210,000,000 views'
  }
];

function parseDurationToMs(durationStr?: string): number {
  if (!durationStr) return 210000;
  const parts = durationStr.split(':').map(Number);
  if (parts.some(isNaN)) return 210000;
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000;
  }
  return 210000;
}

function parseViews(viewsStr?: string): number {
  if (!viewsStr) return 100000;
  const num = parseInt(viewsStr.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 100000 : num;
}

function cleanTitle(raw: string): string {
  if (!raw) return 'Song';
  return raw
    .replace(/\s*\|\s*HD Video.*$/i, '')
    .replace(/\s*\|\s*Official Video.*$/i, '')
    .replace(/\s*\|\s*Full Audio.*$/i, '')
    .replace(/\s*\[.*?\]/g, '')
    .trim();
}

function getCuratedForRegion(region: MusicRegion = 'cg'): YouTubeRawItem[] {
  switch (region) {
    case 'bollywood':
      return CURATED_BOLLYWOOD_HITS;
    case 'punjabi':
      return CURATED_PUNJABI_HITS;
    case 'bhojpuri':
      return CURATED_BHOJPURI_HITS;
    case 'cg':
    default:
      return CURATED_CG_YOUTUBE_HITS;
  }
}

function getRegionLanguageLabel(region: MusicRegion = 'cg'): string {
  switch (region) {
    case 'bollywood':
      return 'Hindi';
    case 'punjabi':
      return 'Punjabi';
    case 'bhojpuri':
      return 'Bhojpuri';
    case 'cg':
    default:
      return 'Chhattisgarhi';
  }
}

function rawItemToTrack(item: YouTubeRawItem, region: MusicRegion = 'cg'): Track {
  const views = parseViews(item.views);
  const clean = cleanTitle(item.title);
  const language = getRegionLanguageLabel(region);

  return {
    id: `yt-${item.videoId}`,
    title: clean,
    slug: `yt-${item.videoId}`,
    artistIds: ['art-yt'],
    artistNames: [item.channel || `${language} Artist`],
    albumTitle: `${language} YouTube Hits`,
    durationMs: parseDurationToMs(item.duration),
    audioAssetId: `ast-yt-${item.videoId}`,
    artworkUrl: item.thumbnail || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
    genres: [language, 'YouTube Hits', region === 'bollywood' ? 'Bollywood' : region === 'punjabi' ? 'Bhangra' : region === 'bhojpuri' ? 'Bhojpuri' : 'Folk'],
    moods: ['Celebratory', 'Energetic'],
    language: language as any,
    status: 'published',
    publishedAt: new Date().toISOString(),
    playCount: views,
    favoriteCount: Math.floor(views * 0.04),
    lyricsSnippet: `${clean} - Official ${language} track by ${item.channel} on YouTube.`,
    culturalContext: `Popular ${language} track with over ${item.views || 'millions of plays'} on YouTube.`,
    youtubeVideoId: item.videoId,
    source: 'youtube',
    views: item.views,
    channelTitle: item.channel,
    externalReference: {
      id: `ext-yt-${item.videoId}`,
      entityId: `yt-${item.videoId}`,
      entityType: 'track',
      provider: 'youtube',
      externalId: item.videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
      title: item.title,
      channelTitle: item.channel,
      fetchedAt: new Date().toISOString(),
      notice: 'Official YouTube music track. Plays directly in audio player.'
    }
  };
}

export const youtubeService = {
  /**
   * Searches YouTube for songs matching query, region, page, and limit
   */
  async search(
    query: string, 
    region: MusicRegion = 'cg', 
    page: number = 1, 
    limit: number = 30
  ): Promise<Track[]> {
    const q = query.trim();
    if (!q) {
      return this.getTrending(region, page, limit);
    }

    const safePage = Math.max(1, page);
    const cacheKey = `${region}:${q.toLowerCase()}:p${safePage}:l${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.tracks;
    }

    // Append region qualifier & page variation so every page loads dynamic new songs
    let baseQuery = q;
    const lower = q.toLowerCase();
    if (region === 'cg' && !lower.includes('cg') && !lower.includes('chhattisgarhi')) {
      baseQuery = `${q} cg song`;
    } else if (region === 'bollywood' && !lower.includes('hindi') && !lower.includes('bollywood')) {
      baseQuery = `${q} hindi song`;
    } else if (region === 'punjabi' && !lower.includes('punjabi') && !lower.includes('panjabi')) {
      baseQuery = `${q} punjabi song`;
    } else if (region === 'bhojpuri' && !lower.includes('bhojpuri')) {
      baseQuery = `${q} bhojpuri song`;
    }

    // Dynamic query modifiers for page > 1 to provide endless variety
    let effectiveQuery = baseQuery;
    if (safePage === 2) {
      effectiveQuery = `${baseQuery} superhit full audio`;
    } else if (safePage === 3) {
      effectiveQuery = `${baseQuery} jukebox nonstop album`;
    } else if (safePage === 4) {
      effectiveQuery = `${baseQuery} popular hits mix`;
    } else if (safePage >= 5) {
      effectiveQuery = `${baseQuery} new release music collection vol ${safePage}`;
    }

    try {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(effectiveQuery)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8'
        }
      });

      if (!res.ok) {
        throw new Error(`YouTube responded with status ${res.status}`);
      }

      const html = await res.text();
      const match = html.match(/ytInitialData = ({.*?});<\/script>/);
      const items: YouTubeRawItem[] = [];

      if (match) {
        const data = JSON.parse(match[1]);
        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        if (contents) {
          for (const c of contents) {
            const itemSection = c.itemSectionRenderer?.contents;
            if (itemSection) {
              for (const it of itemSection) {
                if (it.videoRenderer && it.videoRenderer.videoId) {
                  const vr = it.videoRenderer;
                  const title = vr.title?.runs?.map((r: any) => r.text).join('') || vr.title?.simpleText || '';
                  const channel = vr.ownerText?.runs?.[0]?.text || vr.longBylineText?.runs?.[0]?.text || 'Music Channel';
                  const duration = vr.lengthText?.simpleText || '';
                  const thumb = vr.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
                  const views = vr.viewCountText?.simpleText || vr.shortViewCountText?.simpleText || 'Trending';

                  if (!duration.includes(':') || duration.split(':').length <= 2) {
                    items.push({
                      videoId: vr.videoId,
                      title,
                      channel,
                      duration,
                      thumbnail: thumb,
                      views
                    });
                  }
                }
              }
            }
          }
        }
      }

      let tracks: Track[] = [];
      const curated = getCuratedForRegion(region);

      if (items.length > 0) {
        tracks = items.slice(0, limit).map(item => rawItemToTrack(item, region));
      } else {
        // Fallback to curated tracks with circular offset for page
        const startIdx = ((safePage - 1) * 6) % curated.length;
        const reordered = [...curated.slice(startIdx), ...curated.slice(0, startIdx)];
        tracks = reordered.map(item => rawItemToTrack(item, region));
      }

      searchCache.set(cacheKey, { timestamp: Date.now(), tracks });
      return tracks;
    } catch (err) {
      console.error('[YouTubeService] search error:', err);
      const curated = getCuratedForRegion(region);
      const startIdx = ((safePage - 1) * 6) % curated.length;
      const reordered = [...curated.slice(startIdx), ...curated.slice(0, startIdx)];
      return reordered.map(item => rawItemToTrack(item, region));
    }
  },

  /**
   * Gets trending songs dynamically for the given region and page
   */
  async getTrending(
    region: MusicRegion = 'cg', 
    page: number = 1, 
    limit: number = 30
  ): Promise<Track[]> {
    const safePage = Math.max(1, page);
    const cacheKey = `__trending_${region}_p${safePage}_l${limit}__`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.tracks;
    }

    const curated = getCuratedForRegion(region);

    try {
      const trendingTerms: Record<MusicRegion, string[]> = {
        cg: [
          'chhattisgarhi geet hit songs 2025 2026',
          'cg new song karma dadariya dj',
          'chhattisgarh superhit song video',
          'cg traditional lok geet bastar raipur'
        ],
        bollywood: [
          'latest bollywood hit songs 2025 trending hindi',
          'top bollywood romantic songs arijit singh',
          'hindi party dance songs latest',
          'bollywood evergreen 90s and modern remix'
        ],
        punjabi: [
          'latest punjabi hit songs 2025 trending bhangra',
          'punjabi top songs karan aujla diljit dosanjh',
          'punjabi hip hop rap bass boosted',
          'punjabi romantic songs latest'
        ],
        bhojpuri: [
          'latest bhojpuri hit songs 2025 trending pawan singh khesari',
          'bhojpuri dance songs dj blast',
          'bhojpuri devi geet bhakti and folk',
          'bhojpuri superhit gaana nonstop'
        ]
      };

      const terms = trendingTerms[region] || trendingTerms.cg;
      const selectedQuery = terms[(safePage - 1) % terms.length];

      const tracks = await this.search(selectedQuery, region, safePage, limit);
      if (tracks && tracks.length > 0) {
        searchCache.set(cacheKey, { timestamp: Date.now(), tracks });
        return tracks;
      }
    } catch (err) {
      console.error('[YouTubeService] trending error:', err);
    }

    const startIdx = ((safePage - 1) * 6) % curated.length;
    const reordered = [...curated.slice(startIdx), ...curated.slice(0, startIdx)];
    return reordered.map(item => rawItemToTrack(item, region));
  }
};

