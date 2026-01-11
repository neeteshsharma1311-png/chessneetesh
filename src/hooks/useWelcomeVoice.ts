import { useEffect, useRef, useCallback } from 'react';

// Create welcome voice using Web Speech API
export const useWelcomeVoice = () => {
  const hasPlayedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playWelcome = useCallback(() => {
    if (hasPlayedRef.current) return;
    
    // Check if speech synthesis is available
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        "Hello! Welcome to Chess Master, developed by Neetesh. Enjoy your game!"
      );
      
      // Configure voice settings for professional male voice
      utterance.rate = 0.9;
      utterance.pitch = 0.9;
      utterance.volume = 0.8;
      
      // Try to get a male English voice
      const voices = speechSynthesis.getVoices();
      const maleVoice = voices.find(
        voice => 
          voice.lang.startsWith('en') && 
          (voice.name.toLowerCase().includes('male') || 
           voice.name.toLowerCase().includes('david') ||
           voice.name.toLowerCase().includes('james') ||
           voice.name.toLowerCase().includes('google uk english male') ||
           voice.name.toLowerCase().includes('daniel'))
      ) || voices.find(voice => voice.lang.startsWith('en'));
      
      if (maleVoice) {
        utterance.voice = maleVoice;
      }
      
      // Small delay to ensure voices are loaded
      setTimeout(() => {
        speechSynthesis.speak(utterance);
        hasPlayedRef.current = true;
      }, 500);
    } else {
      // Fallback to Web Audio API beep sequence
      playBeepWelcome();
    }
  }, []);

  const playBeepWelcome = useCallback(() => {
    if (hasPlayedRef.current) return;
    
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioContextRef.current;
      
      // Play a welcoming musical sequence
      const notes = [523.25, 659.25, 783.99, 1046.50, 783.99]; // C5, E5, G5, C6, G5
      const durations = [0.15, 0.15, 0.15, 0.3, 0.2];
      
      let startTime = ctx.currentTime + 0.1;
      
      notes.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + durations[i]);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + durations[i]);
        
        startTime += durations[i] * 0.8;
      });
      
      hasPlayedRef.current = true;
    } catch (e) {
      console.log('Could not play welcome sound:', e);
    }
  }, []);

  // Load voices when available
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Voices may not be available immediately
      speechSynthesis.onvoiceschanged = () => {
        // Voices are now loaded
      };
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { playWelcome };
};
