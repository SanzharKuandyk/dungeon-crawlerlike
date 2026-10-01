let context: AudioContext | null = null;
export function enableAudio() {
  context ??= new AudioContext();
  void context.resume();
}
export function playCue() {
  if (context?.state !== "running") return;
  const oscillator = context.createOscillator(),
    gain = context.createGain();
  oscillator.frequency.value = 520;
  gain.gain.setValueAtTime(0.035, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.09);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.1);
}
