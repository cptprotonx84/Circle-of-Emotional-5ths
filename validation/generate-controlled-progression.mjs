import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const sampleRate = 44_100;
const chordDurationSeconds = 4;
const amplitudePerTone = 0.18;
const outputPath = resolve('validation-results/controlled-c-am-f-g.wav');
const progression = [
  { chord: 'C', frequencies: [261.6256, 329.6276, 391.9954] },
  { chord: 'Am', frequencies: [220.0, 261.6256, 329.6276] },
  { chord: 'F', frequencies: [174.6141, 220.0, 261.6256] },
  { chord: 'G', frequencies: [195.9977, 246.9417, 293.6648] },
];

const totalSamples = progression.length * chordDurationSeconds * sampleRate;
const pcmBytes = totalSamples * 2;
const wav = Buffer.alloc(44 + pcmBytes);

wav.write('RIFF', 0);
wav.writeUInt32LE(36 + pcmBytes, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(pcmBytes, 40);

for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex += 1) {
  const time = sampleIndex / sampleRate;
  const chordIndex = Math.min(progression.length - 1, Math.floor(time / chordDurationSeconds));
  const chord = progression[chordIndex];
  const signal = chord.frequencies.reduce(
    (sum, frequency) => sum + Math.sin(2 * Math.PI * frequency * time) * amplitudePerTone,
    0,
  );
  const edgeFade = Math.min(1, time / 0.01, (progression.length * chordDurationSeconds - time) / 0.01);
  const pcm = Math.round(Math.max(-1, Math.min(1, signal * edgeFade)) * 32767);
  wav.writeInt16LE(pcm, 44 + sampleIndex * 2);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, wav);
console.log(JSON.stringify({
  outputPath,
  sampleRate,
  durationSeconds: totalSamples / sampleRate,
  transitions: progression.map((entry, index) => ({
    timeSeconds: index * chordDurationSeconds,
    chord: entry.chord,
  })),
}, null, 2));
