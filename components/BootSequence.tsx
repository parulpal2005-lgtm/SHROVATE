import React, { useEffect, useState } from 'react';

interface BootSequenceProps {
  onComplete: () => void;
}

const WORD = "SHROVATE";

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [scanActive, setScanActive] = useState(false);
  
  useEffect(() => {
    const startDelay = 500;
    const speed = 150;

    // Sequence letters
    WORD.split('').forEach((_, i) => {
      setTimeout(() => {
        setActiveIndices(prev => [...prev, i]);
      }, startDelay + (i * speed));
    });

    const totalLetterTime = startDelay + (WORD.length * speed) + 500;
    
    // Trigger Scanner
    setTimeout(() => {
      setScanActive(true);
    }, totalLetterTime);

    // Finish
    setTimeout(() => {
      onComplete();
    }, totalLetterTime + 1600); // Scan time + buffer

  }, [onComplete]);

  return (
    <div className="relative perspective-[1000px]">
      <div className="relative flex gap-[0.1em] z-10">
        {WORD.split('').map((char, i) => (
          <Letter 
            key={i} 
            char={char} 
            isActive={activeIndices.includes(i)} 
          />
        ))}
      </div>

      {/* Scanner Overlay */}
      <div className={`absolute top-0 left-[-20%] w-[10px] h-full bg-white/80 shadow-[0_0_40px_#00f3ff,0_0_20px_white] blur-[4px] opacity-0 -skew-x-[20deg] pointer-events-none ${scanActive ? 'animate-scan-swipe' : ''}`}></div>
    </div>
  );
};

const Letter: React.FC<{ char: string; isActive: boolean }> = ({ char, isActive }) => {
  return (
    <span 
      className={`
        relative inline-block text-[4rem] md:text-[6rem] font-[900] text-transparent opacity-0 origin-bottom
        [-webkit-text-stroke:1px_rgba(0,243,255,0.3)]
        ${isActive ? 'animate-materialize' : ''}
      `}
    >
      {char}
      
      {/* Vertical Energy Beam */}
      <span className={`
        absolute bottom-0 left-1/2 w-[2px] h-0 bg-shrovate-core shadow-[0_0_15px_#00f3ff] -translate-x-1/2 opacity-0
        ${isActive ? 'animate-energy-beam' : ''}
      `} />

      {/* Sparks */}
      {isActive && (
        <>
          <Spark />
          <Spark />
          <Spark />
        </>
      )}
    </span>
  );
};

const Spark: React.FC = () => {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const tx = (Math.random() - 0.5) * 100 + 'px';
    const ty = (Math.random() - 0.5) * 100 + 'px';
    const left = Math.random() * 100 + '%';
    const top = Math.random() * 100 + '%';
    
    setStyle({
      '--tx': tx,
      '--ty': ty,
      left,
      top
    } as React.CSSProperties);
  }, []);

  return (
    <div 
      className="absolute w-[2px] h-[10px] bg-white opacity-0 pointer-events-none animate-spark-flash"
      style={style}
    />
  );
};