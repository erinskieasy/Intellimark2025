import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { extractAnswersFromImage } from "./openai";
import multer from "multer";
import { z } from "zod";
import { 
  insertMarkSchemeEntrySchema, 
  insertTestSchema, 
  insertPageSchema, 
  insertResultSchema,
  markSchemeRowSchema
} from "@shared/schema";

// Set up multer for handling file uploads
const memoryStorage = multer.memoryStorage();
const upload = multer({ 
  storage: memoryStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  
  // ===== MARK SCHEME ROUTES =====
  
  // Upload mark scheme
  apiRouter.post("/mark-scheme", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.body.testId) {
        return res.status(400).json({ message: "Test ID is required" });
      }
      
      const testId = parseInt(req.body.testId);
      
      // Get the mark scheme data from the request
      const markSchemeData = req.body.markSchemeData;
      if (!markSchemeData) {
        return res.status(400).json({ message: "Mark scheme data is required" });
      }
      
      // Parse and validate the mark scheme data
      let parsedData;
      try {
        // Parse the JSON string into an object
        parsedData = JSON.parse(markSchemeData);
        console.log("=== MARK SCHEME DATA RECEIVED ===");
        console.log("Raw mark scheme data type:", typeof markSchemeData);
        console.log("Parsed mark scheme data type:", typeof parsedData);
        console.log("Is Array?", Array.isArray(parsedData));
        console.log("Length:", Array.isArray(parsedData) ? parsedData.length : "N/A");
        
        // Log the first few entries in detail
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          console.log("\nFirst 3 mark scheme entries (detailed):");
          parsedData.slice(0, 3).forEach((entry, index) => {
            console.log(`\nEntry ${index}:`, JSON.stringify(entry, null, 2));
            console.log(`  questionNumber: ${entry.questionNumber} (${typeof entry.questionNumber})`);
            console.log(`  expectedAnswer: "${entry.expectedAnswer}" (${typeof entry.expectedAnswer})`);
            console.log(`  points: ${entry.points} (${typeof entry.points})`);
          });
        }
      } catch (e) {
        console.error("JSON parse error:", e);
        return res.status(400).json({ 
          message: "Invalid JSON format in mark scheme data",
          error: e instanceof Error ? e.message : String(e)
        });
      }
      
      // Validate the parsed data against our schema
      const validationResult = z.array(markSchemeRowSchema).safeParse(parsedData);
      
      if (!validationResult.success) {
        console.error("Validation error:", validationResult.error);
        return res.status(400).json({ 
          message: "Invalid mark scheme data format", 
          errors: validationResult.error.format() 
        });
      }
      
      console.log("\n=== MARK SCHEME PROCESSING ===");
      // Add entries to storage with proper handling of values
      const entries = await Promise.all(
        validationResult.data.map(entry => {
          // Convert and normalize the answer value
          let expectedAnswer = String(entry.expectedAnswer || "").trim();
          
          // Special case: handle "undefined" literal string value
          if (expectedAnswer.toLowerCase() === "undefined") {
            console.warn(`Found literal "undefined" string for Q${entry.questionNumber}, replacing with empty string`);
            expectedAnswer = "";
          }
          
          // Create a sanitized entry with proper values
          const sanitizedEntry = {
            questionNumber: entry.questionNumber,
            expectedAnswer: expectedAnswer,
            points: entry.points,
            testId: testId
          };
          
          console.log(`Processing entry Q${entry.questionNumber}: "${expectedAnswer}" (${typeof expectedAnswer}), Points: ${entry.points}`);
          
          return storage.addMarkSchemeEntry(sanitizedEntry);
        })
      );
      
      // Log the first few entries that were actually stored
      console.log("First few entries actually stored:");
      entries.slice(0, 3).forEach((entry, idx) => {
        console.log(`Entry ${idx}:`, JSON.stringify(entry, null, 2));
        console.log(`  expectedAnswer type: ${typeof entry.expectedAnswer}`);
        console.log(`  expectedAnswer value: "${entry.expectedAnswer}"`);
      });
      
      // Update test with total questions and points
      const test = await storage.getTest(testId);
      if (test) {
        const totalQuestions = entries.length;
        const totalPoints = entries.reduce((sum, entry) => sum + entry.points, 0);
        
        await storage.createTest({
          ...test,
          totalQuestions,
          totalPoints
        });
      }
      
      res.status(200).json({ entries });
    } catch (error) {
      console.error("Error uploading mark scheme:", error);
      res.status(500).json({ message: `Error uploading mark scheme: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
  
  // Get mark scheme for a test
  apiRouter.get("/mark-scheme/:testId", async (req: Request, res: Response) => {
    try {
      const testId = parseInt(req.params.testId);
      const markScheme = await storage.getMarkScheme(testId);
      res.status(200).json(markScheme);
    } catch (error) {
      res.status(500).json({ message: `Error getting mark scheme: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
  
  // ===== TEST ROUTES =====
  
  // Create a new test
  apiRouter.post("/tests", async (req: Request, res: Response) => {
    try {
      const validationResult = insertTestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid test data", 
          errors: validationResult.error.format() 
        });
      }
      
      const test = await storage.createTest(validationResult.data);
      res.status(201).json(test);
    } catch (error) {
      res.status(500).json({ message: `Error creating test: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
  
  // Get a test by ID
  apiRouter.get("/tests/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const test = await storage.getTest(id);
      
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      
      res.status(200).json(test);
    } catch (error) {
      res.status(500).json({ message: `Error getting test: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
  
  // Get all tests
  apiRouter.get("/tests", async (_req: Request, res: Response) => {
    try {
      const tests = await storage.getAllTests();
      res.status(200).json(tests);
    } catch (error) {
      res.status(500).json({ message: `Error getting tests: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
  
  // ===== PAGE ROUTES =====
  
  // Upload a page image
  apiRouter.post("/pages", async (req: Request, res: Response) => {
    try {
      const validationResult = insertPageSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid page data", 
          errors: validationResult.error.format() 
        });
      }
      
      const page = await storage.addPage(validationResult.data);
      res.status(201).json(page);
    } catch (error) {
      res.status(500).json({ message: `Error adding page: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
  
  // Get pages for a test
  apiRouter.get("/pages/:testId", async (req: Request, res: Response) => {
    try {
      const testId = parseInt(req.params.testId);
      const pages = await storage.getPages(testId);
      res.status(200).json(pages);
    } catch (error) {
      res.status(500).json({ message: `Error getting pages: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
  
  // Process a page image
  apiRouter.post("/pages/:id/process", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      let page;
      
      try {
        // Try to get the page directly using the getPage method
        page = await storage.getPage(id);
      } catch (error) {
        console.log(`Error finding page with ID ${id} directly: ${String(error)}`);
        
        // Fallback: Try to find the page from all pages
        const allPages = await storage.getPages(0); // Get all pages
        page = allPages.find(p => p.id === id);
      }
      
      console.log(`Processing page ${id}, found: ${!!page}`);
      
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      // Get settings for image processing
      const settings = await storage.getSettings();
      
      // Verify we have an OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ 
          message: "Missing OpenAI API key. Please provide an OPENAI_API_KEY in your environment variables."
        });
      }
      
      // Process the image with OpenAI
      const imageData = page.imageData.replace(/^data:image\/[a-z]+;base64,/, "");
      const extractionResult = await extractAnswersFromImage(imageData, settings);
      
      console.log(`Extraction result for page ${id}:`, extractionResult);
      
      // Update the page with extracted answers
      const updatedPage = await storage.updatePageProcessed(
        id, 
        true, 
        extractionResult.answers
      );
      
      res.status(200).json({
        page: updatedPage,
        extractedAnswers: extractionResult.answers,
        confidence: extractionResult.confidence
      });
    } catch (error) {
      console.error(`Error processing page ${req.params.id}:`, error);
      res.status(500).json({ 
        message: `Error processing page: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // ===== RESULTS ROUTES =====
  
  // Create a test result
  apiRouter.post("/results", async (req: Request, res: Response) => {
    try {
      const validationResult = insertResultSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid result data", 
          errors: validationResult.error.format() 
        });
      }
      
      const result = await storage.addResult(validationResult.data);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: `Error adding result: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
  
  // Get result for a test
  apiRouter.get("/results/:testId", async (req: Request, res: Response) => {
    try {
      const testId = parseInt(req.params.testId);
      const result = await storage.getResult(testId);
      
      if (!result) {
        return res.status(404).json({ message: "Result not found" });
      }
      
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: `Error getting result: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
  
  // Get detailed results for a test
  apiRouter.get("/results/:testId/detailed", async (req: Request, res: Response) => {
    try {
      const testId = parseInt(req.params.testId);
      console.log(`Getting detailed results for test ${testId}`);
      
      // First get the mark scheme to verify it contains data
      const markScheme = await storage.getMarkScheme(testId);
      console.log(`Mark scheme for test ${testId} contains ${markScheme.length} entries.`);
      
      if (markScheme.length > 0) {
        console.log("Sample mark scheme entries:");
        markScheme.slice(0, 3).forEach((entry, index) => {
          console.log(`Entry ${index}:`, JSON.stringify(entry, null, 2));
          console.log(`  expectedAnswer type: ${typeof entry.expectedAnswer}`);
          console.log(`  expectedAnswer value: "${entry.expectedAnswer}"`);
        });
      }
      
      const detailedResults = await storage.getDetailedResults(testId);
      console.log(`Generated ${detailedResults.length} detailed result items`);
      
      if (detailedResults.length > 0) {
        console.log("Sample result items:");
        detailedResults.slice(0, 3).forEach((item, index) => {
          console.log(`Result ${index}:`, JSON.stringify(item, null, 2));
          console.log(`  expectedAnswer type: ${typeof item.expectedAnswer}`);
          console.log(`  expectedAnswer value: "${item.expectedAnswer}"`);
        });
      }
      
      res.status(200).json(detailedResults);
    } catch (error) {
      console.error(`Error getting detailed results for test ${req.params.testId}:`, error);
      res.status(500).json({ message: `Error getting detailed results: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
  
  // ===== SETTINGS ROUTES =====
  
  // Get settings
  apiRouter.get("/settings", async (_req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.status(200).json(settings);
    } catch (error) {
      res.status(500).json({ message: `Error getting settings: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
  
  // Update settings
  apiRouter.put("/settings", async (req: Request, res: Response) => {
    try {
      const updatedSettings = await storage.updateSettings(req.body);
      res.status(200).json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: `Error updating settings: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
  
  // Register the API router
  app.use("/api", apiRouter);
  
  // Create and return the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
