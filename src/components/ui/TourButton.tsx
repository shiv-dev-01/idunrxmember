import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from './Button';
import { useTour } from '../../hooks/useTour';

export function TourButton() {
  const { setRun, resetTour } = useTour();

  const handleClick = () => {
    // Reset tour preferences when manually triggered
    resetTour();
  };

  return (
    <>
    {/* <Button
      variant="secondary"
      onClick={handleClick}
      className="fixed bottom-6 right-6 !p-3 rounded-full shadow-lg hover:shadow-xl z-50 bg-white/90 backdrop-blur-sm border-primary-100 hover:border-primary-200"
      title="Take a tour"
    >
      <HelpCircle className="w-5 h-5 text-primary-500" />
    </Button> */}
    </>
  );
}