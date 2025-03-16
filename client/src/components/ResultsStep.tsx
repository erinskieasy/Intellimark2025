import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTestGrader } from '@/context/TestGraderContext';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { MarkSchemePreview } from './MarkSchemePreview';
import { useToast } from '@/hooks/use-toast';

import { useEffect } from 'react';

export default function ResultsStep() {
  const [exportingPdf, setExportingPdf] = useState(false);
  const { toast } = useToast();

  const { 
    testResult, 
    detailedResults, 
    setStep, 
    resetTestGrader,
    markScheme,
    clearCapturedPages,
    setTestResult,
    setDetailedResults,
    currentTest,
    setCurrentTest
  } = useTestGrader();

  // Fetch fresh results when component mounts or test result changes
  useEffect(() => {
    const fetchFreshResults = async () => {
      // If we don't have a test or the test result is null, we should reset detailed results
      if (!currentTest?.id || !testResult) {
        console.log('No currentTest or testResult, clearing detailed results');
        setDetailedResults([]);
        return;
      }

      try {
        console.log(`Fetching fresh detailed results for test ${currentTest.id}`);
        const detailedRes = await fetch(`/api/results/${currentTest.id}/detailed`, {
          credentials: 'include'
        });

        if (!detailedRes.ok) {
          console.error(`Error fetching detailed results: ${detailedRes.statusText}`);
          setDetailedResults([]);
          return;
        }

        const freshDetailedResults = await detailedRes.json();
        console.log(`Received ${freshDetailedResults.length} detailed results`);

        // Use a timeout to ensure React batch updates work correctly
        setTimeout(() => {
          setDetailedResults(freshDetailedResults);
        }, 0);
      } catch (error) {
        console.error('Error fetching fresh results:', error);
        setDetailedResults([]);
      }
    };

    fetchFreshResults();
  }, [currentTest, testResult, setDetailedResults]);

  // Handle back button
  const handleBack = useCallback(() => {
    setStep('process');
  }, [setStep]);

  // Handle new test button
  const handleNewTest = useCallback(() => {
    // Confirm before starting a new test
    if (confirm('Are you sure you want to start a new test? All current data will be lost.')) {
      resetTestGrader();
    }
  }, [resetTestGrader]);

  // Handle PDF export
  const handleExportPDF = useCallback(async () => {
    try {
      setExportingPdf(true);

      // Create a new PDF document
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.text('Test Results', 105, 15, { align: 'center' });

      // Add summary
      doc.setFontSize(12);
      doc.text(`Score: ${testResult?.scorePercentage}% (${testResult?.pointsEarned}/${testResult?.totalPoints} points)`, 105, 25, { align: 'center' });

      // Add detailed results table
      const tableData = detailedResults.map(result => [
        result.questionNumber,
        result.studentAnswer,
        result.expectedAnswer,
        `${result.earnedPoints}/${result.points}`,
        result.correct ? 'Correct' : 'Incorrect'
      ]);

      (doc as any).autoTable({
        head: [['Q #', 'Student Answer', 'Expected Answer', 'Points', 'Status']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }
      });

      // Save the PDF
      doc.save('test-results.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setExportingPdf(false);
    }
  }, [testResult, detailedResults]);

  // Handle sharing results
  const handleShare = useCallback(async () => {
    try {
      if (!navigator.share) {
        alert('Web Share API is not supported in your browser.');
        return;
      }

      const blob = await handleExportPDF();

      await navigator.share({
        title: 'Test Results',
        text: `Score: ${testResult?.scorePercentage}% (${testResult?.pointsEarned}/${testResult?.totalPoints} points)`,
        // files: [new File([blob], 'test-results.pdf', { type: 'application/pdf' })]
      });
    } catch (error) {
      console.error('Error sharing results:', error);
    }
  }, [testResult, handleExportPDF]);

  // Handle next paper button
  const handleNextPaper = useCallback(async () => {
    try {
      // Create a new test with same parameters as current test
      if (currentTest) {
        // Get existing mark scheme
        const markSchemeRes = await fetch(`/api/mark-scheme/${currentTest.id}`);
        const markScheme = await markSchemeRes.json();
        
        // Create new test
        const response = await fetch('/api/tests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: currentTest.name,
            totalQuestions: currentTest.totalQuestions,
            totalPoints: currentTest.totalPoints
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create new test');
        }

        const newTest = await response.json();
        
        // Copy mark scheme to new test
        if (markScheme && markScheme.length > 0) {
          const formData = new FormData();
          formData.append('testId', newTest.id.toString());
          formData.append('markSchemeData', JSON.stringify(markScheme));
          
          await fetch('/api/mark-scheme', {
            method: 'POST',
            body: formData
          });
        }
        
        setCurrentTest(newTest);
      }

      // Clear captured pages and reset processing state
      clearCapturedPages();

      // Force reset of results state
      setTestResult(null);
      setDetailedResults([]);

      toast({
        title: 'Ready for next paper',
        description: 'New test created and previous results cleared.'
      });

      // Navigate to capture page
      setStep('capture');
    } catch (error) {
      console.error('Error creating new test:', error);
      toast({
        title: 'Error',
        description: 'Failed to setup next paper. Please try again.',
        variant: 'destructive'
      });
    }
  }, [currentTest, clearCapturedPages, setCurrentTest, setTestResult, setDetailedResults, setStep, toast]);

  if (!testResult) {
    return (
      <div className="bg-white rounded-lg shadow-md p-5">
        {/* Mark Scheme Preview in empty state - using fresh Excel data */}
        <div className="mb-5 hidden">
          <MarkSchemePreview />
        </div>

        <div className="text-center py-8">
          <span className="material-icons text-4xl text-yellow-500 mb-2">warning</span>
          <h3 className="text-base font-medium text-gray-800 mb-1">No Results Available</h3>
          <p className="text-sm text-gray-600 mb-4">
            There are no test results to display. Please go back and process your answer sheets.
          </p>
          <Button onClick={handleBack}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Student Results</h2>
        <Button 
          variant="ghost" 
          className="text-primary hover:text-primary-dark focus:outline-none"
          onClick={handleShare}
        >
          <span className="material-icons mr-1 text-sm">share</span>
          Share
        </Button>
      </div>

      {/* Mark Scheme Preview - using fresh Excel data */}
      <div className="mb-5 hidden">
        <MarkSchemePreview />
      </div>

      {/* Score Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-medium text-gray-800">Final Score</h3>
          <span className="text-2xl font-bold text-primary">{testResult.scorePercentage}%</span>
        </div>
        <div className="flex items-center">
          <div className="flex-grow mr-3">
            <Progress value={testResult.scorePercentage} className="h-2" />
          </div>
          <div className="text-sm font-medium text-gray-700">
            <span>{testResult.pointsEarned}</span>/<span>{testResult.totalPoints}</span> pts
          </div>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="mb-5">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Detailed Results</h3>
          </div>
          <div className="overflow-x-auto">
            <Table key={`results-table-${detailedResults.length}-${Date.now()}`}>
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
                {detailedResults && detailedResults.length > 0 ? (
                  detailedResults.map((result) => (
                    <TableRow key={`row-${result.questionNumber}`}>
                      <TableCell className="px-4 py-3 text-sm text-gray-900">{result.questionNumber}</TableCell>
                      <TableCell className={`px-4 py-3 text-sm ${result.correct ? 'text-green-600 font-medium' : 'text-gray-900'}`}>{result.studentAnswer}</TableCell>
                      <TableCell className={`px-4 py-3 text-sm ${result.correct ? 'text-green-600 font-medium' : 'text-gray-900'}`}>{result.expectedAnswer}</TableCell>
                      <TableCell className={`px-4 py-3 text-sm ${result.correct ? 'text-green-600 font-medium' : 'text-gray-900'}`}>{result.earnedPoints}/{result.points}</TableCell>
                      <TableCell className="px-4 py-3">
                        {result.correct ? (
                          <span className="material-icons text-green-600">check_circle</span>
                        ) : (
                          <span className="material-icons text-error">cancel</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="px-4 py-3 text-sm text-gray-900 text-center">
                      No detailed results available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button
          onClick={handleBack}
          variant="outline"
          className="border border-gray-300 hover:bg-gray-50 text-gray-700"
        >
          <span className="material-icons mr-1">arrow_back</span>
          Back
        </Button>
        <div className="flex space-x-3">
          <Button
            onClick={handleNextPaper}
            variant="secondary"
            className="bg-gray-800 hover:bg-gray-900 text-white"
          >
            <span className="material-icons mr-1 text-sm">add_a_photo</span>
            Next Paper
          </Button>
          <Button
            onClick={handleNewTest}
            className="bg-primary hover:bg-primary-dark text-white"
          >
            <span className="material-icons mr-1 text-sm">add</span>
            New Test
          </Button>
        </div>
      </div>
    </div>
  );
}