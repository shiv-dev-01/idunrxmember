import { useState, useEffect } from 'react';
import { TOUR_STEPS } from '../components/tour/config/tourSteps';

export function useTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Check if user has opted out of tours
    const neverShowTour = localStorage.getItem('neverShowTour');
    if (neverShowTour === 'true') {
      return;
    }
    
    // Check if it's the first visit
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
      setRun(true);
    }
  }, []);

  const handleTourEnd = () => {
    setRun(false);
    localStorage.setItem('hasSeenTour', 'true');
  };

  const handleSkip = () => {
    setRun(false);
    localStorage.setItem('hasSeenTour', 'true');
  };

  const resetTour = () => {
    localStorage.removeItem('hasSeenTour');
    localStorage.removeItem('neverShowTour');
    setRun(true);
  };

  return {
    steps: TOUR_STEPS,
    run,
    setRun,
    handleTourEnd,
    handleSkip,
    resetTour,
  };
}