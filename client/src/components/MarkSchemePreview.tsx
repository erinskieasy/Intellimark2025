import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MarkSchemeEntry } from '@/types';

interface MarkSchemePreviewProps {
  markScheme: MarkSchemeEntry[];
  className?: string;
  collapsed?: boolean;
}

export function MarkSchemePreview({ markScheme, className = '', collapsed = false }: MarkSchemePreviewProps) {
  // Early return if no mark scheme
  if (!markScheme || markScheme.length === 0) {
    return (
      <div className={`border border-red-200 bg-red-50 rounded-lg p-3 ${className}`}>
        <div className="flex items-center text-red-600">
          <span className="material-icons text-red-500 mr-2 text-sm">warning</span>
          <p className="text-xs">No mark scheme data available!</p>
        </div>
      </div>
    );
  }

  // Get test info from first entry
  const testId = markScheme[0]?.testId;
  const totalEntries = markScheme.length;
  const totalPoints = markScheme.reduce((sum, entry) => sum + entry.points, 0);

  // Calculate scheme completeness
  const completeEntries = markScheme.filter(entry => 
    entry.questionNumber && entry.expectedAnswer && entry.points
  ).length;
  
  const completenessPercentage = Math.round((completeEntries / totalEntries) * 100);

  // For collapsed view, just show summary
  if (collapsed) {
    return (
      <div className={`border border-gray-200 bg-gray-50 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="material-icons text-primary mr-2 text-sm">fact_check</span>
            <p className="text-xs font-medium">Mark Scheme</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {totalEntries} Q
            </Badge>
            <Badge variant="outline" className="text-xs bg-blue-50">
              {totalPoints} pts
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  // Full view with table of entries
  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <span className="material-icons text-primary mr-2 text-sm">fact_check</span>
          <h3 className="text-sm font-medium text-gray-700">Mark Scheme Preview</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Test ID: {testId}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {totalEntries} Questions
          </Badge>
          <Badge variant="outline" className="text-xs bg-blue-50">
            {totalPoints} Points
          </Badge>
        </div>
      </div>
      
      <div className="p-3">
        <div className="text-xs text-gray-500 mb-2">
          Completeness: {completenessPercentage}%
        </div>
        
        <div className="max-h-40 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left font-medium text-gray-500">Q#</th>
                <th className="px-2 py-1 text-left font-medium text-gray-500">Answer</th>
                <th className="px-2 py-1 text-right font-medium text-gray-500">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {markScheme.map((entry) => (
                <tr key={entry.questionNumber} className="hover:bg-gray-50">
                  <td className="px-2 py-1">{entry.questionNumber}</td>
                  <td className="px-2 py-1 font-medium">{entry.expectedAnswer || '—'}</td>
                  <td className="px-2 py-1 text-right">{entry.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}