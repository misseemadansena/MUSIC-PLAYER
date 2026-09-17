import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Track } from '../types';
import { api } from '../services/api';

export type RepeatMode = 'off' | 'all' | 'one';

export interface AudioPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  playbackSpeed: number;
  queue: Track[];
  queueIndex: number;
  isFullPlayerOpen: boolean;
  isQueueOpen: boolean;
  isLoadingAudio: boolean;
  errorMessage: string | null;
  sleepTimerMinutes: number | null;
  sleepTimerRemainingSeconds: number | null;
  isYouTube: boolean;
  youtubeVideoId: string | null;
  videoMode: boolean;
  setVideoMode: (mode: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (dur: number) => void;
  // Actions
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlay: () => void;
  seek: (timeInSeconds: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setPlaybackSpeed: (speed: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setIsFullPlayerOpen: (open: boolean) => void;
  setIsQueueOpen: (open: boolean) => void;
  setSleepTimer: (minutes: number | null) => void;
  clearError: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => {
    try {
      const saved = localStorage.getItem('cg_current_track');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sleep timer state
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemainingSeconds, setSleepTimerRemainingSeconds] = useState<number | null>(null);

  // YouTube audio/video sync state
  const [isYouTube, setIsYouTube] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cg_current_track');
      if (saved) {
        const t = JSON.parse(saved);
        return !!(t.youtubeVideoId || t.id?.startsWith('yt-'));
      }
    } catch {}
    return false;
  });
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('cg_current_track');
      if (saved) {
        const t = JSON.parse(saved);
        return t.youtubeVideoId || (t.id?.startsWith('yt-') ? t.id.replace('yt-', '') : null);
      }
    } catch {}
    return null;
  });
  const [videoMode, setVideoMode] = useState<boolean>(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const playRequestIdRef = useRef<number>(0);
  const sessionIdRef = useRef<string>(`session-${Math.random().toString(36).substring(2, 9)}`);
  const reportedMilestonesRef = useRef<Set<number>>(new Set());

  // Refs for media session actions to avoid stale closures
  const togglePlayRef = useRef<() => void>(() => {});
  const nextTrackRef = useRef<() => void>(() => {});
  const prevTrackRef = useRef<() => void>(() => {});
  const seekRef = useRef<(t: number) => void>(() => {});

  const safePause = useCallback(() => {
    if (!audioRef.current) return;
    setIsPlaying(false);
    if (playPromiseRef.current) {
      playPromiseRef.current
        .then(() => {
          if (audioRef.current) {
            audioRef.current.pause();
          }
        })
        .catch(() => {
          if (audioRef.current) {
            audioRef.current.pause();
          }
        });
    } else {
      audioRef.current.pause();
    }
  }, []);

  const safePlay = useCallback(() => {
    if (!audioRef.current) return;
    const promise = audioRef.current.play();
    playPromiseRef.current = promise;
    promise
      .then(() => {
        playPromiseRef.current = null;
        setIsPlaying(true);
      })
      .catch((err: any) => {
        playPromiseRef.current = null;
        if (
          err.name === 'AbortError' ||
          err.message?.includes('interrupted') ||
          err.name === 'NotAllowedError'
        ) {
          return;
        }
        console.error('[AudioPlayer] play error:', err);
      });
  }, []);

  // Update Media Session for lock screen, notifications and background playback
  const updateMediaSession = useCallback((track: Track, playingState: boolean) => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artistNames.join(', '),
        album: track.albumTitle || 'CG Gaana Music',
        artwork: [
          { src: track.artworkUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: track.artworkUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: track.artworkUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: track.artworkUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: track.artworkUrl, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.playbackState = playingState ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => togglePlayRef.current());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayRef.current());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevTrackRef.current());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrackRef.current());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number') {
          seekRef.current(details.seekTime);
        }
      });
    } catch {}
  }, []);

  // Sync mediaSession playback state
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Initialize Audio Element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    // Enable background playback without inline interruptions
    // @ts-ignore
    audio.playsInline = true;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
        checkTelemetryMilestones(audio.currentTime, audio.duration);
      }
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoadingAudio(false);
    };

    const onEnded = () => {
      handleTrackEnded();
    };

    const onError = () => {
      if (!audio.src || audio.error?.code === 1) {
        return;
      }
      setIsLoadingAudio(false);
      // Seamless playback: If a stream fails, auto-advance rather than halting song
      console.warn('[AudioPlayer] Audio stream error. Advancing to next track for uninterrupted playback.');
      setTimeout(() => {
        nextTrackRef.current();
      }, 500);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      safePause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [safePause]);

  // Sleep Timer countdown
  useEffect(() => {
    if (!sleepTimerRemainingSeconds || sleepTimerRemainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setSleepTimerRemainingSeconds(prev => {
        if (!prev || prev <= 1) {
          clearInterval(interval);
          safePause();
          setSleepTimerMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerRemainingSeconds, safePause]);

  // Telemetry milestones for trending engine (25%, 50%, 75%, 100%)
  const checkTelemetryMilestones = (curr: number, dur: number) => {
    if (!currentTrack || dur <= 0) return;
    const pct = Math.floor((curr / dur) * 100);

    const milestones = [25, 50, 75];
    for (const m of milestones) {
      if (pct >= m && !reportedMilestonesRef.current.has(m)) {
        reportedMilestonesRef.current.add(m);
        api.recordPlayEvent({
          trackId: currentTrack.id,
          sessionId: sessionIdRef.current,
          positionMs: Math.floor(curr * 1000),
          completed: false,
          durationMs: Math.floor(dur * 1000),
          source: 'queue'
        }).catch(() => {});
      }
    }
  };

  // Play track with Rights Gate token verification and YouTube playback support
  const playTrack = async (track: Track, newQueue?: Track[]) => {
    const requestId = ++playRequestIdRef.current;
    setErrorMessage(null);
    setIsLoadingAudio(true);
    reportedMilestonesRef.current.clear();

    // 1. Set current track and persist hearing history pattern
    setCurrentTrack(track);
    try {
      localStorage.setItem('cg_current_track', JSON.stringify(track));

      // Persist user hearing pattern with play counts and timestamps
      const stored = localStorage.getItem('cg_recent_played');
      let recent: Array<{ 
        id: string; 
        title: string; 
        artist: string; 
        genres?: string[]; 
        playCount?: number; 
        lastPlayedAt: number; 
        region?: string;
      }> = stored ? JSON.parse(stored) : [];

      const existingIdx = recent.findIndex(r => r.id === track.id || (r.title.toLowerCase() === track.title.toLowerCase()));
      if (existingIdx !== -1) {
        recent[existingIdx].playCount = (recent[existingIdx].playCount || 1) + 1;
        recent[existingIdx].lastPlayedAt = Date.now();
        // Bring to front as most recently heard
        const [heard] = recent.splice(existingIdx, 1);
        recent.unshift(heard);
      } else {
        recent.unshift({
          id: track.id,
          title: track.title,
          artist: track.artistNames?.[0] || 'Unknown Artist',
          genres: track.genres || [],
          playCount: 1,
          lastPlayedAt: Date.now(),
          region: track.region || 'cg'
        });
      }
      if (recent.length > 50) recent = recent.slice(0, 50);
      localStorage.setItem('cg_recent_played', JSON.stringify(recent));
    } catch {}

    // 2. Update queue if provided
    if (newQueue && newQueue.length > 0) {
      setQueue(newQueue);
      const idx = newQueue.findIndex(t => t.id === track.id);
      setQueueIndex(idx !== -1 ? idx : 0);
    } else if (queue.length === 0) {
      setQueue([track]);
      setQueueIndex(0);
    } else {
      const idx = queue.findIndex(t => t.id === track.id);
      if (idx !== -1) {
        setQueueIndex(idx);
      }
    }

    // 3. Check for YouTube video source
    const ytVideoId = track.youtubeVideoId || (track.id.startsWith('yt-') ? track.id.replace('yt-', '') : null);

    if (ytVideoId) {
      // Pause HTML5 audio stream to avoid duplicate audio
      safePause();
      setIsYouTube(true);
      setYoutubeVideoId(ytVideoId);
      setIsPlaying(true);
      setIsLoadingAudio(false);
      setCurrentTime(0);
      setDuration(track.durationMs ? track.durationMs / 1000 : 240);

      // Update browser Media Session for lockscreen & background play
      updateMediaSession(track, true);

      // Record start play event
      api.recordPlayEvent({
        trackId: track.id,
        sessionId: sessionIdRef.current,
        positionMs: 0,
        completed: false,
        durationMs: track.durationMs || 240000,
        source: 'youtube_stream'
      }).catch(() => {});

      return;
    }

    // 4. Standard local rights-gated audio track
    setIsYouTube(false);
    setYoutubeVideoId(null);

    try {
      const tokenRes = await api.getPlayToken(track.id);
      if (requestId !== playRequestIdRef.current) return;

      if (!tokenRes.allowed || !tokenRes.streamUrl) {
        setIsLoadingAudio(false);
        setErrorMessage(tokenRes.message || 'Track is currently restricted by the CG Gaana Rights Gate.');
        return;
      }

      if (tokenRes.youtubeVideoId) {
        safePause();
        setIsYouTube(true);
        setYoutubeVideoId(tokenRes.youtubeVideoId);
        setIsPlaying(true);
        setIsLoadingAudio(false);
        updateMediaSession(track, true);
        return;
      }

      // Load authorized stream URL into audio element
      if (audioRef.current) {
        if (playPromiseRef.current) {
          try {
            await playPromiseRef.current;
          } catch {
            // ignore previous aborted play
          }
        }
        if (requestId !== playRequestIdRef.current) return;

        audioRef.current.src = tokenRes.streamUrl;
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.volume = isMuted ? 0 : volume;

        const promise = audioRef.current.play();
        playPromiseRef.current = promise;
        await promise;

        if (requestId === playRequestIdRef.current) {
          setIsPlaying(true);
        }
      }

      // Update browser Media Session for lockscreen & background play
      updateMediaSession(track, true);

      api.recordPlayEvent({
        trackId: track.id,
        sessionId: sessionIdRef.current,
        positionMs: 0,
        completed: false,
        durationMs: track.durationMs,
        source: 'home_trending'
      }).catch(() => {});
    } catch (err: any) {
      if (
        err.name === 'AbortError' ||
        err.message?.includes('interrupted by a call to pause') ||
        err.message?.includes('interrupted by a new load request') ||
        err.message?.includes('The play() request was interrupted')
      ) {
        return;
      }
      if (err.name === 'NotAllowedError') {
        setIsPlaying(false);
        return;
      }
      console.error('[AudioPlayer] play error:', err);
      setErrorMessage('Could not initialize audio stream. Please check connection.');
      setIsPlaying(false);
    } finally {
      playPromiseRef.current = null;
      if (requestId === playRequestIdRef.current) {
        setIsLoadingAudio(false);
      }
    }
  };

  const togglePlay = () => {
    if (!currentTrack) return;

    if (isYouTube) {
      const nextState = !isPlaying;
      setIsPlaying(nextState);
      const iframe = document.getElementById('cg-active-yt-player') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: nextState ? 'playVideo' : 'pauseVideo',
          args: []
        }), '*');
      }
      return;
    }

    if (!audioRef.current) return;
    if (isPlaying) {
      safePause();
    } else {
      if (currentTrack && audioRef.current.src) {
        safePlay();
      } else if (currentTrack) {
        playTrack(currentTrack);
      }
    }
  };

  const seek = (seconds: number) => {
    const clamped = Math.max(0, Math.min(seconds, duration || 300));
    setCurrentTime(clamped);

    if (isYouTube) {
      const iframe = document.getElementById('cg-active-yt-player') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [clamped, true]
        }), '*');
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.currentTime = clamped;
    }
  };

  const nextTrack = useCallback(() => {
    if (queue.length === 0) {
      if (currentTrack) {
        playTrack(currentTrack);
      }
      return;
    }
    let nextIdx = queueIndex + 1;
    if (isShuffle && queue.length > 1) {
      nextIdx = Math.floor(Math.random() * queue.length);
      if (nextIdx === queueIndex) nextIdx = (queueIndex + 1) % queue.length;
    }
    if (nextIdx < queue.length) {
      setQueueIndex(nextIdx);
      playTrack(queue[nextIdx]);
    } else {
      // Uninterrupted playback: loop seamlessly back to beginning so music never stops
      setQueueIndex(0);
      playTrack(queue[0]);
    }
  }, [queue, queueIndex, isShuffle, currentTrack]);

  const prevTrack = () => {
    if (!audioRef.current && !isYouTube) return;
    // If more than 3 seconds in, restart track
    if (currentTime > 3) {
      seek(0);
      return;
    }
    if (queue.length === 0) {
      seek(0);
      return;
    }
    const prevIdx = queueIndex - 1;
    if (prevIdx >= 0) {
      setQueueIndex(prevIdx);
      playTrack(queue[prevIdx]);
    } else {
      // Loop to end of queue
      setQueueIndex(queue.length - 1);
      playTrack(queue[queue.length - 1]);
    }
  };

  const handleTrackEnded = () => {
    if (currentTrack) {
      api.recordPlayEvent({
        trackId: currentTrack.id,
        sessionId: sessionIdRef.current,
        positionMs: Math.floor(duration * 1000),
        completed: true,
        durationMs: Math.floor(duration * 1000),
        source: 'queue'
      });
    }

    if (repeatMode === 'one') {
      if (isYouTube) {
        seek(0);
        const iframe = document.getElementById('cg-active-yt-player') as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'playVideo',
            args: []
          }), '*');
        }
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        safePlay();
      }
    } else {
      nextTrack();
    }
  };

  // Keep media session action refs in sync with latest state
  useEffect(() => {
    togglePlayRef.current = togglePlay;
    nextTrackRef.current = nextTrack;
    prevTrackRef.current = prevTrack;
    seekRef.current = seek;
  });

  const setVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : clamped;
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
    if (isYouTube) {
      const iframe = document.getElementById('cg-active-yt-player') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'setVolume',
          args: [Math.round(clamped * 100)]
        }), '*');
      }
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.volume = nextMuted ? 0 : volume;
    }
    if (isYouTube) {
      const iframe = document.getElementById('cg-active-yt-player') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: nextMuted ? 'mute' : 'unMute',
          args: []
        }), '*');
      }
    }
  };

  const toggleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const toggleShuffle = () => {
    setIsShuffle(prev => !prev);
  };

  const setPlaybackSpeed = (speed: number) => {
    setPlaybackSpeedState(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const addToQueue = (track: Track) => {
    setQueue(prev => [...prev, track]);
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
    if (index < queueIndex) {
      setQueueIndex(prev => Math.max(0, prev - 1));
    }
  };

  const clearQueue = () => {
    if (currentTrack) {
      setQueue([currentTrack]);
      setQueueIndex(0);
    } else {
      setQueue([]);
      setQueueIndex(0);
    }
  };

  const setSleepTimer = (minutes: number | null) => {
    setSleepTimerMinutes(minutes);
    if (minutes && minutes > 0) {
      setSleepTimerRemainingSeconds(minutes * 60);
    } else {
      setSleepTimerRemainingSeconds(null);
    }
  };

  const clearError = () => {
    setErrorMessage(null);
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        repeatMode,
        isShuffle,
        playbackSpeed,
        queue,
        queueIndex,
        isFullPlayerOpen,
        isQueueOpen,
        isLoadingAudio,
        errorMessage,
        sleepTimerMinutes,
        sleepTimerRemainingSeconds,
        isYouTube,
        youtubeVideoId,
        videoMode,
        setVideoMode,
        setIsPlaying,
        setCurrentTime,
        setDuration,
        playTrack,
        togglePlay,
        seek,
        nextTrack,
        prevTrack,
        setVolume,
        toggleMute,
        toggleRepeat,
        toggleShuffle,
        setPlaybackSpeed,
        addToQueue,
        removeFromQueue,
        clearQueue,
        setIsFullPlayerOpen,
        setIsQueueOpen,
        setSleepTimer,
        clearError
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};
