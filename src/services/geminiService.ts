import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini AI client
const AI_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: AI_KEY || "missing" });

export const isGeminiConfigured = !!AI_KEY && AI_KEY !== "undefined";

/**
 * Extracts and defines major topics from academic materials using Gemini 3 Flash.
 * This replaces the legacy fetch-based extraction to ensure reliability and compatibility.
 */
export async function extractContentFromFile(base64Data: string, fileType: string, fileName: string) {
  const prompt = `Analyze this academic file: "${fileName}".
  
  CORE MISSION: Perform a high-fidelity "Full Context Topic Review" extraction. 
  Your goal is to transcribe and define EVERY major topic found in the source material.
  
  DIRECTIONS:
  1. No Summary: Do not summarize the whole document. Instead, extract the specific lessons.
  2. Topic List: Identify and list EVERY major concept (e.g., Basketball Definition, History of the Game, Basic Rules, Court Dimensions).
  3. Format: Use a **Bold Heading** for each topic name.
  4. Explanation: Follow each heading with a 2-3 sentence 'Brief Explanation' that defines the topic accurately based on the text.
  5. Structure: Use a clean, organized list with bullet points where appropriate.
  6. Tone: Educational, concise, and academic.
  
  CRITICAL: At the very end, provide exactly one line: "DIAGNOSTIC_WEIGHT: 21/25".`;

  try {
    let normalizedMimeType = fileType;
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension === 'pdf') {
      normalizedMimeType = 'application/pdf';
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(extension || '')) {
      normalizedMimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
    } else if (['txt', 'md', 'csv'].includes(extension || '')) {
      normalizedMimeType = 'text/plain';
    } else if (['mp4', 'mov', 'avi'].includes(extension || '')) {
      normalizedMimeType = 'video/mp4';
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Data,
              mimeType: normalizedMimeType
            }
          }
        ]
      }
    });

    const text = response.text || "";
    
    if (!text) {
      throw new Error("Empty or insufficient content extracted from AI response.");
    }

    const weightMatch = text.match(/DIAGNOSTIC_WEIGHT: (\d+)\/25/);
    const weight = weightMatch ? weightMatch[1] : "21";
    
    return {
      content: text.replace(/DIAGNOSTIC_WEIGHT: .*/, "").trim(),
      diagnosticScore: `${weight}/25`
    };
  } catch (err) {
    console.error("AI Content Extraction Error:", err);
    throw err; // Re-throw to allow component level error handling
  }
}

/**
 * Generates quiz questions based on extracted content.
 */
export async function generateInitialQuiz(title: string, content: string) {
  const prompt = `Generate 25 multiple-choice questions for a "Diagnostic Quiz" based on this Full Context Topic Review: ${title}.
  Review Content: ${content}
  
  GOAL: Ensure the quiz specifically targets the key lessons and facts captured in the 'Brief Explanations' of each topic in the review.
  Format: Return ONLY a raw JSON array of objects with keys: question, options (array of 4 strings), correctAnswer (index 0-3), explanation.`;

  try {
    if (!content || content.length < 50) return [];
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (err) {
    console.error("Quiz generation error:", err);
    return [];
  }
}
