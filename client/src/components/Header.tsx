import React from 'react';
import { useTestGrader } from '@/context/TestGraderContext';

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  const { currentTest } = useTestGrader();
  
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <span className="material-icons text-primary mr-2">school</span>
          <h1 className="text-xl font-semibold text-gray-800">IntelliMark 2025</h1>
          {currentTest && (
            <span className="ml-3 text-sm text-gray-500">
              {currentTest.name}
            </span>
          )}
        </div>
        <button 
          onClick={onSettingsClick}
          className="text-gray-600 hover:text-primary focus:outline-none"
        >
          <span className="material-icons">settings</span>
        </button>
      </div>
    </header>
  );
}
