import React from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useTour } from '../../hooks/useTour';
import { TOUR_STYLES } from './styles/tourConfig';
import { TOUR_LOCALE } from './styles/tourConfig';

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { steps, run, handleTourEnd, handleSkip } = useTour();

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action } = data;
    
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      if (action === 'skip') {
        handleSkip();
      } else {
        handleTourEnd();
      }
    }
  };

  const stepsWithDontShow: Step[] = steps.map(step => ({
    ...step,
    content: (
      <div>
        {step.content}
        {step.target === '.welcome-section' && (
          <div className="mt-4 flex items-center">
            <label className="flex items-center text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                onChange={(e) => {
                  if (e.target.checked) {
                    localStorage.setItem('neverShowTour', 'true');
                  }
                }}
              />
              Don't show this tour again
            </label>
          </div>
        )}
      </div>
    ),
  }));

  return (
    <>
      <Joyride
        steps={stepsWithDontShow}
        run={run}
        continuous
        showProgress
        showSkipButton
        hideCloseButton
        spotlightClicks
        callback={handleJoyrideCallback}
        styles={TOUR_STYLES}
        floaterProps={{
          disableAnimation: true,
          styles: {
            floater: {
              filter: 'drop-shadow(0 20px 13px rgba(0, 0, 0, 0.03)) drop-shadow(0 8px 5px rgba(0, 0, 0, 0.08))',
            },
          },
        }}
        locale={TOUR_LOCALE}
      />
      {children}
    </>
  );
}