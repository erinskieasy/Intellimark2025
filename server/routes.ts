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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  
  // ===== MARK SCHEME ROUTES =====
  
  // Upload mark scheme
  apiRouter.post("/mark-scheme", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      if (!req.body.testId) {
        return res.status(400).json({ message: "Test ID is required" });
      }
      
      const testId = parseInt(req.body.testId);
      
      // Parse the Excel file from the buffer
      // Since we can't use external libraries directly here, we'll assume the client has parsed
      // the Excel file and sends the data as JSON in the markSchemeData field
      const markSchemeData = req.body.markSchemeData;
      if (!markSchemeData) {
        return res.status(400).json({ message: "Mark scheme data is required" });
      }
      
      // Validate mark scheme data
      const parsedData = JSON.parse(markSchemeData);
      const validationResult = z.array(markSchemeRowSchema).safeParse(parsedData);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid mark scheme data format", 
          errors: validationResult.error.format() 
        });
      }
      
      // Add entries to storage
      const entries = await Promise.all(
        validationResult.data.map(entry => 
          storage.addMarkSchemeEntry({
            questionNumber: entry.questionNumber,
            expectedAnswer: entry.expectedAnswer,
            points: entry.points,
            testId
          })
        )
      );
      
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
      const page = await storage.getPages(0).then(pages => pages.find(p => p.id === id));
      
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      // Get settings for image processing
      const settings = await storage.getSettings();
      
      // Process the image with OpenAI
      const imageData = page.imageData.replace(/^data:image\/[a-z]+;base64,/, "");
      const extractionResult = await extractAnswersFromImage(imageData, settings);
      
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
      const detailedResults = await storage.getDetailedResults(testId);
      res.status(200).json(detailedResults);
    } catch (error) {
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
