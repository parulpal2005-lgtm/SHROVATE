import React, { useState, useEffect } from 'react';
import { BootSequence } from './components/BootSequence';
import { Dashboard } from './components/Dashboard';

const App: React.FC = () => {
  const [bootComplete, setBootComplete] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    if (bootComplete) {
      // Small delay to allow fade out/in transition
      const timer = setTimeout(() => {
        setShowDashboard(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [bootComplete]);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-shrovate-bg text-white font-orbitron selection:bg-shrovate-primary selection:text-black">
      {/* Ambient Background Grid (Global) */}
      <div className="absolute inset-0 w-[200vw] h-[200vh] pointer-events-none z-0 origin-top transform-gpu animate-grid-float"
           style={{
             background: `
               linear-gradient(transparent 99%, rgba(0, 243, 255, 0.03) 50%),
               linear-gradient(90deg, transparent 99%, rgba(0, 243, 255, 0.03) 50%)
             `,
             backgroundSize: '40px 40px',
             left: '-50%',
             top: '-20%'
           }}>
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_90%)]"></div>

      <div className="relative z-10 w-full h-full flex flex-col">
        {!showDashboard && (
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${bootComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <BootSequence onComplete={() => setBootComplete(true)} />
          </div>
        )}
        
        {showDashboard && (
          <div className="animate-[fadeIn_1s_ease-out_forwards] w-full h-full">
             <Dashboard />
          </div>
        )}
      </div>
    </main>
  );
};

export default App;