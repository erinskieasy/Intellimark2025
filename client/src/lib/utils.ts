import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { markSchemeRowSchema, ExcelPreviewRow, ExcelColumnMap } from '@shared/schema';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse an Excel file containing a mark scheme
 * @param file Excel file to parse
 * @returns Parsed mark scheme data
 */
export async function parseExcelMarkScheme(file: File) {
  return new Promise((resolve, reject) => {
    // Instead of auto-detecting columns, we now direct users to the column mapping interface
    reject(new Error('Please use the column mapping interface to select which columns contain question numbers, answers, and points.'));
  });
}

/**
 * Format a date for display
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date);
}

/**
 * Convert a data URL to a Blob
 * @param dataUrl Data URL to convert
 * @returns Blob object
 */
export function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}

/**
 * Check if we're running on a mobile device
 * @returns True if on a mobile device
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Parse an Excel file for preview before mapping columns
 * @param file Excel file to parse
 * @returns Preview of Excel data for column mapping
 */
export async function parseExcelForPreview(file: File): Promise<{
  data: ExcelPreviewRow[];
  columns: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with default empty values
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as ExcelPreviewRow[];
        
        // Log the preview data for debugging
        console.log("Excel preview data (first 5 rows):", JSON.stringify(jsonData.slice(0, 5), null, 2));
        
        // Extract column headers
        const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
        console.log("Detected columns:", columns);
        
        // Clean up the data before returning
        const cleanData = jsonData.slice(0, 5).map(row => {
          const cleanRow: ExcelPreviewRow = {};
          
          // Convert all values to strings for display consistency
          Object.entries(row).forEach(([key, value]) => {
            if (value === undefined || value === null) {
              cleanRow[key] = "";
            } else if (typeof value === 'object') {
              cleanRow[key] = JSON.stringify(value);
            } else {
              cleanRow[key] = String(value);
            }
          });
          
          return cleanRow;
        });
        
        resolve({
          data: cleanData, // Return cleaned first 5 rows for preview
          columns
        });
      } catch (error) {
        console.error("Excel preview error:", error);
        reject(new Error(`Failed to parse Excel file for preview: ${error instanceof Error ? error.message : String(error)}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse an Excel file containing a mark scheme using column mapping
 * @param file Excel file to parse
 * @param columnMap Map of column names to fields
 * @returns Parsed mark scheme data
 */
export async function parseExcelWithColumnMap(file: File, columnMap: ExcelColumnMap) {
  return new Promise<any[]>((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        // Validate column map first
        if (!columnMap.questionNumberCol || !columnMap.expectedAnswerCol || !columnMap.pointsCol) {
          console.error("Invalid column mapping", columnMap);
          reject(new Error("Column mapping is incomplete. Please select all required columns."));
          return;
        }
        
        console.log("Using column mapping:", JSON.stringify(columnMap, null, 2));
        
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with explicit header mapping
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, any>[];
        
        if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
          reject(new Error("No data found in Excel file or data format is invalid."));
          return;
        }
        
        console.log("Raw Excel JSON data (first 3 rows):", JSON.stringify(jsonData.slice(0, 3), null, 2));
        
        // Check that the selected columns exist in the data
        const firstRow = jsonData[0];
        const columnsExist = [
          columnMap.questionNumberCol in firstRow,
          columnMap.expectedAnswerCol in firstRow,
          columnMap.pointsCol in firstRow
        ];
        
        if (!columnsExist[0] || !columnsExist[1] || !columnsExist[2]) {
          console.error("One or more selected columns don't exist in the data:", {
            questionNumberExists: columnsExist[0],
            expectedAnswerExists: columnsExist[1],
            pointsExists: columnsExist[2],
            availableColumns: Object.keys(firstRow)
          });
          reject(new Error(`One or more selected columns don't exist in the Excel file. Available columns: ${Object.keys(firstRow).join(', ')}`));
          return;
        }
        
        // Validate and normalize data using the column mapping
        const markSchemeData = jsonData.map((row, index) => {
          // Extract values directly from the row using the column mapping
          let questionNumber = row[columnMap.questionNumberCol];
          let expectedAnswer = row[columnMap.expectedAnswerCol];
          let points = row[columnMap.pointsCol] || 1; // Default to 1 point if not specified

          console.log(`Row ${index + 1} raw values:`, {
            questionNumber,
            expectedAnswer,
            points
          });
          
          // Force conversion for question number
          if (questionNumber === undefined || questionNumber === null) {
            console.warn(`Warning: Row ${index + 1} has missing question number, using index + 1`);
            questionNumber = index + 1;
          }
          
          // Special handling for expected answer
          if (expectedAnswer === undefined || expectedAnswer === null) {
            console.warn(`Warning: Row ${index + 1} has undefined or null answer, using empty string`);
            expectedAnswer = "";
          } else if (expectedAnswer === "undefined" || String(expectedAnswer).toLowerCase() === "undefined") {
            console.warn(`Warning: Row ${index + 1} has literal "undefined" string, using empty string`);
            expectedAnswer = "";
          } else if (expectedAnswer === "") {
            console.log(`Row ${index + 1} has empty answer, that's ok for blank answers`);
          } else {
            // Normalize letter answers to uppercase for consistency
            const answerStr = String(expectedAnswer).trim();
            if (/^[A-Za-z]$/.test(answerStr)) {
              expectedAnswer = answerStr.toUpperCase();
              console.log(`Normalized answer from "${answerStr}" to "${expectedAnswer}"`);
            } else {
              expectedAnswer = answerStr;
            }
          }
          
          // Force conversion for points
          if (points === undefined || points === null || points === "") {
            console.warn(`Warning: Row ${index + 1} has undefined points, using default 1`);
            points = 1;
          }
          
          // Create a validated object
          try {
            // Convert types as needed before validation
            const convertedData = {
              questionNumber: typeof questionNumber === 'number' ? 
                questionNumber : 
                parseInt(String(questionNumber).replace(/\D/g, '') || `${index + 1}`), // Strip non-digits for better number parsing
              expectedAnswer: String(expectedAnswer || ""), // Convert to string even if undefined
              points: typeof points === 'number' ? 
                points : 
                (parseInt(String(points).replace(/\D/g, '') || "1") || 1) // Strip non-digits, default to 1
            };
            
            console.log(`Row ${index + 1} converted:`, convertedData);
            
            return markSchemeRowSchema.parse(convertedData);
          } catch (error) {
            console.error(`Row ${index + 1} validation error:`, error);
            throw new Error(`Row ${index + 1} has invalid data: ${error instanceof Error ? error.message : String(error)}`);
          }
        });
        
        // Log the final processed data
        console.log("Final processed mark scheme data (first 3 entries):", 
          JSON.stringify(markSchemeData.slice(0, 3), null, 2));
        
        // Final validation: check if we got any data
        if (!markSchemeData || markSchemeData.length === 0) {
          reject(new Error("No valid data could be parsed from the Excel file."));
          return;
        }
        
        resolve(markSchemeData);
      } catch (error) {
        console.error("Failed to parse Excel file:", error);
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}