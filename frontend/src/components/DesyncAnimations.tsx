"use client"; // This directive MUST be at the top.

import { useEffect } from 'react';

/**
 * Defines the props for the DesyncAnimations component.
 */
interface DesyncAnimationsProps {
  /** 
   * The CSS selector for the elements to target.
   * @default '.spinner-border' 
   */
  selector?: string;
  /** 
   * The minimum possible animation duration in seconds.
   * @default 2.5
   */
  minDuration?: number;
  /** 
   * The maximum possible animation duration in seconds.
   * @default 5.0
   */
  maxDuration?: number;
}

/**
 * A client-side utility component for Next.js that desynchronizes CSS animations.
 * It queries the DOM for elements matching a selector and applies randomized
 * CSS variables to each one. This effect runs only once after the component mounts.
 * It renders no visible elements (null).
 */
const DesyncAnimations = ({
  selector = '.spinner-border',
  minDuration = 2.5,
  maxDuration = 5.0,
}: DesyncAnimationsProps) => {

  useEffect(() => {
    // This effect will run ONLY ONCE on the client-side, after hydration.
    // This is the correct behavior for this component's purpose.
    
    const elements = document.querySelectorAll(selector);

    if (elements.length === 0) {
      // In development, you might want to know if the selector found nothing.
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[DesyncAnimations] No elements found for selector "${selector}".`);
      }
      return;
    }

    elements.forEach((element) => {
      if (element instanceof HTMLElement) {
        const duration = Math.random() * (maxDuration - minDuration) + minDuration;
        const delay = -(Math.random() * duration);
        
        element.style.setProperty('--spin-duration', `${duration.toFixed(2)}s`);
        element.style.setProperty('--spin-delay', `${delay.toFixed(2)}s`);
      }
    });

  // **THE CRITICAL FIX:**
  // We use an empty dependency array [].
  // This tells React to run this effect only one time, after the initial
  // client-side render. It completely avoids the server/client mismatch
  // because the dependency array is always the same (`[]`), thus solving
  // the hydration error. While this means the component won't re-run the
  // effect if its props change, this is the desired behavior for a
  // component placed in the root layout.
  }, []); 

  // This component's purpose is to run an effect, so it renders nothing.
  return null;
};

export default DesyncAnimations;