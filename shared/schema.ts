import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the schema for mark scheme entries
export const markSchemeEntries = pgTable("mark_scheme_entries", {
  id: serial("id").primaryKey(),
  questionNumber: integer("question_number").notNull(),
  expectedAnswer: text("expected_answer").notNull(),
  points: integer("points").notNull(),
  testId: integer("test_id").notNull(),
});

// Define the schema for test sessions
export const tests = pgTable("tests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  totalPoints: integer("total_points").notNull(),
});

// Define the schema for captured pages
export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  imageData: text("image_data").notNull(), // Base64 encoded image
  pageNumber: integer("page_number").notNull(),
  testId: integer("test_id").notNull(),
  processed: boolean("processed").default(false),
  extractedAnswers: jsonb("extracted_answers").$type<Record<string, string>>().default({}),
});

// Define the schema for test results
export const results = pgTable("results", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull(),
  studentAnswers: jsonb("student_answers").$type<Record<string, string>>().notNull(),
  pointsEarned: integer("points_earned").notNull(),
  totalPoints: integer("total_points").notNull(),
  scorePercentage: integer("score_percentage").notNull(),
});

// Define the settings schema
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  answerRecognitionInstructions: text("answer_recognition_instructions").default(""),
  enhancedRecognition: boolean("enhanced_recognition").default(true),
  confidenceThreshold: integer("confidence_threshold").default(80),
});

// Create insert schemas using drizzle-zod
export const insertMarkSchemeEntrySchema = createInsertSchema(markSchemeEntries).omit({
  id: true,
});

export const insertTestSchema = createInsertSchema(tests).omit({
  id: true,
});

export const insertPageSchema = createInsertSchema(pages).omit({
  id: true,
  processed: true,
  extractedAnswers: true,
});

export const insertResultSchema = createInsertSchema(results).omit({
  id: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

// Define types for the schemas
export type MarkSchemeEntry = typeof markSchemeEntries.$inferSelect;
export type InsertMarkSchemeEntry = z.infer<typeof insertMarkSchemeEntrySchema>;

export type Test = typeof tests.$inferSelect;
export type InsertTest = z.infer<typeof insertTestSchema>;

export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;

export type Result = typeof results.$inferSelect;
export type InsertResult = z.infer<typeof insertResultSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Create a common type for mark scheme data from Excel
export const markSchemeRowSchema = z.object({
  questionNumber: z.number().int().positive(),
  expectedAnswer: z.string().min(1),
  points: z.number().int().nonnegative(),
});

export type MarkSchemeRow = z.infer<typeof markSchemeRowSchema>;

// Create a schema for extracted answer data
export const extractedAnswerSchema = z.object({
  questionNumber: z.number().int().positive(),
  answer: z.string(),
});

export type ExtractedAnswer = z.infer<typeof extractedAnswerSchema>;

// Define a detailed result item schema
export const resultItemSchema = z.object({
  questionNumber: z.number().int().positive(),
  studentAnswer: z.string(),
  expectedAnswer: z.string(),
  points: z.number().int().nonnegative(),
  earnedPoints: z.number().int().nonnegative(),
  correct: z.boolean(),
});

export type ResultItem = z.infer<typeof resultItemSchema>;
