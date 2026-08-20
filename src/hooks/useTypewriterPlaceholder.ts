import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

const TYPE_MS = 65;
const DELETE_MS = 35;
const PAUSE_FULL_MS = 1300;
const PAUSE_EMPTY_MS = 450;

// Cycles through example queries with a type-in/pause/delete effect, used as
// a live-updating placeholder. Only meant to run while the box is empty and
// unfocused — the caller controls that via `active`, so it never fights with
// real user input.
export function useTypewriterPlaceholder(words: string[], active: boolean) {
  const [text, setText] = useState('');
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) reduceMotionRef.current = v;
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      reduceMotionRef.current = v;
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!active || words.length === 0) {
      setText('');
      return;
    }
    if (reduceMotionRef.current) {
      setText(words[0]);
      return;
    }

    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const word = words[wordIndex];
      if (!deleting) {
        charIndex += 1;
        setText(word.slice(0, charIndex));
        if (charIndex === word.length) {
          deleting = true;
          timeoutId = setTimeout(tick, PAUSE_FULL_MS);
          return;
        }
        timeoutId = setTimeout(tick, TYPE_MS);
      } else {
        charIndex -= 1;
        setText(word.slice(0, charIndex));
        if (charIndex === 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % words.length;
          timeoutId = setTimeout(tick, PAUSE_EMPTY_MS);
          return;
        }
        timeoutId = setTimeout(tick, DELETE_MS);
      }
    };

    timeoutId = setTimeout(tick, PAUSE_EMPTY_MS);
    return () => clearTimeout(timeoutId);
  }, [active, words]);

  return text;
}
