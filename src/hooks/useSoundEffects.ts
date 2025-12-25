import { useCallback, useRef } from 'react';

// Sound URLs from freesound.org alternatives - using Web Audio API
const createOscillatorSound = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

export const useSoundEffects = () => {
  const soundEnabled = useRef(true);

  const playMove = useCallback(() => {
    if (!soundEnabled.current) return;
    createOscillatorSound(800, 0.1, 'sine');
  }, []);

  const playCapture = useCallback(() => {
    if (!soundEnabled.current) return;
    createOscillatorSound(400, 0.15, 'square');
    setTimeout(() => createOscillatorSound(300, 0.1, 'square'), 50);
  }, []);

  const playCheck = useCallback(() => {
    if (!soundEnabled.current) return;
    createOscillatorSound(600, 0.1, 'sawtooth');
    setTimeout(() => createOscillatorSound(800, 0.1, 'sawtooth'), 100);
  }, []);

  const playGameOver = useCallback(() => {
    if (!soundEnabled.current) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => createOscillatorSound(freq, 0.3, 'sine'), i * 150);
    });
  }, []);

  const playClick = useCallback(() => {
    if (!soundEnabled.current) return;
    createOscillatorSound(1000, 0.05, 'sine');
  }, []);

  const toggleSound = useCallback(() => {
    soundEnabled.current = !soundEnabled.current;
    return soundEnabled.current;
  }, []);

  const isSoundEnabled = useCallback(() => soundEnabled.current, []);

  return {
    playMove,
    playCapture,
    playCheck,
    playGameOver,
    playClick,
    toggleSound,
    isSoundEnabled,
  };
};
