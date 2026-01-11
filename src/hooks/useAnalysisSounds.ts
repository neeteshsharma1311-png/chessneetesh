import { useCallback, useRef } from 'react';

// Sound effects for game analysis move classifications
export const useAnalysisSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playNote = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.log('Could not play sound:', e);
    }
  }, [getAudioContext]);

  // Brilliant move - Triumphant ascending arpeggio
  const playBrilliant = useCallback(() => {
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    notes.forEach((freq, i) => {
      setTimeout(() => playNote(freq, 0.25, 'sine', 0.25), i * 80);
    });
  }, [playNote]);

  // Best move - Clean ascending chord
  const playBest = useCallback(() => {
    const notes = [440, 554.37, 659.25]; // A4, C#5, E5
    notes.forEach((freq, i) => {
      setTimeout(() => playNote(freq, 0.2, 'sine', 0.2), i * 60);
    });
  }, [playNote]);

  // Good move - Simple pleasant tone
  const playGood = useCallback(() => {
    playNote(523.25, 0.15, 'sine', 0.15); // C5
    setTimeout(() => playNote(659.25, 0.15, 'sine', 0.15), 80); // E5
  }, [playNote]);

  // Inaccuracy - Slight dissonance
  const playInaccuracy = useCallback(() => {
    playNote(349.23, 0.2, 'triangle', 0.2); // F4
    setTimeout(() => playNote(329.63, 0.15, 'triangle', 0.15), 100); // E4 (minor second below)
  }, [playNote]);

  // Mistake - Warning descending
  const playMistake = useCallback(() => {
    playNote(440, 0.15, 'sawtooth', 0.15); // A4
    setTimeout(() => playNote(349.23, 0.15, 'sawtooth', 0.15), 100); // F4
    setTimeout(() => playNote(293.66, 0.2, 'sawtooth', 0.12), 200); // D4
  }, [playNote]);

  // Blunder - Dramatic error sound
  const playBlunder = useCallback(() => {
    const notes = [440, 349.23, 261.63, 196]; // A4, F4, C4, G3
    notes.forEach((freq, i) => {
      setTimeout(() => playNote(freq, 0.2, 'sawtooth', 0.18), i * 100);
    });
  }, [playNote]);

  // Navigation sound - subtle click
  const playNavigate = useCallback(() => {
    playNote(880, 0.05, 'sine', 0.1);
  }, [playNote]);

  const playClassification = useCallback((classification: string) => {
    switch (classification) {
      case 'brilliant':
        playBrilliant();
        break;
      case 'best':
        playBest();
        break;
      case 'good':
        playGood();
        break;
      case 'inaccuracy':
        playInaccuracy();
        break;
      case 'mistake':
        playMistake();
        break;
      case 'blunder':
        playBlunder();
        break;
      default:
        playNavigate();
    }
  }, [playBrilliant, playBest, playGood, playInaccuracy, playMistake, playBlunder, playNavigate]);

  return {
    playBrilliant,
    playBest,
    playGood,
    playInaccuracy,
    playMistake,
    playBlunder,
    playNavigate,
    playClassification,
  };
};
