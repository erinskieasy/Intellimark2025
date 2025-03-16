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
import { ExcelColumnMap, markSchemeRowSchema } from '@shared/schema';
import { MarkSchemeEntry } from '@/types';

export default function MarkSchemeStep() {
  // State hooks
  const [file, setFile] = useState<File | null>(null);
  const [createTestDialogOpen, setCreateTestDialogOpen] = useState(false);
  const [testName, setTestName] = useState('');
  const [columnMappingDialogOpen, setColumnMappingDialogOpen] = useState(false);
  const [columnMapping, setColumnMapping] = useState<ExcelColumnMap | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Access hooks
  const { toast } = useToast();
  const { 
    markScheme, 
    currentTest, 
    setStep,
    excelFile,
    excelPreviewData,
    excelColumns,
    setExcelFile,
    setExcelPreviewData,
    setExcelColumns,
    setColumnMap,
    setMarkScheme
  } = useTestGrader();
  const { 
    uploadMarkSchemeMutation, 
    createTestMutation, 
    excelParseError,
    testMarkScheme 
  } = useTestGraderActions();

  // If we have testMarkScheme from the server, use it
  useEffect(() => {
    if (testMarkScheme && Array.isArray(testMarkScheme) && testMarkScheme.length > 0) {
      // Mark scheme is loaded from the server
    }
  }, [testMarkScheme]);

  // Handle file change and parse Excel for preview
  const handleFileChange = useCallback(async (uploadedFile: File | null) => {
    setFile(uploadedFile);
    setExcelFile(uploadedFile);

    if (uploadedFile) {
      try {
        setIsPreviewLoading(true);
        const { data, columns } = await parseExcelForPreview(uploadedFile);
        setExcelPreviewData(data);
        setExcelColumns(columns);
        setIsPreviewLoading(false);

        // Open column mapping dialog if we have columns
        if (columns.length > 0) {
          // Initialize empty column mapping - make sure it's completely empty
          const emptyMapping: ExcelColumnMap = {
            questionNumberCol: '',
            expectedAnswerCol: '',
            pointsCol: ''
          };

          // Log the columns we found
          console.log("Excel file column detection: Found columns:", columns);

          // Set the empty mapping
          setColumnMapping(emptyMapping);

          setColumnMappingDialogOpen(true);
        }
      } catch (error) {
        setIsPreviewLoading(false);
        toast({
          title: 'Excel Preview Error',
          description: error instanceof Error ? error.message : String(error),
          variant: 'destructive'
        });
      }
    }
  }, [setExcelFile, setExcelPreviewData, setExcelColumns, toast]);

  // Handle file error
  const handleFileError = useCallback((error: string) => {
    toast({
      title: 'File Upload Error',
      description: error,
      variant: 'destructive'
    });
  }, [toast]);

  // Initialize column mapping with best guesses based on column names
  const initializeEmptyColumnMapping = useCallback(() => {
    // Log available columns for debugging
    console.log("Available columns for mapping:", excelColumns);

    // Try to find column names that are likely to contain the right data
    // This is just a convenience feature - the user can still select different columns
    let questionCol = '';
    let answerCol = '';
    let pointsCol = '';

    // Search for common patterns in column names
    for (const col of excelColumns) {
      const lowerCol = col.toLowerCase();

      // Check for question number columns
      if (
        lowerCol === 'question_number' ||
        lowerCol === 'question number' ||
        lowerCol === 'questionno' ||
        lowerCol === 'question' ||
        lowerCol === 'q#' ||
        lowerCol === 'question#' ||
        lowerCol === 'qnumber' ||
        lowerCol === 'q' ||
        lowerCol.includes('question') && lowerCol.includes('number')
      ) {
        questionCol = col;
      }

      // Check for answer columns
      if (
        lowerCol === 'expected_answer' ||
        lowerCol === 'expected answer' ||
        lowerCol === 'answer' ||
        lowerCol === 'answers' ||
        lowerCol === 'correct answer' ||
        lowerCol === 'correct_answer' ||
        lowerCol === 'solution' ||
        lowerCol.includes('answer')
      ) {
        answerCol = col;
      }

      // Check for points columns
      if (
        lowerCol === 'points' ||
        lowerCol === 'point' ||
        lowerCol === 'marks' ||
        lowerCol === 'mark' ||
        lowerCol === 'score' ||
        lowerCol === 'scores' ||
        lowerCol === 'value' ||
        lowerCol === 'worth' ||
        lowerCol.includes('point') ||
        lowerCol.includes('mark')
      ) {
        pointsCol = col;
      }
    }

    // Create the mapping object based on what we found (possibly empty strings)
    const mapping: ExcelColumnMap = {
      questionNumberCol: questionCol,
      expectedAnswerCol: answerCol,
      pointsCol: pointsCol
    };

    console.log("Initialized column mapping with suggestions:", mapping);

    // Set the mapping
    setColumnMapping(mapping);

    // Notify user they need to verify and possibly update the columns
    toast({
      title: "Column Mapping",
      description: "Please verify the suggested column mappings and make changes if needed.",
      variant: "default"
    });
  }, [excelColumns, toast]);

  // Handle column selection
  const handleColumnSelect = useCallback((field: keyof ExcelColumnMap, value: string) => {
    // Skip the "_none" placeholder value
    if (value === "_none") return;

    setColumnMapping((prev) => ({
      ...(prev || { questionNumberCol: '', expectedAnswerCol: '', pointsCol: '' }),
      [field]: value
    }));
  }, []);

  // Handle column mapping confirmation
  const handleColumnMappingConfirm = useCallback(async () => {
    if (!columnMapping || !file) {
      toast({
        title: 'Column Mapping Required',
        description: 'Please select columns for all fields.',
        variant: 'destructive'
      });
      return;
    }

    // Check if all required columns are selected
    if (!columnMapping.questionNumberCol || !columnMapping.expectedAnswerCol || !columnMapping.pointsCol) {
      toast({
        title: 'Column Mapping Incomplete',
        description: 'Please select columns for all required fields.',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log("Confirming column mapping:", JSON.stringify(columnMapping, null, 2));

      // Save the column mapping to global context
      setColumnMap(columnMapping);

      if (!currentTest) {
        setColumnMappingDialogOpen(false);
        setCreateTestDialogOpen(true);
        return;
      }

      // Parse Excel with the column mapping and immediately use the parsed data
      try {
        const parsedData = await parseExcelWithColumnMap(file, columnMapping) as MarkSchemeEntry[];
        console.log("Successfully parsed Excel data:", parsedData);

        if (!parsedData || parsedData.length === 0) {
          throw new Error("No valid data was parsed from the Excel file.");
        }

        // Store the parsed data directly in the context 
        // This skips the server roundtrip and potential issues
        setMarkScheme(parsedData);

        // Still send to server for storage, but don't depend on response for UI
        try {
          // Create a FormData object to send to the server
          const formData = new FormData();
          formData.append('file', file);
          formData.append('testId', currentTest.id!.toString());
          formData.append('markSchemeData', JSON.stringify(parsedData));

          // Send the FormData to the server in the background
          const response = await fetch('/api/mark-scheme', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            console.warn("Server storage failed, but we're still using the data:", await response.text());
          } else {
            console.log("Successfully stored mark scheme on server");
          }
        } catch (serverError) {
          console.warn("Error storing on server, but we're still using the parsed data:", serverError);
        }

        setColumnMappingDialogOpen(false);

        toast({
          title: 'Mark Scheme Loaded',
          description: `${parsedData.length} questions loaded successfully.`,
        });
      } catch (parseError) {
        console.error("Error parsing Excel with column mapping:", parseError);
        toast({
          title: 'Parsing Error',
          description: parseError instanceof Error ? parseError.message : String(parseError),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error("General error in column mapping confirmation:", error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive'
      });
    }
  }, [columnMapping, file, currentTest, setColumnMap, setMarkScheme, toast]);

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

      {columnMapping && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md mb-4">
          <h4 className="text-sm font-medium mb-2">Current Column Mapping:</h4>
          <pre className="text-xs">
            questionNumberCol: {columnMapping.questionNumberCol || 'none'}{'\n'}
            expectedAnswerCol: {columnMapping.expectedAnswerCol || 'none'}{'\n'}
            pointsCol: {columnMapping.pointsCol || 'none'}
          </pre>
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

      {/* Column Mapping Dialog */}
      <Dialog open={columnMappingDialogOpen} onOpenChange={setColumnMappingDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map Excel Columns</DialogTitle>
            <DialogDescription>
              <p className="mb-1">
                Manual column mapping is required - please select which columns in your Excel file 
                correspond to the question number, expected answer, and points.
              </p>
              <p className="text-xs text-yellow-600">
                Note: You can click the "Auto-Detect Columns" button below to try to automatically identify 
                columns based on their names, but you'll need to verify the selections.
              </p>
            </DialogDescription>
            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={initializeEmptyColumnMapping}
                className="w-full"
              >
                <span className="material-icons mr-1">auto_fix_high</span>
                Auto-Detect Columns
              </Button>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Preview table */}
            {isPreviewLoading ? (
              <div className="flex items-center justify-center p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading preview...</span>
              </div>
            ) : excelPreviewData.length > 0 ? (
              <div className="border rounded-md overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {excelColumns.map((column) => (
                        <TableHead key={column} className="px-4 py-2 text-xs font-medium">
                          {column}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {excelPreviewData.slice(0, 5).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {excelColumns.map((column) => (
                          <TableCell key={`${rowIndex}-${column}`} className="px-4 py-2 text-xs">
                            {row[column] !== undefined ? String(row[column]) : ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No preview data available</div>
            )}

            {/* Column mapping fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="question-column">Question Number Column</Label>
                <Select 
                  onValueChange={(value) => handleColumnSelect('questionNumberCol', value)}
                  value={columnMapping?.questionNumberCol || '_none'}
                >
                  <SelectTrigger id="question-column">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select column</SelectItem>
                    {excelColumns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="answer-column">Expected Answer Column</Label>
                <Select 
                  onValueChange={(value) => handleColumnSelect('expectedAnswerCol', value)}
                  value={columnMapping?.expectedAnswerCol || '_none'}
                >
                  <SelectTrigger id="answer-column">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select column</SelectItem>
                    {excelColumns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="points-column">Points Column</Label>
                <Select 
                  onValueChange={(value) => handleColumnSelect('pointsCol', value)}
                  value={columnMapping?.pointsCol || '_none'}
                >
                  <SelectTrigger id="points-column">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select column</SelectItem>
                    {excelColumns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium mb-2">Current Column Mapping:</h4>
            <pre className="text-xs">
              questionNumberCol: {columnMapping?.questionNumberCol || 'none'}{'\n'}
              expectedAnswerCol: {columnMapping?.expectedAnswerCol || 'none'}{'\n'}
              pointsCol: {columnMapping?.pointsCol || 'none'}
            </pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setColumnMappingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleColumnMappingConfirm}>
              Confirm Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}