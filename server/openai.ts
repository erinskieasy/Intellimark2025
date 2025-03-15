import OpenAI from "openai";
import { Settings } from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define the response format for answer extraction
interface AnswerExtractionResponse {
  answers: Record<string, string>; // key: question number, value: answer (A, B, C, D, etc.)
  confidence: number;
}

/**
 * Process an image to extract multiple-choice answers
 * @param base64Image Base64 encoded image data
 * @param settings Recognition settings
 * @returns The extracted answers and confidence score
 */
export async function extractAnswersFromImage(
  base64Image: string,
  settings: Settings
): Promise<AnswerExtractionResponse> {
  try {
    // Setup system prompt with custom instructions if available
    const systemContent = `
      You are an expert at recognizing multiple-choice test answers from images.
      Analyze the provided image and extract all visible multiple-choice answers.
      ${settings.answerRecognitionInstructions 
        ? `Special instructions for recognition: ${settings.answerRecognitionInstructions}` 
        : ''}
      Return answers in JSON format as {"answers": {"1": "A", "2": "B", ...}, "confidence": 0.95}.
      The "answers" should map question numbers to selected answers.
      Include a "confidence" score between 0 and 1 indicating your certainty in the extraction.
      Only include answers that are clearly marked or selected in the image.
    `;

    // Select the model based on settings
    const model = settings.enhancedRecognition ? "gpt-4o" : "gpt-4o";
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all multiple-choice answers from this test sheet. Return ONLY the question numbers and corresponding selected answers in JSON format."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    // Parse the response
    const responseContent = response.choices[0].message.content;
    if (!responseContent) {
      throw new Error("Empty response from OpenAI");
    }

    const parsedResponse = JSON.parse(responseContent) as AnswerExtractionResponse;
    
    // Filter by confidence threshold if needed
    if (parsedResponse.confidence < (settings.confidenceThreshold / 100)) {
      console.warn(`Low confidence (${parsedResponse.confidence}) below threshold (${settings.confidenceThreshold / 100})`);
    }

    return parsedResponse;
  } catch (error) {
    console.error("Error processing image with OpenAI:", error);
    throw new Error(`Failed to extract answers from image: ${error instanceof Error ? error.message : String(error)}`);
  }
}
