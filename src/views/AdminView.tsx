import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle, Flame, 
  Sparkles, FileText, Sliders, Play, XCircle, RotateCcw, 
  Upload, Search, Filter, Loader2, ArrowUpRight, MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { api, AdminOverviewData } from '../services/api';
import { Track, RightsRecord, ArtistSubmission, EditorialAction, TrendFactorBreakdown, AIEnrichmentResult, User } from '../types';

interface AdminViewProps {
  onExit?: () => void;
  currentUser?: User | null;
  onOpenAuthModal?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onExit, currentUser, onOpenAuthModal }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tracks' | 'rights' | 'submissions' | 'trends' | 'ai' | 'audit'>('overview');
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [tracks, setTracks] = useState<(Track & { rightsRecord?: RightsRecord })[]>([]);
  const [rights, setRights] = useState<(RightsRecord & { trackTitle: string; trackStatus: string })[]>([]);
  const [submissions, setSubmissions] = useState<ArtistSubmission[]>([]);
  const [trendSettings, setTrendSettings] = useState<{ weights: any; formula: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<EditorialAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Takedown Modal State
  const [takedownTrackId, setTakedownTrackId] = useState<string | null>(null);
  const [takedownReason, setTakedownReason] = useState('copyright_claim');

  // AI Enrichment State
  const [aiDraftTitle, setAiDraftTitle] = useState('मोर मयारू संगी (Mor Mayaru Sangi)');
  const [aiDraftArtists, setAiDraftArtists] = useState('Sunil Soni, Alka Chandrakar');
  const [aiDraftNotes, setAiDraftNotes] = useState('Traditional Chhattisgarhi love ballad with Mandar and flute');
  const [aiEnrichmentResult, setAiEnrichmentResult] = useState<AIEnrichmentResult | null>(null);
  const [enriching, setEnriching] = useState(false);

  // Trend Weights State
  const [customWeights, setCustomWeights] = useState<Partial<TrendFactorBreakdown>>({
    playVelocityScore: 35,
    completionScore: 20,
    uniqueListenersScore: 15,
    favoriteRateScore: 10,
    recencyScore: 10,
    editorialBoostScore: 10
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [ov, tr, rg, sb, trn, lg] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminTracks(),
        api.getAdminRights(),
        api.getAdminSubmissions(),
        api.getAdminTrends(),
        api.getAuditLogs()
      ]);
      setOverview(ov);
      setTracks(tr);
      setRights(rg);
      setSubmissions(sb);
      setTrendSettings(trn);
      setAuditLogs(lg);
      if (trn.weights) {
        setCustomWeights(trn.weights);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const notify = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handlePublish = async (trackId: string) => {
    try {
      const res = await api.publishTrack(trackId);
      notify(`Track published! Rights verified for ${res.track?.title || trackId}.`);
      loadData();
    } catch (err: any) {
      notify(`Publish blocked: ${err.message}`);
    }
  };

  const handleTakedown = async () => {
    if (!takedownTrackId) return;
    try {
      await api.takedownTrack(takedownTrackId, takedownReason);
      notify('Track taken down and streaming token revocation triggered.');
      setTakedownTrackId(null);
      loadData();
    } catch (err: any) {
      notify(`Takedown failed: ${err.message}`);
    }
  };

  const handleReviewSubmission = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.reviewSubmission(id, status, status === 'approved' ? 'Meets CG Gaana regional standards' : 'Insufficient rights documentation');
      notify(`Submission ${status}! ${status === 'approved' ? 'Draft track and rights record created.' : ''}`);
      loadData();
    } catch (err: any) {
      notify(`Review failed: ${err.message}`);
    }
  };

  const handleSaveTrendWeights = async () => {
    try {
      await api.setAdminTrendWeights(customWeights);
      notify('Trending formula weights updated successfully!');
      loadData();
    } catch (err: any) {
      notify(`Failed to update weights: ${err.message}`);
    }
  };

  const handleApplyEditorBoost = async (trackId: string, boost: number) => {
    try {
      await api.applyEditorBoost(trackId, boost);
      notify(`Applied +${boost} editorial boost to track!`);
      loadData();
    } catch (err: any) {
      notify(`Boost failed: ${err.message}`);
    }
  };

  const handleAiEnrich = async () => {
    setEnriching(true);
    try {
      const artists = aiDraftArtists.split(',').map(s => s.trim()).filter(Boolean);
      const res = await api.enrichTrackWithAI({
        title: aiDraftTitle,
        artistNames: artists,
        notes: aiDraftNotes
      });
      setAiEnrichmentResult(res);
      notify('Metadata enriched by Gemini AI!');
    } catch (err: any) {
      notify(`AI enrichment failed: ${err.message}`);
    } finally {
      setEnriching(false);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl text-center space-y-5 animate-fadeIn">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/10">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-neutral-100">
            Admin Studio Login Required
          </h2>
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            This console is reserved for admin operations, catalog management, and trending algorithm controls.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-center text-xs text-neutral-400 leading-relaxed">
          Authorized personnel only. Please sign in with your administrator credentials to manage catalog, trends, and rights.
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          {onExit && (
            <button
              onClick={onExit}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Back to Music
            </button>
          )}
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Sign In as Admin
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 pt-2 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-amber-400">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              CG Gaana Governance & Catalog Ops
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-100">
            Admin Console
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Rights gating, takedowns, submissions moderation, and trending algorithm controls.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            <span>Rights: 100% Active</span>
          </div>

          {onExit && (
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-bold border border-neutral-700 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Exit Admin Portal</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Notice Banner */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-semibold flex items-center justify-between shadow-lg animate-fadeIn">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-neutral-400 hover:text-neutral-200">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-800 overflow-x-auto scrollbar-none text-xs font-semibold">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'tracks', label: `Tracks (${tracks.length})` },
          { id: 'rights', label: `Rights Ledger (${rights.length})` },
          { id: 'submissions', label: `Submissions (${submissions.filter(s => s.status === 'pending').length} pending)` },
          { id: 'trends', label: 'Trending Diagnostics' },
          { id: 'ai', label: 'AI Metadata Studio' },
          { id: 'audit', label: 'Audit Trail' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-3 px-4 shrink-0 border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-amber-500 text-amber-400 font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Published Tracks
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-neutral-100 font-mono mt-1">
                {overview.metrics.publishedTracks}
              </div>
              <span className="text-[11px] text-emerald-400 font-medium mt-1 inline-block">
                All Authorized
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Pending Reviews
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono mt-1">
                {overview.metrics.pendingSubmissions}
              </div>
              <span className="text-[11px] text-neutral-400 font-medium mt-1 inline-block">
                Artist applications
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Active Artists
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-neutral-100 font-mono mt-1">
                {overview.metrics.activeArtists}
              </div>
              <span className="text-[11px] text-neutral-400 font-medium mt-1 inline-block">
                Across 8 CG districts
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Telemetry Velocity Plays
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-orange-400 font-mono mt-1">
                {overview.metrics.totalPlayEvents}
              </div>
              <span className="text-[11px] text-neutral-400 font-medium mt-1 inline-block">
                Capped anti-gaming
              </span>
            </div>
          </div>

          {/* Quick Info & Rights Gate Banner */}
          <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-neutral-100">
                  Rights Gate Verification Policy
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5 max-w-2xl">
                  Every track streamed on CG Gaana requires an active RightsRecord (`direct_artist_agreement`, `licensed_catalog`, or `public_domain`). Unverified tracks or takedowns immediately fail HMAC token verification.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('tracks')}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              Review Catalog
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: TRACKS MANAGEMENT */}
      {activeTab === 'tracks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-100">
              Catalog Tracks & Rights Status
            </h3>
            <span className="text-xs text-neutral-400">
              {tracks.length} tracks registered
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-900/80 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Track</th>
                    <th className="py-3 px-4">Artists</th>
                    <th className="py-3 px-4">Genre</th>
                    <th className="py-3 px-4">Rights Owner</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {tracks.map(t => (
                    <tr key={t.id} className="hover:bg-neutral-900/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-100 flex items-center gap-2">
                        <img
                          src={t.artworkUrl}
                          alt={t.title}
                          className="w-8 h-8 rounded-lg object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="truncate max-w-[180px]">{t.title}</span>
                      </td>
                      <td className="py-3 px-4 text-neutral-400 truncate max-w-[140px]">
                        {t.artistNames.join(', ')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[11px]">
                          {t.genres?.[0] || 'CG Folk'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-400">
                        {t.rightsRecord?.rightsOwner || 'Direct Artist'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          t.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          t.status === 'takedown' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {t.status !== 'published' && (
                          <button
                            onClick={() => handlePublish(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 font-semibold"
                          >
                            Publish
                          </button>
                        )}

                        {t.status === 'published' && (
                          <button
                            onClick={() => setTakedownTrackId(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 font-semibold"
                          >
                            Takedown
                          </button>
                        )}

                        <button
                          onClick={() => handleApplyEditorBoost(t.id, 15)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 font-semibold"
                          title="Apply +15 editorial trend boost"
                        >
                          +Boost
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RIGHTS LEDGER */}
      {activeTab === 'rights' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-100">
              Authorized Rights & Licensing Records
            </h3>
            <span className="text-xs text-neutral-400">
              Immutable licensing ledger
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rights.map(r => (
              <div key={r.id} className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-100">{r.trackTitle}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    {r.status}
                  </span>
                </div>
                <div className="text-xs text-neutral-400 space-y-1">
                  <div>Owner: <strong className="text-neutral-200">{r.rightsOwner}</strong></div>
                  <div>Basis: <span className="font-mono text-amber-400">{r.permissionBasis}</span></div>
                  <div>Territories: {r.territories.join(', ')}</div>
                  <div className="text-[11px] text-neutral-500">Ref: {r.evidenceReference || 'Direct agreement on file'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ARTIST SUBMISSIONS REVIEW */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-100">
              Artist Submissions Queue
            </h3>
            <span className="text-xs text-neutral-400">
              Moderation & Verification
            </span>
          </div>

          {submissions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-neutral-900/30 border border-neutral-800 text-neutral-400 text-xs">
              No submissions currently in review.
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map(sub => (
                <div
                  key={sub.id}
                  className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-neutral-100">{sub.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        sub.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                        sub.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Artist: <strong className="text-neutral-200">{sub.artistName}</strong> • Genre: {sub.genre}
                    </p>
                    {sub.notes && (
                      <p className="text-xs text-neutral-300 italic">
                        "{sub.notes}"
                      </p>
                    )}
                    <div className="text-[11px] text-neutral-400">
                      Rights Owner: {sub.rightsOwner || sub.artistName} ({sub.permissionBasis})
                    </div>
                  </div>

                  {sub.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleReviewSubmission(sub.id, 'approved')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-neutral-950 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Approve & Ingest
                      </button>
                      <button
                        onClick={() => handleReviewSubmission(sub.id, 'rejected')}
                        className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-red-400 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TRENDING DIAGNOSTICS & WEIGHTS */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Weighted Ranking Factor Controls</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Adjust mathematical percentage contribution of each signal to the regional trending score.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Play Velocity Weight ({customWeights.playVelocityScore}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={customWeights.playVelocityScore || 35}
                  onChange={e => setCustomWeights(prev => ({ ...prev, playVelocityScore: parseInt(e.target.value) }))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Completion Rate Weight ({customWeights.completionScore}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={customWeights.completionScore || 20}
                  onChange={e => setCustomWeights(prev => ({ ...prev, completionScore: parseInt(e.target.value) }))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Unique Listeners Weight ({customWeights.uniqueListenersScore}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={customWeights.uniqueListenersScore || 15}
                  onChange={e => setCustomWeights(prev => ({ ...prev, uniqueListenersScore: parseInt(e.target.value) }))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Editorial Folk Boost Weight ({customWeights.editorialBoostScore}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={customWeights.editorialBoostScore || 10}
                  onChange={e => setCustomWeights(prev => ({ ...prev, editorialBoostScore: parseInt(e.target.value) }))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSaveTrendWeights}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Apply Weight Adjustments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AI METADATA ENRICHMENT STUDIO */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-base font-bold text-neutral-100">
                Gemini AI Chhattisgarhi Metadata Normalizer
              </h3>
            </div>
            <p className="text-xs text-neutral-400">
              Enrich raw song drafts with standardized Devanagari spellings, regional sub-genre classification, and cultural context.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Track Draft Title</label>
                <input
                  type="text"
                  value={aiDraftTitle}
                  onChange={e => setAiDraftTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Artist Names (comma separated)</label>
                <input
                  type="text"
                  value={aiDraftArtists}
                  onChange={e => setAiDraftArtists(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Raw Cultural Notes</label>
                <textarea
                  rows={2}
                  value={aiDraftNotes}
                  onChange={e => setAiDraftNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleAiEnrich}
                  disabled={enriching}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-neutral-950 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {enriching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Enrich with Gemini AI</span>
                </button>
              </div>
            </div>

            {aiEnrichmentResult && (
              <div className="mt-4 p-4 rounded-xl bg-neutral-950 border border-amber-500/30 text-xs space-y-2 animate-fadeIn">
                <div className="font-bold text-amber-400">Gemini Enrichment Output:</div>
                <div>Normalized Title: <strong className="text-neutral-100">{aiEnrichmentResult.normalizedTitle}</strong></div>
                <div>Normalized Artists: <strong className="text-neutral-100">{aiEnrichmentResult.normalizedArtists.join(', ')}</strong></div>
                <div>Primary Genre: <span className="px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-mono">{aiEnrichmentResult.genres?.[0] || 'CG Folk'}</span></div>
                <div>Cultural Summary: <p className="text-neutral-300 mt-1 italic">{aiEnrichmentResult.culturalSummary}</p></div>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {aiEnrichmentResult.tags?.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-neutral-100">
            Chronological Audit Log
          </h3>
          <div className="space-y-2">
            {auditLogs.map(log => (
              <div key={log.id} className="p-3 rounded-xl bg-neutral-900/50 border border-neutral-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono text-amber-400 font-semibold">{log.actionType}</span>
                  <span className="text-neutral-400 ml-2">by {log.editorName}</span>
                  {log.reason && <p className="text-neutral-500 text-[11px] mt-0.5">{log.reason}</p>}
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Takedown Confirmation Modal */}
      {takedownTrackId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-neutral-950 border border-red-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-bold">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Immediate Track Takedown</span>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Takedown immediately revokes streaming token authorization for this track and unpublishes it from all feeds.
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Reason for Takedown:
              </label>
              <select
                value={takedownReason}
                onChange={e => setTakedownReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-100"
              >
                <option value="copyright_claim">Copyright / Rights Conflict Claim</option>
                <option value="artist_request">Artist Requested Withdrawal</option>
                <option value="licensing_expired">Licensing Window Expired</option>
                <option value="editorial_review">Editorial Standard Failure</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTakedownTrackId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={handleTakedown}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                Execute Takedown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
