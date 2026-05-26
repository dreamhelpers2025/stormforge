import React from 'react';

export default function Sigil({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="sigilCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#43C7C7" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#1E7C86" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0B1E2D" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" />
      <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 6" strokeWidth="1" />
      <circle cx="60" cy="60" r="34" fill="url(#sigilCore)" />
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M44 70 C 38 60, 42 46, 56 42 C 70 38, 82 48, 80 60 C 78 70, 68 74, 62 70" />
        <path d="M62 70 L66 76 L72 74 L70 68" />
        <path d="M52 50 C 44 42, 36 44, 32 52 C 38 50, 44 52, 48 56" strokeOpacity="0.85" />
        <path d="M44 70 C 40 78, 48 86, 56 84 L 60 92 L 54 90" strokeOpacity="0.9" />
      </g>
      <path d="M60 50 L62 58 L70 60 L62 62 L60 70 L58 62 L50 60 L58 58 Z" fill="#D8E0E5" opacity="0.9" />
      <circle cx="60" cy="60" r="1.6" fill="#B88A3B" />
    </svg>
  );
}
