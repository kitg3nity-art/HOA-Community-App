import React from 'react';

interface CasaMiraLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'badge' | 'mark' | 'full' | 'inline';
  showSubtext?: boolean;
  animate?: boolean;
}

export default function CasaMiraLogo({
  className = 'w-10 h-10',
  variant = 'badge',
  showSubtext = true,
  animate = false
}: CasaMiraLogoProps) {
  // Pure vector SVG icon mark
  const renderSvg = (withBg: boolean) => (
    <svg 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-full transform-gpu ${animate ? 'transition-transform duration-300 hover:scale-105' : ''}`}
    >
      <defs>
        <linearGradient id="cmGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="cmTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="50%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>
        <linearGradient id="cmBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <filter id="cmCrispShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
        </filter>
      </defs>

      {withBg && (
        <>
          {/* Badge Background Squircle with Subtle Stroke */}
          <rect 
            x="4" 
            y="4" 
            width="112" 
            height="112" 
            rx="28" 
            fill="url(#cmBgGrad)" 
            stroke="#1E293B" 
            strokeWidth="2.5" 
          />
          {/* Subtle Ambient Radial Glow */}
          <circle cx="60" cy="50" r="32" fill="#0D9488" opacity="0.2" filter="blur(8px)" />
        </>
      )}

      {/* Radiant Community Crest Horizon Sun */}
      <circle cx="60" cy="46" r="14" fill="url(#cmGoldGrad)" opacity="0.95" />

      {/* Sharp Modern Architectural Gables (Interlocking 'C' & 'M' Motif) */}
      <g filter={withBg ? 'url(#cmCrispShadow)' : undefined}>
        {/* Primary Left Golden Gable */}
        <path 
          d="M 24 74 L 50 44 L 64 60 L 54 70 L 50 66 L 36 82 L 24 74 Z" 
          fill="url(#cmGoldGrad)" 
        />

        {/* Secondary Right Teal Gable */}
        <path 
          d="M 46 88 L 68 34 L 96 68 L 84 78 L 68 58 L 58 70 L 68 82 L 58 92 L 46 88 Z" 
          fill="url(#cmTealGrad)" 
        />

        {/* Foundation Base Bar */}
        <path 
          d="M 38 84 L 82 84 L 82 92 L 38 92 Z" 
          fill="url(#cmGoldGrad)" 
          rx="2"
        />

        {/* Central Entrance Gateway */}
        <path 
          d="M 54 80 L 66 80 L 66 92 L 54 92 Z" 
          fill={withBg ? '#0F172A' : '#0F172A'} 
        />
      </g>
    </svg>
  );

  if (variant === 'mark') {
    return <div className={`relative flex items-center justify-center shrink-0 ${className}`}>{renderSvg(false)}</div>;
  }

  if (variant === 'badge') {
    return (
      <div className={`relative flex items-center justify-center shrink-0 shadow-sm ${className}`}>
        {renderSvg(true)}
      </div>
    );
  }

  if (variant === 'full' || variant === 'inline') {
    return (
      <div className={`flex items-center gap-3 select-none ${className}`}>
        <div className="w-10 h-10 shrink-0 flex items-center justify-center shadow-md shadow-slate-900/10 rounded-2xl overflow-hidden">
          {renderSvg(true)}
        </div>
        <div className="flex flex-col min-w-0">
          <h1 className="font-black text-slate-900 text-[15px] leading-tight tracking-tight uppercase truncate">
            Casa Mira
          </h1>
          {showSubtext && (
            <span className="text-[10px] uppercase font-extrabold text-teal-700 tracking-wider truncate">
              South HOA All-in-App
            </span>
          )}
        </div>
      </div>
    );
  }

  return <div className={`relative flex items-center justify-center shrink-0 ${className}`}>{renderSvg(true)}</div>;
}
