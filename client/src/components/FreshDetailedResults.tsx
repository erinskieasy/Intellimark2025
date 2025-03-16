import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useTestGrader } from '@/context/TestGraderContext';
import { parseExcelWithColumnMap } from '@/lib/utils';
import { MarkSchemeEntry } from '@/types';
import { DetailedResultItem } from '@/types';

// Export the generator function to be used by other components
export async function generateFreshResults(
  excelFile: File, 
  columnMap: any, 
  studentAnswers: Record<string, string>
): Promise<DetailedResultItem[]> {
  if (!excelFile || !columnMap || !studentAnswers || Object.keys(studentAnswers).length === 0) {
    return [];
  }
  
  // Parse mark scheme directly from Excel
  const markScheme = await parseExcelWithColumnMap(excelFile, columnMap) as MarkSchemeEntry[];
  
  // Generate detailed results by combining mark scheme with student answers
  const results: DetailedResultItem[] = markScheme.map(entry => {
    const questionNumber = entry.questionNumber;
    const studentAnswer = studentAnswers[questionNumber.toString()] || '';
    const expectedAnswer = entry.expectedAnswer;
    const points = entry.points;
    
    // Determine if the answer is correct
    const correct = studentAnswer.toLowerCase() === expectedAnswer.toLowerCase();
    
    // Calculate earned points
    const earnedPoints = correct ? points : 0;
    
    return {
      questionNumber,
      studentAnswer,
      expectedAnswer,
      points,
      earnedPoints,
      correct
    };
  });
  
  // Sort by question number
  results.sort((a, b) => a.questionNumber - b.questionNumber);
  
  return results;
}

interface FreshDetailedResultsProps {
  className?: string;
}

export function FreshDetailedResults({ className = '' }: FreshDetailedResultsProps) {
  const { 
    excelFile, 
    columnMap, 
    capturedPages,
    testResult
  } = useTestGrader();
  
  const [freshResults, setFreshResults] = useState<DetailedResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract all student answers from captured pages
  const studentAnswers = capturedPages.reduce<Record<string, string>>((acc, page) => {
    if (page.extractedAnswers) {
      return { ...acc, ...page.extractedAnswers };
    }
    return acc;
  }, {});

  // Generate fresh detailed results using Excel data and student answers when component mounts
  useEffect(() => {
    async function loadResults() {
      if (!excelFile || !columnMap || !studentAnswers || Object.keys(studentAnswers).length === 0) {
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Use the exported generator function
        const results = await generateFreshResults(excelFile, columnMap, studentAnswers);
        
        setFreshResults(results);
        console.log("FreshDetailedResults: Generated", results.length, "detailed result items");
      } catch (err) {
        console.error("Failed to generate fresh detailed results:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    }
    
    loadResults();
  }, [excelFile, columnMap, studentAnswers]);

  // Show loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary mr-2"></div>
        <p className="text-sm">Generating detailed results...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`border border-red-200 bg-red-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-red-600">
          <span className="material-icons text-red-500 mr-2">error</span>
          <p className="text-sm">Error generating detailed results: {error}</p>
        </div>
      </div>
    );
  }

  // Show empty state if no results
  if (freshResults.length === 0) {
    return (
      <div className={`border border-gray-200 bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-gray-600">
          <span className="material-icons text-gray-500 mr-2">info</span>
          <p className="text-sm">No detailed results available yet.</p>
        </div>
      </div>
    );
  }

  // Calculate summary statistics
  const totalQuestions = freshResults.length;
  const correctAnswers = freshResults.filter(r => r.correct).length;
  const totalPoints = freshResults.reduce((sum, r) => sum + r.points, 0);
  const earnedPoints = freshResults.reduce((sum, r) => sum + r.earnedPoints, 0);
  const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  // Full view with table of entries
  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      <div className="bg-gray-50 p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 flex items-center">
          Detailed Results
          <span className="ml-2 text-xs text-green-600">• Fresh data from Excel</span>
        </h3>
        <div className="mt-1 text-xs text-gray-500">
          {correctAnswers} of {totalQuestions} correct ({scorePercentage}%)
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q #</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Answer</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Answer</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {freshResults.map((result) => (
              <TableRow key={result.questionNumber} className={result.correct ? "bg-green-50" : "bg-red-50"}>
                <TableCell className="px-4 py-3 text-sm text-gray-900">{result.questionNumber}</TableCell>
                <TableCell className="px-4 py-3 text-sm font-medium text-gray-900">{result.studentAnswer || '—'}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-900">{result.expectedAnswer || '—'}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-900">{result.earnedPoints}/{result.points}</TableCell>
                <TableCell className="px-4 py-3">
                  {result.correct ? (
                    <span className="material-icons text-green-500">check_circle</span>
                  ) : (
                    <span className="material-icons text-red-500">cancel</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}