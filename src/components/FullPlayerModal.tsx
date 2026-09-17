import React, { useState } from 'react';
import { 
  X, Play, Pause, SkipBack, SkipForward, Shuffle, 
  Repeat, Repeat1, Volume2, VolumeX, ListMusic, 
  Moon, Clock, ShieldCheck, Heart, Share2, Sparkles, AlertCircle, Loader2, Video, VideoOff 
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';

interface FullPlayerModalProps {
  onOpenShare: (title: string, subtitle: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (trackId: string) => void;
}

export const FullPlayerModal: React.FC<FullPlayerModalProps> = ({
  onOpenShare,
  isFavorite,
  onToggleFavorite
}) => {
  const {
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
    sleepTimerRemainingSeconds,
    isYouTube,
    videoMode,
    setVideoMode,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    setPlaybackSpeed,
    removeFromQueue,
    clearQueue,
    setIsFullPlayerOpen,
    setIsQueueOpen,
    setSleepTimer,
    playTrack
  } = useAudioPlayer();

  const [activeTab, setActiveTab] = useState<'player' | 'lyrics' | 'queue'>('player');
  const [showSleepMenu, setShowSleepMenu] = useState(false);

  if (!isFullPlayerOpen || !currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-2xl animate-fadeIn">
      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg bg-neutral-950 sm:rounded-3xl border border-neutral-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-neutral-900">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-500">
              CG GAANA PLAYER
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
              {currentTrack.language || 'Chhattisgarhi'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Sleep Timer Indicator */}
            {sleepTimerRemainingSeconds && (
              <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 mr-1">
                <Clock className="w-3 h-3 animate-spin" />
                <span>{Math.ceil(sleepTimerRemainingSeconds / 60)}m</span>
              </div>
            )}

            <button
              onClick={() => setIsFullPlayerOpen(false)}
              className="p-2 rounded-full hover:bg-neutral-900 text-neutral-400 hover:text-neutral-100 transition-colors cursor-pointer"
              aria-label="Close player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Player / Lyrics & Culture / Queue */}
        <div className="flex border-b border-neutral-900 text-xs font-medium px-4">
          <button
            onClick={() => setActiveTab('player')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'player'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Now Playing
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'lyrics'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Lyrics & Context
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Queue ({queue.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
          {activeTab === 'player' && (
            <div className="flex flex-col items-center flex-1 justify-around gap-4">
              {/* Artwork */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden shadow-2xl shadow-amber-950/20 border border-neutral-800 bg-neutral-900 shrink-0 group">
                <img
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-neutral-950/80 backdrop-blur-md border border-neutral-700/50 flex items-center gap-1.5 text-[10px] text-amber-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Authorized Audio</span>
                </div>

                {isYouTube && (
                  <button
                    onClick={() => setVideoMode(!videoMode)}
                    className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-red-950/85 backdrop-blur-md border border-red-700/60 flex items-center gap-1.5 text-[11px] text-red-300 font-bold hover:bg-red-900 transition-colors cursor-pointer"
                    title={videoMode ? "Switch to Audio Artwork Mode" : "Watch YouTube Video"}
                  >
                    {videoMode ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                    <span>{videoMode ? 'Audio Mode' : 'Watch Video'}</span>
                  </button>
                )}
              </div>

              {/* Title & Artists */}
              <div className="w-full flex items-center justify-between gap-4 mt-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-100 truncate tracking-tight">
                    {currentTrack.title}
                  </h2>
                  <p className="text-sm text-neutral-400 truncate mt-0.5">
                    {currentTrack.artistNames.join(', ')}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {currentTrack.genres?.map(g => (
                      <span key={g} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-neutral-800">
                        {g}
                      </span>
                    ))}
                    {currentTrack.moods?.map(m => (
                      <span key={m} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onToggleFavorite(currentTrack.id)}
                    className={`p-2.5 rounded-full border transition-colors cursor-pointer ${
                      isFavorite
                        ? 'bg-rose-950/50 border-rose-500/40 text-rose-500'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-100'
                    }`}
                    title="Favorite"
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={() => onOpenShare(currentTrack.title, currentTrack.artistNames.join(', '))}
                    className="p-2.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-100 transition-colors cursor-pointer"
                    title="Share track"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="w-full mt-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeekChange}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex items-center justify-between text-xs text-neutral-400 font-mono mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls Suite */}
              <div className="w-full flex items-center justify-between px-2">
                <button
                  onClick={toggleShuffle}
                  className={`p-2.5 rounded-lg transition-colors cursor-pointer ${
                    isShuffle ? 'text-amber-400 bg-amber-500/10' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Shuffle"
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <button
                  onClick={prevTrack}
                  className="p-3 text-neutral-300 hover:text-neutral-100 active:scale-95 transition-all cursor-pointer"
                  title="Previous track"
                >
                  <SkipBack className="w-6 h-6 fill-current" />
                </button>

                <button
                  onClick={togglePlay}
                  disabled={isLoadingAudio}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-neutral-950 flex items-center justify-center shadow-xl shadow-amber-950/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isLoadingAudio ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-7 h-7 fill-current" />
                  ) : (
                    <Play className="w-7 h-7 fill-current ml-1" />
                  )}
                </button>

                <button
                  onClick={nextTrack}
                  className="p-3 text-neutral-300 hover:text-neutral-100 active:scale-95 transition-all cursor-pointer"
                  title="Next track"
                >
                  <SkipForward className="w-6 h-6 fill-current" />
                </button>

                <button
                  onClick={toggleRepeat}
                  className={`p-2.5 rounded-lg transition-colors cursor-pointer ${
                    repeatMode !== 'off' ? 'text-amber-400 bg-amber-500/10' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title={`Repeat: ${repeatMode}`}
                >
                  {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>
              </div>

              {/* Volume & Additional Tools */}
              <div className="w-full flex items-center justify-between gap-4 pt-2 border-t border-neutral-900 text-xs">
                {/* Volume Slider */}
                <div className="flex items-center gap-2 flex-1 max-w-[160px]">
                  <button onClick={toggleMute} className="text-neutral-400 hover:text-neutral-200">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-300"
                  />
                </div>

                {/* Speed Selector */}
                <div className="flex items-center gap-1">
                  {[0.75, 1.0, 1.25, 1.5].map(speed => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        playbackSpeed === speed
                          ? 'bg-amber-500 text-neutral-950 font-bold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                {/* Sleep Timer Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowSleepMenu(!showSleepMenu)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-900 transition-colors"
                    title="Sleep Timer"
                  >
                    <Moon className="w-4 h-4" />
                  </button>

                  {showSleepMenu && (
                    <div className="absolute right-0 bottom-full mb-2 w-36 bg-neutral-900 border border-neutral-800 rounded-xl p-1.5 shadow-xl z-20 text-xs animate-fadeIn">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase text-neutral-400 border-b border-neutral-800">
                        Sleep Timer
                      </div>
                      {[null, 15, 30, 45, 60].map(mins => (
                        <button
                          key={String(mins)}
                          onClick={() => {
                            setSleepTimer(mins);
                            setShowSleepMenu(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-200 transition-colors text-xs"
                        >
                          {mins === null ? 'Turn Off' : `${mins} minutes`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Lyrics & Cultural Context */}
          {activeTab === 'lyrics' && (
            <div className="flex flex-col gap-5 text-sm">
              <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Cultural Context & Heritage</span>
                </div>
                <p className="text-neutral-300 leading-relaxed text-xs sm:text-sm">
                  {currentTrack.culturalContext || 'Chhattisgarhi regional composition celebrating folk rhythms, oral traditions, and the red soil of Chhattisgarh.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800">
                <h4 className="text-amber-400 font-bold mb-2 text-xs uppercase tracking-wider">
                  Lyrics Snippet (देवनागरी)
                </h4>
                <p className="text-neutral-200 font-serif leading-loose text-sm sm:text-base whitespace-pre-line">
                  {currentTrack.lyricsSnippet || 'तोला देखे बिना जिया मोर नई माने...\nमया के डोरी म बांधे मोला मोर सोना रे!'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 text-xs text-neutral-400">
                <div className="font-semibold text-neutral-300 mb-1">Rights & Licensing Notice</div>
                <p>
                  This track is streamed from the authorized CG Gaana catalog with explicit permissions from rights holders. No third-party video extraction is performed.
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Interactive Queue */}
          {activeTab === 'queue' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
                <span className="text-xs text-neutral-400 font-medium">
                  {queue.length} Tracks in Queue
                </span>
                <button
                  onClick={clearQueue}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                >
                  Clear Queue
                </button>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[50vh]">
                {queue.map((t, idx) => {
                  const isCurrent = t.id === currentTrack.id;
                  return (
                    <div
                      key={`${t.id}-${idx}`}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-neutral-900/60 border-neutral-800/60 hover:bg-neutral-800/50'
                      }`}
                    >
                      <div
                        onClick={() => playTrack(t)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <img
                          src={t.artworkUrl}
                          alt={t.title}
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className={`text-xs font-bold truncate ${isCurrent ? 'text-amber-400' : 'text-neutral-200'}`}>
                            {t.title}
                          </h5>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {t.artistNames.join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCurrent && isPlaying && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        )}
                        <button
                          onClick={() => removeFromQueue(idx)}
                          className="text-neutral-500 hover:text-neutral-300 text-xs p-1"
                          title="Remove from queue"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
