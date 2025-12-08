'use client';

import { ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  title?: string;
}

export default function Tooltip({ text, children, position = 'top', title }: TooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-t-blue-600 dark:border-t-blue-500 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-b-blue-600 dark:border-b-blue-500 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-l-blue-600 dark:border-l-blue-500 border-t-transparent border-r-transparent border-b-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 translate-x-1/2 border-r-blue-600 dark:border-r-blue-500 border-t-transparent border-l-transparent border-b-transparent'
  };

  return (
    <div className="relative group inline-block">
      {children}
      <div
        className={`absolute z-50 px-5 py-4 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-blue-200 dark:border-blue-700 whitespace-normal w-80 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:scale-100 scale-95 ${positionClasses[position]}`}
        role="tooltip"
      >
        {title && (
          <div className="font-semibold text-blue-700 dark:text-blue-300 mb-2 pb-2 border-b border-blue-200 dark:border-blue-700">
            {title}
          </div>
        )}
        <div className="leading-relaxed text-gray-700 dark:text-gray-300">
          {text}
        </div>
        <div
          className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`}
        />
      </div>
    </div>
  );
}

