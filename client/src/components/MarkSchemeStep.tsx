import React, { useState, useCallback, useEffect } from 'react';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/file-input';
import { useTestGrader } from '@/context/TestGraderContext';
import { useTestGraderActions } from '@/hooks/use-test-grader';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { parseExcelForPreview, parseExcelWithColumnMap } from '@/lib/utils';
import { ExcelColumnMap } from '@shared/schema';

export default function MarkSchemeStep() {
  const [file, setFile] = useState<File | null>(null);
  const [createTestDialogOpen, setCreateTestDialogOpen] = useState(false);
  const [testName, setTestName] = useState('');
  
  const { toast } = useToast();
  const { markScheme, currentTest, setStep } = useTestGrader();
  const { 
    uploadMarkSchemeMutation, 
    createTestMutation, 
    excelParseError,
    testMarkScheme 
  } = useTestGraderActions();
  
  // If we have testMarkScheme from the server, use it
  useEffect(() => {
    if (testMarkScheme && testMarkScheme.length > 0) {
      // Mark scheme is loaded from the server
    }
  }, [testMarkScheme]);
  
  // Handle file change
  const handleFileChange = useCallback((file: File | null) => {
    setFile(file);
  }, []);
  
  // Handle file error
  const handleFileError = useCallback((error: string) => {
    toast({
      title: 'File Upload Error',
      description: error,
      variant: 'destructive'
    });
  }, [toast]);
  
  // Handle create test dialog
  const handleCreateTest = useCallback(() => {
    if (!testName) {
      toast({
        title: 'Test Name Required',
        description: 'Please enter a name for the test.',
        variant: 'destructive'
      });
      return;
    }
    
    createTestMutation.mutate({
      name: testName,
      totalQuestions: 0, // Will be updated after mark scheme upload
      totalPoints: 0     // Will be updated after mark scheme upload
    });
    
    setCreateTestDialogOpen(false);
  }, [testName, createTestMutation, toast]);
  
  // Handle upload mark scheme
  const handleUploadMarkScheme = useCallback(() => {
    if (!file) {
      toast({
        title: 'File Required',
        description: 'Please select an Excel file to upload.',
        variant: 'destructive'
      });
      return;
    }
    
    if (!currentTest) {
      setCreateTestDialogOpen(true);
      return;
    }
    
    uploadMarkSchemeMutation.mutate({
      file,
      testId: currentTest.id!
    });
  }, [file, currentTest, uploadMarkSchemeMutation, toast]);
  
  // Handle delete file
  const handleDeleteFile = useCallback(() => {
    setFile(null);
  }, []);
  
  // Handle next button
  const handleNextStep = useCallback(() => {
    setStep('capture');
  }, [setStep]);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Mark Scheme</h2>
      <p className="text-sm text-gray-600 mb-5">
        Please upload an Excel spreadsheet containing your mark scheme with the following columns: 
        Question Number, Expected Answer, and Question Points.
      </p>
      
      {/* File Uploader */}
      {!file && (
        <FileInput
          onChange={handleFileChange}
          onError={handleFileError}
          accept=".xlsx,.xls"
          className="mb-6"
          acceptText="Supported format: .xlsx"
        />
      )}
      
      {/* Excel Preview */}
      {file && (
        <div className="mb-4">
          <div className="mb-4 flex items-center">
            <span className="material-icons text-success mr-2">check_circle</span>
            <span className="text-sm font-medium text-gray-700">{file.name}</span>
            <button 
              onClick={handleDeleteFile}
              className="ml-auto text-red-500 hover:text-red-600"
            >
              <span className="material-icons">delete</span>
            </button>
          </div>
          
          {excelParseError ? (
            <div className="border border-red-200 bg-red-50 rounded-lg p-4 mb-5">
              <h3 className="text-sm font-medium text-red-800 mb-1">Error parsing Excel file</h3>
              <p className="text-xs text-red-600">{excelParseError}</p>
            </div>
          ) : markScheme.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-5">
              <div className="bg-gray-50 p-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700">Preview</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q #</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Answer</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {markScheme.map((item) => (
                      <TableRow key={item.questionNumber}>
                        <TableCell className="px-4 py-2 text-sm text-gray-900">{item.questionNumber}</TableCell>
                        <TableCell className="px-4 py-2 text-sm text-gray-900">{item.expectedAnswer}</TableCell>
                        <TableCell className="px-4 py-2 text-sm text-gray-900">{item.points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleUploadMarkScheme}
              className="w-full"
              disabled={uploadMarkSchemeMutation.isPending}
            >
              {uploadMarkSchemeMutation.isPending ? (
                <>
                  <span className="material-icons animate-spin mr-1">sync</span>
                  Processing...
                </>
              ) : (
                'Parse Mark Scheme'
              )}
            </Button>
          )}
        </div>
      )}
      
      <div className="flex justify-end">
        <Button 
          id="nextToCapture" 
          onClick={handleNextStep}
          disabled={markScheme.length === 0}
          className="bg-primary hover:bg-primary-dark text-white py-2 px-6 rounded-md text-sm font-medium transition-colors flex items-center"
        >
          Next
          <span className="material-icons ml-1">arrow_forward</span>
        </Button>
      </div>
      
      {/* Create Test Dialog */}
      <Dialog open={createTestDialogOpen} onOpenChange={setCreateTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Test</DialogTitle>
            <DialogDescription>
              Enter a name for the new test.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="test-name">Test Name</Label>
            <Input 
              id="test-name" 
              value={testName} 
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g., Biology Midterm"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTest} disabled={createTestMutation.isPending}>
              {createTestMutation.isPending ? 'Creating...' : 'Create & Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
