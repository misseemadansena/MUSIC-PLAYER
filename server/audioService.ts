import { Response, Request } from 'express';

// Cache for generated synthetic audio assets in memory
const audioBufferCache = new Map<string, Buffer>();

/**
 * Procedurally generates a warm, melodic Chhattisgarhi acoustic audio piece
 * (combining tanpura/drone harmonics, bamboo flute melody in pentatonic scale,
 * and soft folk mandar pulse) as a standard 44.1kHz 16-bit stereo PCM WAV.
 * This guarantees 100% rights-compliant, self-contained playback for demo tracks.
 */
export function generateSyntheticAudio(assetId: string, durationSeconds = 35): Buffer {
  if (audioBufferCache.has(assetId)) {
    return audioBufferCache.get(assetId)!;
  }

  const sampleRate = 44100;
  const numChannels = 2;
  const bitsPerSample = 16;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = totalSamples * numChannels * (bitsPerSample / 8);
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // WAV Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // ByteRate
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Determine musical base frequency and mood based on assetId
  let seed = 0;
  for (let i = 0; i < assetId.length; i++) {
    seed = (seed * 31 + assetId.charCodeAt(i)) % 1000;
  }
  // Pentatonic scale notes (C, D, E, G, A / Sa, Re, Ga, Pa, Dha) in Hz
  const baseFreqs = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
  const droneFreq = 130.81; // Low Sa drone

  let offset = headerSize;
  const noteDurationSamples = Math.floor(sampleRate * 0.85);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // 1. Tanpura drone (fundamental + 5th harmonic + octave)
    const drone = 
      0.18 * Math.sin(2 * Math.PI * droneFreq * t) +
      0.10 * Math.sin(2 * Math.PI * (droneFreq * 1.5) * t) +
      0.08 * Math.sin(2 * Math.PI * (droneFreq * 2.0) * t);

    // 2. Melodic bamboo flute phrase
    const noteIndex = Math.floor((i + seed * 100) / noteDurationSamples) % baseFreqs.length;
    const melodyFreq = baseFreqs[noteIndex];
    const noteProgress = ((i + seed * 100) % noteDurationSamples) / noteDurationSamples;
    const noteEnv = Math.sin(Math.PI * Math.min(1, noteProgress * 1.1)); // smooth envelope
    
    // Flute timbre: soft fundamental + gentle breath & vibrato
    const vibrato = 1.0 + 0.015 * Math.sin(2 * Math.PI * 5.2 * t);
    const flute = (
      0.35 * Math.sin(2 * Math.PI * melodyFreq * vibrato * t) +
      0.12 * Math.sin(2 * Math.PI * (melodyFreq * 2) * t) +
      0.04 * (Math.random() - 0.5) // subtle breath air
    ) * noteEnv;

    // 3. Folk Mandar/Dholak rhythm pulse (120 BPM = 2 beats/sec)
    const beatPhase = (t * 2.2) % 1.0;
    const pulseEnv = Math.exp(-beatPhase * 12);
    const pulseFreq = beatPhase < 0.1 ? 65 : 120;
    const mandarPulse = 0.22 * Math.sin(2 * Math.PI * pulseFreq * (1 - beatPhase * 0.5) * t) * pulseEnv;

    // Combine signals with master volume envelope (fade in and fade out)
    const fadeIn = Math.min(1, t / 1.5);
    const fadeOut = Math.min(1, (durationSeconds - t) / 2.0);
    const masterEnv = Math.max(0, fadeIn * fadeOut);

    const monoSample = (drone + flute + mandarPulse) * masterEnv * 0.75;
    
    // Slight stereo widening
    const leftSample = Math.max(-1, Math.min(1, monoSample * (1 + 0.1 * Math.sin(t * 0.5))));
    const rightSample = Math.max(-1, Math.min(1, monoSample * (1 - 0.1 * Math.sin(t * 0.5))));

    const leftInt = Math.floor(leftSample * 32767);
    const rightInt = Math.floor(rightSample * 32767);

    buffer.writeInt16LE(leftInt, offset);
    buffer.writeInt16LE(rightInt, offset + 2);
    offset += 4;
  }

  audioBufferCache.set(assetId, buffer);
  return buffer;
}

/**
 * Handles HTTP Range streaming for HTML5 audio element
 */
export function streamAudio(req: Request, res: Response, assetId: string) {
  const audioBuffer = generateSyntheticAudio(assetId);
  const totalSize = audioBuffer.length;
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  if (range) {
    // Parse Range: bytes=start-end
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

    if (start >= totalSize || end >= totalSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${totalSize}`);
      return res.end();
    }

    const chunk = audioBuffer.subarray(start, end + 1);
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
    res.setHeader('Content-Length', chunk.length);
    res.end(chunk);
  } else {
    // Full audio
    res.status(200);
    res.setHeader('Content-Length', totalSize);
    res.end(audioBuffer);
  }
}
