import React from 'react';

export const VerumOmnisLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex items-center space-x-3 ${className}`}>
    <svg aria-hidden="true" width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10">
        <circle cx="50" cy="50" r="48" stroke="#1E3A8A" strokeWidth="4" fill="none" opacity="0.3"/>
        <path d="M85.36 63.43C78.93 80.06 63.3 91.6 45 91.6c-22.09 0-40-17.91-40-40 0-5.52 1.12-10.78 3.17-15.4" stroke="#172554" strokeWidth="12" strokeLinecap="round"/>
        <path d="M14.64 36.57C21.07 19.94 36.7 8.4 55 8.4c22.09 0 40 17.91 40 40 0 5.52-1.12 10.78-3.17 15.4" stroke="#2563EB" strokeWidth="12" strokeLinecap="round"/>
    </svg>
    <div className="flex flex-col">
      <span className="text-xl font-bold text-gray-800 dark:text-white tracking-wide uppercase">VERUM OMNIS</span>
      <span className="text-xs text-gray-500 dark:text-gray-400 tracking-wider uppercase">Forensic AI</span>
    </div>
  </div>
);