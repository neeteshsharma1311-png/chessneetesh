import { useEffect, useRef, useCallback, useState } from 'react';

const STORAGE_KEY = 'chess_welcome_played';

export const useWelcomeVoice = () => {
  const hasPlayedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const voicesLoadedRef = useRef(false);

  // Load voices on mount
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
          voicesLoadedRef.current = true;
          setIsReady(true);
        }
      };

      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const playWelcome = useCallback(() => {
    // Check if already played this session
    if (hasPlayedRef.current) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY)) {
      hasPlayedRef.current = true;
      return;
    }

    hasPlayedRef.current = true;
    sessionStorage.setItem(STORAGE_KEY, 'true');

    // Use Web Speech API
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech first
      speechSynthesis.cancel();

      const speak = () => {
        const utterance = new SpeechSynthesisUtterance(
          "Hello! Welcome to Chess Master, developed by Neetesh. Enjoy your game!"
        );

        // Configure voice settings for professional voice
        utterance.rate = 0.92;
        utterance.pitch = 0.88;
        utterance.volume = 0.85;

        // Try to get the best available English voice
        const voices = speechSynthesis.getVoices();
        
        // Priority order for voice selection
        const preferredVoiceNames = [
          'google uk english male',
          'microsoft david',
          'daniel',
          'james',
          'google us english',
          'samantha',
          'alex',
        ];

        let selectedVoice = null;
        
        // First try to find a preferred voice
        for (const name of preferredVoiceNames) {
          const found = voices.find(v => 
            v.name.toLowerCase().includes(name) && v.lang.startsWith('en')
          );
          if (found) {
            selectedVoice = found;
            break;
          }
        }

        // Fallback to any English voice
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.startsWith('en-')) || 
                          voices.find(v => v.lang.startsWith('en'));
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onend = () => {
          console.log('Welcome message completed');
        };

        utterance.onerror = (e) => {
          console.log('Speech error:', e);
        };

        speechSynthesis.speak(utterance);
      };

      // Ensure voices are loaded before speaking
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Small delay to ensure everything is ready
        setTimeout(speak, 300);
      } else {
        // Wait for voices to load
        speechSynthesis.onvoiceschanged = () => {
          setTimeout(speak, 300);
          speechSynthesis.onvoiceschanged = null;
        };
      }
    }
  }, []);

  return { playWelcome, isReady };
};
