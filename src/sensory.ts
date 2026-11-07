/**
 * Minefield's tiny sensory layer.
 *
 * Every sound is synthesised with the Web Audio API, so there are no external
 * audio files to download and everything works offline inside the APK.
 * Haptics go through the native Android bridge when available, and fall back to
 * the browser Vibration API everywhere else that supports it.
 */

export type Sense =
  | 'tap'        // a safe tile, plain reveal
  | 'expand'     // flood-fill cascade
  | 'flag'       // flag placed
  | 'unflag'     // flag removed
  | 'mine'       // landed on a mine
  | 'chord'      // numbers cleared around a satisfied number
  | 'win'
  | 'lose'
  | 'ui';        // small UI confirmation

interface AndroidBridge {
  haptic?: (kind: string) => void;
  setSystemBars?: (dark: boolean) => void;
  share?: (text: string) => void;
}

interface SensoryOptions {
  sound: boolean;
  haptics: boolean;
}

/** Device-local volume; older installs start at 50%, without changing mute. */
export function readSoundVolume(): number {
  try {
    const saved = localStorage.getItem('minefield-volume');
    if (saved === null || saved.trim() === '') return 0.5;
    const value = Number(saved);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
  } catch { return 0.5; }
}
let soundVolume = readSoundVolume();
export function setSoundVolume(value: number) {
  soundVolume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
  if (master && ctx) {
    // Smooth live adjustments. At 50% gain is 1 (previously fixed at 0.42),
    // giving the default a clear boost while leaving room above it.
    if (typeof master.gain.setTargetAtTime === 'function') master.gain.setTargetAtTime(soundVolume * 2, ctx.currentTime, 0.015);
    else master.gain.value = soundVolume * 2;
  }
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

function audio(): AudioContext | null {
  try {
    if (ctx?.state === 'closed') { ctx = null; master = null; noiseBuffer = null; }
    if (!ctx) {
      const Context = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return null;
      ctx = new Context();
      master = ctx.createGain();
      master.gain.value = soundVolume * 2;
      master.connect(ctx.destination);
    }
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function bridge(): AndroidBridge | undefined {
  return (window as Window & { MinefieldAndroid?: AndroidBridge }).MinefieldAndroid;
}

export function unlockAudio() {
  audio();
}

function noise(context: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const frames = Math.floor(context.sampleRate * 0.6);
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;
  for (let i = 0; i < frames; i++) {
    // Brown-ish noise is softer on the ears than pure white noise.
    const white = Math.random() * 2 - 1;
    previous = (previous + 0.02 * white) / 1.02;
    data[i] = previous * 3.2;
  }
  noiseBuffer = buffer;
  return buffer;
}

interface ToneOptions {
  frequency: number;
  endFrequency?: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
  attack?: number;
}

function tone(context: AudioContext, options: ToneOptions) {
  const start = context.currentTime + (options.delay ?? 0);
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = options.type ?? 'sine';
  oscillator.frequency.setValueAtTime(options.frequency, start);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), start + options.duration);
  }
  const volume = options.volume ?? 0.08;
  const attack = options.attack ?? 0.008;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);
  oscillator.connect(gain);
  gain.connect(master!);
  oscillator.start(start);
  oscillator.stop(start + options.duration + 0.02);
}

function noiseHit(context: AudioContext, volume: number, duration: number, cutoff: number, delay = 0) {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = noise(context);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, context.currentTime + delay);
  gain.gain.setValueAtTime(volume, context.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master!);
  source.start(context.currentTime + delay);
  source.stop(context.currentTime + delay + duration + 0.02);
}

function synthSound(sense: Sense, context: AudioContext) {
  if (!master) return;
  switch (sense) {
    case 'tap':
      // A soft, rounded "tock".
      tone(context, { frequency: 622, endFrequency: 440, duration: 0.085, type: 'sine', volume: 0.052 });
      noiseHit(context, 0.018, 0.04, 3200);
      break;
    case 'expand':
      // A rising sparkle plus a warm whoosh.
      tone(context, { frequency: 392, endFrequency: 720, duration: 0.22, type: 'triangle', volume: 0.034 });
      tone(context, { frequency: 784, duration: 0.14, type: 'sine', volume: 0.018, delay: 0.07 });
      noiseHit(context, 0.026, 0.26, 1500);
      break;
    case 'flag':
      // Cloth "thwip": a short filtered noise whip with a little wooden click.
      noiseHit(context, 0.075, 0.12, 2400, 0);
      tone(context, { frequency: 1180, endFrequency: 700, duration: 0.09, type: 'triangle', volume: 0.03 });
      tone(context, { frequency: 240, duration: 0.06, type: 'sine', volume: 0.05, delay: 0.02 });
      break;
    case 'unflag':
      noiseHit(context, 0.034, 0.1, 1600);
      tone(context, { frequency: 494, endFrequency: 349, duration: 0.1, type: 'sine', volume: 0.027 });
      break;
    case 'mine':
      // Deep, muted thud — nothing that startles.
      tone(context, { frequency: 130, endFrequency: 44, duration: 0.42, type: 'sine', volume: 0.22 });
      tone(context, { frequency: 87, endFrequency: 36, duration: 0.48, type: 'triangle', volume: 0.09 });
      noiseHit(context, 0.1, 0.3, 300);
      break;
    case 'chord':
      tone(context, { frequency: 523.25, duration: 0.12, type: 'sine', volume: 0.04 });
      tone(context, { frequency: 783.99, duration: 0.16, type: 'sine', volume: 0.032, delay: 0.07 });
      break;
    case 'win':
      // A small major arpeggio with a gentle shimmer on top.
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        tone(context, { frequency, duration: 0.32, type: 'sine', volume: 0.07, delay: index * 0.1 });
        tone(context, { frequency: frequency * 2, duration: 0.2, type: 'sine', volume: 0.012, delay: index * 0.1 });
      });
      tone(context, { frequency: 261.63, duration: 0.65, type: 'triangle', volume: 0.035 });
      break;
    case 'lose':
      tone(context, { frequency: 246.94, endFrequency: 123.47, duration: 0.55, type: 'sine', volume: 0.08 });
      tone(context, { frequency: 185, endFrequency: 92.5, duration: 0.65, type: 'triangle', volume: 0.04, delay: 0.14 });
      break;
    case 'ui':
      tone(context, { frequency: 783.99, duration: 0.06, type: 'sine', volume: 0.02 });
      break;
  }
}

const HAPTIC_PATTERNS: Record<Sense, { kind: string; fallback: number | number[] }> = {
  tap: { kind: 'tap', fallback: 12 },
  expand: { kind: 'expand', fallback: [10, 24, 16, 24, 20] },
  flag: { kind: 'blip', fallback: [8, 18, 18] },
  unflag: { kind: 'blip', fallback: 8 },
  mine: { kind: 'mine', fallback: [40, 45, 90] },
  chord: { kind: 'tap', fallback: 14 },
  win: { kind: 'win', fallback: [14, 40, 14, 40, 22, 40, 30] },
  lose: { kind: 'mine', fallback: [60, 50, 60] },
  ui: { kind: 'tap', fallback: 6 },
};

let lastHaptic = 0;

function playHaptics(sense: Sense) {
  const vibrate = navigator.vibrate?.bind(navigator);
  const native = bridge();
  const now = Date.now();
  // One haptic per interaction keeps the game from buzzing like a pager.
  if (sense !== 'expand' && sense !== 'win' && now - lastHaptic < 35) return;
  lastHaptic = now;
  const pattern = HAPTIC_PATTERNS[sense];
  try {
    if (native?.haptic) {
      native.haptic(pattern.kind);
      return;
    }
    if (pattern.fallback && vibrate) vibrate(pattern.fallback);
  } catch {
    // Haptics are seasoning, never a requirement.
  }
}

export function sense(sense: Sense, options: SensoryOptions) {
  if (options.sound) playSound(sense);
  if (options.haptics) playHaptics(sense);
}

export function supportsVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function hapticAvailable(options: SensoryOptions) {
  return options.haptics && (!!bridge()?.haptic || supportsVibrate());
}

function playSound(kind: Sense) {
  const context = audio();
  if (!context) return;
  if (context.state === 'running') { synthSound(kind, context); return; }
  void context.resume().then(() => { if (context.state === 'running') synthSound(kind, context); }).catch(() => {});
}

export async function testAudio(): Promise<string> {
  if (soundVolume === 0) return 'Volume is at 0%. Raise the volume slider to hear the test sound.';
  const context = audio();
  if (!context) return 'Web Audio is unavailable in this app runtime.';
  try {
    await context.resume();
    if (context.state !== 'running') return `Audio is ${context.state}. Try another click or reopen the app.`;
    synthSound('win', context);
    return 'Audio engine running. If silent, check the app’s output in your system mixer. On CachyOS, check GStreamer good plugins and the PulseAudio/PipeWire sink.';
  } catch (error) { return `Could not start audio: ${String(error)}`; }
}
