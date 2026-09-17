import React, { useEffect, useRef } from 'react';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { Video, VideoOff, Maximize2, Minimize2, X, ExternalLink } from 'lucide-react';

export const YouTubePlayerHost: React.FC = () => {
  const {
    currentTrack,
    isYouTube,
    youtubeVideoId,
    isPlaying,
    isFullPlayerOpen,
    videoMode,
    setVideoMode,
    setIsFullPlayerOpen,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    nextTrack,
    volume,
    isMuted
  } = useAudioPlayer();

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isSyncingRef = useRef(false);

  // Sync state from YouTube iframe messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;

        // YouTube Iframe API message delivery
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            setCurrentTime(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
          if (data.info.playerState === 1) { // playing
            setIsPlaying(true);
          } else if (data.info.playerState === 2) { // paused
            setIsPlaying(false);
          } else if (data.info.playerState === 0) { // ended
            nextTrack();
          }
        }

        if (data.event === 'onStateChange') {
          if (data.info === 1) {
            setIsPlaying(true);
          } else if (data.info === 2) {
            setIsPlaying(false);
          } else if (data.info === 0) {
            nextTrack();
          }
        }
      } catch {
        // non-JSON postMessage
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setCurrentTime, setDuration, setIsPlaying, nextTrack]);

  // Request periodic time updates from YouTube player
  useEffect(() => {
    if (!isYouTube || !youtubeVideoId || !isPlaying) return;

    const interval = setInterval(() => {
      if (iframeRef.current?.contentWindow) {
        // Request currentTime & duration from YouTube
        iframeRef.current.contentWindow.postMessage(JSON.stringify({
          event: 'listening'
        }), '*');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isYouTube, youtubeVideoId, isPlaying]);

  // If no YouTube video is active, don't render anything
  if (!isYouTube || !youtubeVideoId) {
    return null;
  }

  // Construct iframe embed URL with JS API enabled
  const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=1&playsinline=1&controls=1&rel=0&origin=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin : ''
  )}`;

  // When Full Player is open and in Video Mode, we style it inside the modal stage
  if (isFullPlayerOpen && videoMode) {
    return (
      <div className="fixed inset-x-4 top-20 sm:top-24 z-[60] max-w-lg mx-auto pointer-events-auto animate-fadeIn">
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-neutral-800">
          <iframe
            id="cg-active-yt-player"
            ref={iframeRef}
            src={embedUrl}
            title={currentTrack?.title || 'Chhattisgarhi YouTube Video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0"
          />
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => setVideoMode(false)}
              className="text-xs text-neutral-300 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
              title="Switch to Audio artwork mode"
            >
              <VideoOff className="w-3.5 h-3.5" />
              <span>Audio Mode</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Floating PiP Mode (when browsing or when Full Player is in Audio Mode)
  return (
    <div
      className={`fixed z-40 transition-all duration-300 pointer-events-auto ${
        videoMode
          ? 'bottom-20 md:bottom-24 right-3 sm:right-6 w-60 sm:w-72 shadow-2xl rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950/95 backdrop-blur-md'
          : 'fixed -bottom-40 -right-40 w-40 h-40 opacity-[0.01] pointer-events-none'
      }`}
    >
      {videoMode && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-neutral-800 text-[11px] text-neutral-300">
          <span className="font-bold text-amber-400 flex items-center gap-1 truncate">
            <Video className="w-3 h-3 text-red-500" />
            <span className="truncate">YouTube Video</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullPlayerOpen(true)}
              className="hover:text-amber-400 cursor-pointer"
              title="Expand to Full Player"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => setVideoMode(false)}
              className="hover:text-red-400 cursor-pointer"
              title="Audio only mode (hide video window)"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <div className={videoMode ? 'aspect-video w-full bg-black' : 'w-full h-full'}>
        <iframe
          id="cg-active-yt-player"
          ref={iframeRef}
          src={embedUrl}
          title={currentTrack?.title || 'YouTube Audio Stream'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>

      {videoMode && (
        <div className="p-2 bg-neutral-950 text-xs">
          <p className="font-semibold text-neutral-200 truncate">{currentTrack?.title}</p>
          <p className="text-[11px] text-neutral-400 truncate">{currentTrack?.artistNames.join(', ')}</p>
        </div>
      )}
    </div>
  );
};
