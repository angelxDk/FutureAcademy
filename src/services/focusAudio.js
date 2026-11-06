let context;
const channels = new Map();
export async function setFocusSound(id, volume) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) throw new Error('Áudio não é suportado neste navegador.');
  if (!context) context = new AudioContext();
  if (context.state === 'suspended') await context.resume();
  if (channels.has(id)) { channels.get(id).gain.gain.setTargetAtTime(volume * 0.4, context.currentTime, 0.15); return; }
  if (!volume) return;
  const buffer = context.createBuffer(1, context.sampleRate * 5, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < samples.length; i++) {
    const white = Math.random() * 2 - 1;
    if (id === 'brown') { last = (last + .02 * white) / 1.02; samples[i] = last * 3.5; }
    else samples[i] = white;
  }
  const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = id === 'rain' ? 'lowpass' : id === 'soft' ? 'lowpass' : 'allpass';
  filter.frequency.value = id === 'soft' ? 450 : 2200;
  const gain = context.createGain(); gain.gain.value = 0;
  source.connect(filter).connect(gain).connect(context.destination); source.start();
  gain.gain.setTargetAtTime(volume * 0.4, context.currentTime, 0.3);
  channels.set(id, { source, filter, gain });
}
export function stopFocusSounds() {
  channels.forEach(({ source, filter, gain }) => { try { source.stop(); source.disconnect(); filter.disconnect(); gain.disconnect(); } catch { } });
  channels.clear();
}
export function disposeFocusAudio() { stopFocusSounds(); context?.close().catch(() => {}); context = null; }
