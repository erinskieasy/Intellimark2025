import React, { useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Stepper } from '@/components/steppers/Stepper';
import MarkSchemeStep from '@/components/MarkSchemeStep';
import CaptureStep from '@/components/CaptureStep';
import ProcessStep from '@/components/ProcessStep';
import ResultsStep from '@/components/ResultsStep';
import { SettingsModal } from '@/components/SettingsModal';
import { useTestGrader } from '@/context/TestGraderContext';

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { currentStep } = useTestGrader();
  
  // Convert the step string to a numeric index
  const getStepIndex = () => {
    switch (currentStep) {
      case 'mark-scheme': return 1;
      case 'capture': return 2;
      case 'process': return 3;
      case 'results': return 4;
      default: return 1;
    }
  };
  
  // Open settings modal
  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header onSettingsClick={handleOpenSettings} />
      
      <main className="flex-grow p-4">
        <Stepper
          currentStep={getStepIndex()}
          steps={[
            {
              title: 'Mark Scheme',
              icon: <span className="material-icons text-sm">description</span>,
            },
            {
              title: 'Capture',
              icon: <span className="material-icons text-sm">photo_camera</span>,
            },
            {
              title: 'Process',
              icon: <span className="material-icons text-sm">auto_fix_high</span>,
            },
            {
              title: 'Results',
              icon: <span className="material-icons text-sm">grading</span>,
            },
          ]}
        />
        
        <div id="pageContainer">
          {currentStep === 'mark-scheme' && <MarkSchemeStep />}
          {currentStep === 'capture' && <CaptureStep />}
          {currentStep === 'process' && <ProcessStep />}
          {currentStep === 'results' && <ResultsStep />}
        </div>
      </main>
      
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
