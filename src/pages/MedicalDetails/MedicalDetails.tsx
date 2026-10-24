import React from 'react';
import { ChatBox } from '../../components/chat/ChatBox';
import { MedicalOptionsPanel } from './components/MedicalOptionsPanel';
import { useIsMobile } from '../../hooks/useIsMobile';

export function MedicalDetails() {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">👩‍⚕️ Medical Communication</h2>
        <p className="text-sm md:text-base text-gray-600 mt-1">
          Securely communicate with your healthcare provider
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr,320px] gap-6">
        {/* Main Content */}
        <div>
          <ChatBox />
        </div>

        {/* Options Panel - Desktop */}
        {!isMobile && (
          <aside>
            <MedicalOptionsPanel />
          </aside>
        )}
      </div>

      {/* Options Panel - Mobile */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40">
          <MedicalOptionsPanel />
        </div>
      )}
    </div>
  );
}