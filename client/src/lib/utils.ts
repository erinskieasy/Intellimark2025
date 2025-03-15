import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { markSchemeRowSchema } from '@shared/schema';

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
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Validate and normalize data
        const markSchemeData = jsonData.map((row: any, index) => {
          // Try to find expected column names or variations
          const questionNumber = row['Question Number'] || row['QuestionNumber'] || row['Question'] || row['Q#'] || row['Q'] || (index + 1);
          const expectedAnswer = row['Expected Answer'] || row['ExpectedAnswer'] || row['Answer'] || row['Correct Answer'] || row['CorrectAnswer'];
          const points = row['Question Points'] || row['QuestionPoints'] || row['Points'] || row['Mark'] || row['Marks'] || row['Score'] || 1;
          
          // Validate the extracted data
          try {
            return markSchemeRowSchema.parse({
              questionNumber: typeof questionNumber === 'number' ? questionNumber : parseInt(questionNumber),
              expectedAnswer: String(expectedAnswer).trim(),
              points: typeof points === 'number' ? points : parseInt(points)
            });
          } catch (error) {
            throw new Error(`Row ${index + 1} has invalid data: ${error instanceof Error ? error.message : String(error)}`);
          }
        });
        
        resolve(markSchemeData);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
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
