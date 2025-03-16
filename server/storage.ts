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
      answerRecognitionInstructions: "",
      enhancedRecognition: true,
      confidenceThreshold: 80
    };
  }
  
  // Mark scheme operations
  async getMarkScheme(testId: number): Promise<MarkSchemeEntry[]> {
    return Array.from(this.markSchemeEntries.values())
      .filter(entry => entry.testId === testId)
      .sort((a, b) => a.questionNumber - b.questionNumber);
  }
  
  async addMarkSchemeEntry(entry: InsertMarkSchemeEntry): Promise<MarkSchemeEntry> {
    const id = this.currentMarkSchemeEntryId++;
    const newEntry: MarkSchemeEntry = { ...entry, id };
    this.markSchemeEntries.set(id, newEntry);
    return newEntry;
  }
  
  async addMarkSchemeEntries(entries: InsertMarkSchemeEntry[]): Promise<MarkSchemeEntry[]> {
    return Promise.all(entries.map(entry => this.addMarkSchemeEntry(entry)));
  }
  
  // Test operations
  async createTest(test: InsertTest): Promise<Test> {
    const id = this.currentTestId++;
    const newTest: Test = { ...test, id };
    this.tests.set(id, newTest);
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
    return updatedPage;
  }
  
  // Results operations
  async addResult(result: InsertResult): Promise<Result> {
    const id = this.currentResultId++;
    const newResult: Result = { ...result, id };
    this.results.set(id, newResult);
    return newResult;
  }
  
  async getResult(testId: number): Promise<Result | undefined> {
    return Array.from(this.results.values()).find(result => result.testId === testId);
  }
  
  async getDetailedResults(testId: number): Promise<ResultItem[]> {
    const result = await this.getResult(testId);
    if (!result) {
      return [];
    }
    
    const markScheme = await this.getMarkScheme(testId);
    console.log('Mark Scheme retrieved:', markScheme);
    
    return markScheme.map(entry => {
      const studentAnswer = result.studentAnswers[entry.questionNumber.toString()] || '';
      const correct = studentAnswer.toUpperCase() === entry.expectedAnswer.toUpperCase();
      const earnedPoints = correct ? entry.points : 0;
      
      return {
        questionNumber: entry.questionNumber,
        studentAnswer,
        expectedAnswer: entry.expectedAnswer,
        points: entry.points,
        earnedPoints,
        correct
      };
    });
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