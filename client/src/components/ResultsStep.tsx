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
import { FreshDetailedResults, generateFreshResults } from './FreshDetailedResults';

export default function ResultsStep() {
  const [exportingPdf, setExportingPdf] = useState(false);
  
  const { 
    testResult, 
    detailedResults, 
    setStep, 
    resetTestGrader,
    markScheme,
    excelFile,
    columnMap,
    capturedPages
  } = useTestGrader();
  
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
      
      // Get fresh student answers
      const studentAnswers = capturedPages.reduce<Record<string, string>>((acc: Record<string, string>, page: any) => {
        if (page.extractedAnswers) {
          return { ...acc, ...page.extractedAnswers };
        }
        return acc;
      }, {});
      
      // Generate fresh results using Excel file
      let tableData;
      
      if (excelFile && columnMap) {
        // Generate fresh results from Excel for better accuracy
        console.log("Generating fresh results for PDF export");
        const freshResults = await generateFreshResults(excelFile, columnMap, studentAnswers);
        
        tableData = freshResults.map((result: any) => [
          result.questionNumber,
          result.studentAnswer || '—',
          result.expectedAnswer || '—',
          `${result.earnedPoints}/${result.points}`,
          result.correct ? 'Correct' : 'Incorrect'
        ]);
        
        // Calculate totals for summary
        const totalPoints = freshResults.reduce((sum: number, r: any) => sum + r.points, 0);
        const earnedPoints = freshResults.reduce((sum: number, r: any) => sum + r.earnedPoints, 0);
        const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        
        // Create a new PDF document
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text('Test Results', 105, 15, { align: 'center' });
        
        // Add summary with fresh data
        doc.setFontSize(12);
        doc.text(`Score: ${scorePercentage}% (${earnedPoints}/${totalPoints} points)`, 105, 25, { align: 'center' });
        doc.setFontSize(10);
        doc.text('Generated with fresh Excel data', 105, 32, { align: 'center' });
        
        // Add detailed results table
        (doc as any).autoTable({
          head: [['Q #', 'Student Answer', 'Expected Answer', 'Points', 'Status']],
          body: tableData,
          startY: 38,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235] }
        });
        
        // Save the PDF
        doc.save('test-results.pdf');
      } else {
        // Fall back to stored results if Excel data isn't available
        console.log("Falling back to stored results for PDF export");
        
        // Create a new PDF document
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text('Test Results', 105, 15, { align: 'center' });
        
        // Add summary
        doc.setFontSize(12);
        doc.text(`Score: ${testResult?.scorePercentage}% (${testResult?.pointsEarned}/${testResult?.totalPoints} points)`, 105, 25, { align: 'center' });
        
        // Add detailed results table
        tableData = detailedResults.map((result: any) => [
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
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setExportingPdf(false);
    }
  }, [testResult, detailedResults, excelFile, columnMap, capturedPages]);
  
  // Handle sharing results
  const handleShare = useCallback(async () => {
    try {
      if (!navigator.share) {
        alert('Web Share API is not supported in your browser.');
        return;
      }
      
      // Try to get fresh results first if Excel file exists
      let shareText = '';
      
      if (excelFile && columnMap && capturedPages.length > 0) {
        // Gather student answers from all pages
        const studentAnswers = capturedPages.reduce<Record<string, string>>((acc: Record<string, string>, page: any) => {
          if (page.extractedAnswers) {
            return { ...acc, ...page.extractedAnswers };
          }
          return acc;
        }, {});
        
        // Generate fresh results
        const freshResults = await generateFreshResults(excelFile, columnMap, studentAnswers);
        
        // Calculate totals for sharing text
        const totalPoints = freshResults.reduce((sum: number, r: any) => sum + r.points, 0);
        const earnedPoints = freshResults.reduce((sum: number, r: any) => sum + r.earnedPoints, 0);
        const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        
        shareText = `Score: ${scorePercentage}% (${earnedPoints}/${totalPoints} points) [Fresh data]`;
      } else {
        // Fall back to stored results
        shareText = `Score: ${testResult?.scorePercentage}% (${testResult?.pointsEarned}/${testResult?.totalPoints} points)`;
      }
      
      // Generate PDF (will also generate new result data)
      await handleExportPDF();
      
      // Share the result text
      await navigator.share({
        title: 'Test Results',
        text: shareText,
        // files: [new File([blob], 'test-results.pdf', { type: 'application/pdf' })]
      });
    } catch (error) {
      console.error('Error sharing results:', error);
    }
  }, [testResult, handleExportPDF, excelFile, columnMap, capturedPages]);
  
  if (!testResult) {
    return (
      <div className="bg-white rounded-lg shadow-md p-5">
        {/* Mark Scheme Preview in empty state - using fresh Excel data */}
        <div className="mb-5">
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
      <div className="mb-5">
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
      
      {/* Fresh Detailed Results - using direct Excel file data */}
      <div className="mb-5">
        <FreshDetailedResults />
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
            onClick={handleExportPDF}
            disabled={exportingPdf}
            variant="secondary"
            className="bg-gray-800 hover:bg-gray-900 text-white"
          >
            {exportingPdf ? (
              <span className="material-icons animate-spin mr-1 text-sm">sync</span>
            ) : (
              <span className="material-icons mr-1 text-sm">download</span>
            )}
            Export PDF
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
