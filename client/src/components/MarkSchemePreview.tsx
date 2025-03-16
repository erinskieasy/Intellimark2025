import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { MarkSchemeEntry } from '@/types';
import { useTestGrader } from '@/context/TestGraderContext';
import { parseExcelWithColumnMap } from '@/lib/utils';

interface MarkSchemePreviewProps {
  markScheme?: MarkSchemeEntry[];
  className?: string;
  collapsed?: boolean;
  forceDirect?: boolean; // Force using passed markScheme directly
}

export function MarkSchemePreview({ 
  markScheme: providedMarkScheme, 
  className = '', 
  collapsed = false,
  forceDirect = false
}: MarkSchemePreviewProps) {
  const { excelFile, columnMap, markScheme: contextMarkScheme } = useTestGrader();
  const [parsedMarkScheme, setParsedMarkScheme] = useState<MarkSchemeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine which mark scheme data to use
  const markScheme = forceDirect && providedMarkScheme 
    ? providedMarkScheme 
    : parsedMarkScheme.length > 0 
      ? parsedMarkScheme 
      : contextMarkScheme;

  // Parse Excel file on demand when component mounts or when dependencies change
  useEffect(() => {
    async function parseExcel() {
      // Skip if we're using provided data directly or already have parsed data
      if ((forceDirect && providedMarkScheme) || !excelFile || !columnMap) {
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        const freshParsedData = await parseExcelWithColumnMap(excelFile, columnMap) as MarkSchemeEntry[];
        setParsedMarkScheme(freshParsedData);
        console.log("MarkSchemePreview: Freshly parsed Excel data", freshParsedData.length, "items");
      } catch (err) {
        console.error("Failed to parse Excel file:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    }
    
    parseExcel();
  }, [excelFile, columnMap, forceDirect, providedMarkScheme]);

  // Show loading state
  if (isLoading) {
    return (
      <div className={`border border-gray-200 bg-gray-50 rounded-lg p-3 flex items-center ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary mr-2"></div>
        <p className="text-xs">Loading mark scheme...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`border border-red-200 bg-red-50 rounded-lg p-3 ${className}`}>
        <div className="flex items-center text-red-600">
          <span className="material-icons text-red-500 mr-2 text-sm">error</span>
          <p className="text-xs">Error loading mark scheme: {error}</p>
        </div>
      </div>
    );
  }

  // Early return if no mark scheme
  if (!markScheme || markScheme.length === 0) {
    return (
      <div className={`border border-gray-200 bg-gray-50 rounded-lg p-3 ${className}`}>
        <div className="flex items-center text-gray-600">
          <span className="material-icons text-gray-500 mr-2 text-sm">info</span>
          <p className="text-xs">No mark scheme data available yet.</p>
        </div>
      </div>
    );
  }

  // Get test info from first entry or context
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
          {testId && (
            <Badge variant="outline" className="text-xs">
              Test ID: {testId}
            </Badge>
          )}
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
          {!forceDirect && excelFile && (
            <span className="ml-2 text-green-600">• Fresh data from Excel</span>
          )}
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