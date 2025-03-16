import { 
  MarkSchemeEntry, InsertMarkSchemeEntry, 
  Test, InsertTest, 
  Page, InsertPage, 
  Result, InsertResult, 
  Settings, InsertSettings,
  resultItemSchema,
  markSchemeRowSchema,
  ResultItem,
  MarkSchemeRow
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // Mark scheme operations
  getMarkScheme(testId: number): Promise<MarkSchemeEntry[]>;
  addMarkSchemeEntry(entry: InsertMarkSchemeEntry): Promise<MarkSchemeEntry>;
  addMarkSchemeEntries(entries: InsertMarkSchemeEntry[]): Promise<MarkSchemeEntry[]>;
  
  // Test operations
  createTest(test: InsertTest): Promise<Test>;
  getTest(id: number): Promise<Test | undefined>;
  getAllTests(): Promise<Test[]>;
  
  // Page operations
  addPage(page: InsertPage): Promise<Page>;
  getPages(testId: number): Promise<Page[]>;
  updatePageProcessed(id: number, processed: boolean, extractedAnswers?: Record<string, string>): Promise<Page>;
  
  // Results operations
  addResult(result: InsertResult): Promise<Result>;
  getResult(testId: number): Promise<Result | undefined>;
  getDetailedResults(testId: number): Promise<ResultItem[]>;
  
  // Settings operations
  getSettings(): Promise<Settings>;
  updateSettings(settings: Partial<InsertSettings>): Promise<Settings>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private markSchemeEntries: Map<number, MarkSchemeEntry>;
  private tests: Map<number, Test>;
  private pages: Map<number, Page>;
  private results: Map<number, Result>;
  private settings: Settings;
  
  private currentMarkSchemeEntryId: number;
  private currentTestId: number;
  private currentPageId: number;
  private currentResultId: number;
  
  constructor() {
    this.markSchemeEntries = new Map();
    this.tests = new Map();
    this.pages = new Map();
    this.results = new Map();
    
    this.currentMarkSchemeEntryId = 1;
    this.currentTestId = 1;
    this.currentPageId = 1;
    this.currentResultId = 1;
    
    // Initialize default settings
    this.settings = {
      id: 1,
      answerRecognitionInstructions: "The student has tickets in the correct letter replacing that letter with a tick so whatever letter is missing from the list ABCD that's the answer they have selected that's what you return as their answer. For example A✓CD means they have selected B as their answer",
      enhancedRecognition: true,
      confidenceThreshold: 21,
      temperature: 0.1,
      topP: 1
    };
  }
  
  // Mark scheme operations
  async getMarkScheme(testId: number): Promise<MarkSchemeEntry[]> {
    const entries = Array.from(this.markSchemeEntries.values())
      .filter(entry => entry.testId === testId)
      .sort((a, b) => a.questionNumber - b.questionNumber);
    
    // DEBUG: Detailed logging of mark scheme
    console.log("Mark Scheme retrieved:", JSON.stringify(entries, null, 2));
    return entries;
  }
  
  async addMarkSchemeEntry(entry: InsertMarkSchemeEntry): Promise<MarkSchemeEntry> {
    const id = this.currentMarkSchemeEntryId++;
    
    // Ensure expectedAnswer is a string and handle the 'undefined' string case
    let expectedAnswer = String(entry.expectedAnswer || "").trim();
    
    // Special case: if the string is literally "undefined", make it an empty string
    if (expectedAnswer.toLowerCase() === "undefined") {
      console.warn(`Storage: Found literal "undefined" string for Q${entry.questionNumber}, replacing with empty string`);
      expectedAnswer = "";
    }
    
    const sanitizedEntry = {
      ...entry,
      expectedAnswer: expectedAnswer,
    };
    
    const newEntry: MarkSchemeEntry = { ...sanitizedEntry, id };
    this.markSchemeEntries.set(id, newEntry);
    
    console.log(`Added mark scheme entry: Q${newEntry.questionNumber}, Answer: "${newEntry.expectedAnswer}", Points: ${newEntry.points}`);
    console.log(`  expectedAnswer type: ${typeof expectedAnswer}`);
    console.log(`  expectedAnswer empty?: ${expectedAnswer === ""}`);
    
    return newEntry;
  }
  
  async addMarkSchemeEntries(entries: InsertMarkSchemeEntry[]): Promise<MarkSchemeEntry[]> {
    const results = await Promise.all(entries.map(entry => this.addMarkSchemeEntry(entry)));
    console.log(`Added ${results.length} mark scheme entries`);
    return results;
  }
  
  // Test operations
  async createTest(test: InsertTest): Promise<Test> {
    const id = this.currentTestId++;
    const newTest: Test = { ...test, id };
    this.tests.set(id, newTest);
    console.log(`Created new test: ${newTest.name}, ID: ${newTest.id}`);
    return newTest;
  }
  
  async getTest(id: number): Promise<Test | undefined> {
    return this.tests.get(id);
  }
  
  async getAllTests(): Promise<Test[]> {
    return Array.from(this.tests.values());
  }
  
  // Page operations
  async addPage(page: InsertPage): Promise<Page> {
    const id = this.currentPageId++;
    const newPage: Page = { 
      ...page, 
      id, 
      processed: false, 
      extractedAnswers: {} 
    };
    this.pages.set(id, newPage);
    console.log(`Added page ${newPage.pageNumber} for test ${newPage.testId}`);
    return newPage;
  }
  
  async getPage(id: number): Promise<Page> {
    const page = this.pages.get(id);
    if (!page) {
      throw new Error(`Page with id ${id} not found`);
    }
    return page;
  }
  
  async getPages(testId: number): Promise<Page[]> {
    const allPages = Array.from(this.pages.values());
    
    // If testId is 0 or negative, return all pages
    if (testId <= 0) {
      return allPages;
    }
    
    // Otherwise, filter by testId and sort by page number
    return allPages
      .filter(page => page.testId === testId)
      .sort((a, b) => a.pageNumber - b.pageNumber);
  }
  
  async updatePageProcessed(id: number, processed: boolean, extractedAnswers?: Record<string, string>): Promise<Page> {
    const page = this.pages.get(id);
    if (!page) {
      throw new Error(`Page with id ${id} not found`);
    }
    
    const updatedPage: Page = { 
      ...page, 
      processed,
      extractedAnswers: extractedAnswers || page.extractedAnswers
    };
    
    this.pages.set(id, updatedPage);
    console.log(`Updated page ${id} processed status to ${processed}`);
    if (extractedAnswers) {
      console.log(`Extracted answers:`, JSON.stringify(extractedAnswers, null, 2));
    }
    return updatedPage;
  }
  
  // Results operations
  async addResult(result: InsertResult): Promise<Result> {
    const id = this.currentResultId++;
    const newResult: Result = { ...result, id };
    this.results.set(id, newResult);
    console.log("Added result:", JSON.stringify(newResult, null, 2));
    return newResult;
  }
  
  async getResult(testId: number): Promise<Result | undefined> {
    const result = Array.from(this.results.values()).find(result => result.testId === testId);
    console.log(`Retrieved result for test ${testId}:`, result ? JSON.stringify(result, null, 2) : "No result found");
    return result;
  }
  
  async getDetailedResults(testId: number): Promise<ResultItem[]> {
    const result = await this.getResult(testId);
    if (!result) {
      console.log(`No result found for test ${testId}`);
      return [];
    }
    
    const markScheme = await this.getMarkScheme(testId);
    console.log('Mark Scheme for detailed results:', JSON.stringify(markScheme, null, 2));
    
    if (markScheme.length === 0) {
      console.log(`No mark scheme found for test ${testId}`);
      return [];
    }
    
    const detailedResults = markScheme.map(entry => {
      const studentAnswer = result.studentAnswers[entry.questionNumber.toString()] || '';
      const expectedAnswer = String(entry.expectedAnswer || "").trim();
      const correct = studentAnswer.toUpperCase() === expectedAnswer.toUpperCase();
      const earnedPoints = correct ? entry.points : 0;
      
      const resultItem = {
        questionNumber: entry.questionNumber,
        studentAnswer,
        expectedAnswer,
        points: entry.points,
        earnedPoints,
        correct
      };
      
      console.log(`Result item for question ${entry.questionNumber}:`, JSON.stringify(resultItem, null, 2));
      
      return resultItem;
    });
    
    return detailedResults;
  }
  
  // Settings operations
  async getSettings(): Promise<Settings> {
    return this.settings;
  }
  
  async updateSettings(settings: Partial<InsertSettings>): Promise<Settings> {
    this.settings = { ...this.settings, ...settings };
    return this.settings;
  }
}

// Export an instance of the storage
export const storage = new MemStorage();