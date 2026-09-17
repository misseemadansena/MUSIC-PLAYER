import React, { useState } from 'react';
import { X, Mic2, ShieldCheck, UploadCloud, CheckCircle2, AlertCircle, Sparkles, Music } from 'lucide-react';
import { api } from '../services/api';

interface ArtistSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ArtistSubmissionModal: React.FC<ArtistSubmissionModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [trackTitle, setTrackTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [genre, setGenre] = useState('Karma');
  const [district, setDistrict] = useState('Raipur');
  const [lyricsSnippet, setLyricsSnippet] = useState('');
  const [culturalContext, setCulturalContext] = useState('');
  const [rightsOwner, setRightsOwner] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rightsConfirmed) {
      setError('You must confirm your legal authorization / rights ownership to submit.');
      return;
    }
    if (!trackTitle.trim() || !artistName.trim()) {
      setError('Please provide both track title and artist name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.submitTrack({
        title: trackTitle,
        artistName,
        genre,
        mood: 'Joyful & Folk',
        language: 'Chhattisgarhi',
        audioFileName: `${trackTitle.toLowerCase().replace(/\s+/g, '-')}.wav`,
        rightsOwner: rightsOwner.trim() || artistName,
        permissionBasis: 'direct_artist_agreement',
        rightsDeclarationAccepted: true,
        contactEmail: 'artist@chhattisgarh-music.in',
        notes: culturalContext || lyricsSnippet || undefined
      });

      setSubmittedStatus('Submission received! Your track has entered the CG Gaana Rights Verification Queue.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please check your network.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 text-neutral-950 font-bold">
              <Mic2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-100">
                Artist Track Submission
              </h3>
              <p className="text-xs text-neutral-400">
                Submit Chhattisgarhi music for official catalog publication
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {submittedStatus ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-neutral-100 mb-2">
                जय जोहार! Track Submitted
              </h4>
              <p className="text-sm text-neutral-400 max-w-md">
                {submittedStatus}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Title & Artist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Track Title (गीत के नाम) *
                  </label>
                  <input
                    type="text"
                    required
                    value={trackTitle}
                    onChange={e => setTrackTitle(e.target.value)}
                    placeholder="e.g., मया के डोरी / Tor Maya Ma"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Artist / Band Name (गायक) *
                  </label>
                  <input
                    type="text"
                    required
                    value={artistName}
                    onChange={e => setArtistName(e.target.value)}
                    placeholder="e.g., Dukalu Yadav, Sunil Soni"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Genre & Region */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Chhattisgarhi Genre
                  </label>
                  <select
                    value={genre}
                    onChange={e => setGenre(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Karma">Karma (करमा)</option>
                    <option value="Dadariya">Dadariya (ददरिया)</option>
                    <option value="Jas Geet">Jas Geet / Navratri (जस गीत)</option>
                    <option value="Panthi">Panthi (पंथी गीत)</option>
                    <option value="CG DJ Remix">CG DJ Remix (डीजे रीमिक्स)</option>
                    <option value="Suwa Geet">Suwa Geet (सुवा गीत)</option>
                    <option value="Chhattisgarhi Pop">Chhattisgarhi Pop (मॉडर्न मया)</option>
                    <option value="Faag">Faag / Holi Geet (फाग)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    District / Region (जिला)
                  </label>
                  <select
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Raipur">Raipur (रायपुर)</option>
                    <option value="Bilaspur">Bilaspur (बिलासपुर)</option>
                    <option value="Bastar">Bastar / Jagdalpur (बस्तर)</option>
                    <option value="Durg">Durg / Bhilai (दुर्ग / भिलाई)</option>
                    <option value="Korba">Korba (कोरबा)</option>
                    <option value="Rajnandgaon">Rajnandgaon (राजनांदगांव)</option>
                    <option value="Surguja">Surguja / Ambikapur (सरगुजा)</option>
                    <option value="Dhamtari">Dhamtari (धमतरी)</option>
                  </select>
                </div>
              </div>

              {/* Cultural context & Lyrics */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Cultural Significance / Song Story
                </label>
                <textarea
                  rows={2}
                  value={culturalContext}
                  onChange={e => setCulturalContext(e.target.value)}
                  placeholder="Explain the folk heritage, festival tie-in, or regional instrumentation (Mandar, Jhanjh, Mohri)..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Lyrics Sample (देवनागरी / Hinglish)
                </label>
                <textarea
                  rows={2}
                  value={lyricsSnippet}
                  onChange={e => setLyricsSnippet(e.target.value)}
                  placeholder="गीत के मुख्य बोल यहाँ लिखें..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 font-serif"
                />
              </div>

              {/* Rights Verification Box */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Exclusive / Non-Exclusive Rights Declaration</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                    Rights Holder / Label Name
                  </label>
                  <input
                    type="text"
                    value={rightsOwner}
                    onChange={e => setRightsOwner(e.target.value)}
                    placeholder="e.g., Sundrani Video World / Independent Artist"
                    className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rightsConfirmed}
                    onChange={e => setRightsConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-900 border-neutral-700 cursor-pointer"
                  />
                  <span className="text-xs text-neutral-300 leading-normal">
                    I solemnly declare under penalty of platform suspension that I hold legal authority or an authorized direct agreement to distribute this audio recording for streaming on CG Gaana.
                  </span>
                </label>
              </div>

              {/* Submit Action */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !rightsConfirmed}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-neutral-950 text-xs font-bold transition-all shadow-md shadow-amber-950/30 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Submitting to Queue...</span>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Submit for Verification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
