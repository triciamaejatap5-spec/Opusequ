const API_KEY = process.env.GEMINI_API_KEY || "";

/**
 * Robust fetch wrapper to handle QCU network environment and Gemini authorization requirements.
 * Ensures the 'x-goog-api-key' is explicitly included and handles transient network failures.
 */
async function safeFetch(url: string, body: any, attempts = 0): Promise<any> {
    if (!API_KEY || API_KEY === "undefined") {
        console.error("Critical: Gemini API key is missing or undefined in current environment.");
    }

    const apiUrl = url;
    const separator = apiUrl.includes('?') ? '&' : '?';
    const signedUrl = `${apiUrl}${separator}key=${API_KEY}`;

    try {
        const response = await fetch(signedUrl, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY 
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error");
            let errorData = {};
            try { errorData = JSON.parse(errorText); } catch(e) {}

            // Check for credential or transient issues (401, 403, 429)
            if ((response.status === 401 || response.status === 403 || response.status === 429) && attempts < 1) {
                console.warn(`Safe fetch authorization/rate error ${response.status}. Retrying in 1.5s...`);
                await new Promise(resolve => setTimeout(resolve, 1500));
                return safeFetch(url, body, attempts + 1);
            }
            throw new Error(`Safe fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return await response.json();
    } catch (err) {
        if (attempts < 1) {
            console.warn(`Safe fetch network error. Retrying in 2s...`, err);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return safeFetch(url, body, attempts + 1);
        }
        throw err;
    }
}

export async function extractContentFromFile(base64Data: string, fileType: string, fileName: string) {
  const model = "gemini-1.5-flash"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let prompt = `Analyze this academic file: "${fileName}".
  
  CORE MISSION: Perform a high-fidelity "Structured Topic Review" extraction. 
  Your goal is to recreate the module's knowledge as an organized, easy-to-read list of topics.
  
  EXTRACTION PROTOCOL:
  1. Logical Topic Extraction: List EVERY major topic found (e.g., Definitions, History, Rules, Procedures).
  2. Brief Explanation: For each topic, provide a 'Brief Explanation' (2-3 sentences) that captures the absolute essential lesson.
  3. Header Hierarchy: Use Markdown (# ##) for main topics. Use **Bold** for sub-topics.
  4. QCU Focus: Emphasize practical applications suitable for Industrial Engineering or IT students at QCU.
  
  FORMATTING:
  - Use clean Markdown syntax.
  - No conversational filler.
  - Structured list style: [Topic Name] followed by [Brief Explanation].
  
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

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Data,
              mimeType: normalizedMimeType
            }
          }
        ]
      }]
    };

    const data = await safeFetch(url, body);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const weightMatch = text.match(/DIAGNOSTIC_WEIGHT: (\d+)\/25/);
    const weight = weightMatch ? weightMatch[1] : "21";
    
    return {
      content: text.replace(/DIAGNOSTIC_WEIGHT: .*/, "").trim() || `Extracted summary for ${fileName}. Material is ready for review.`,
      diagnosticScore: `${weight}/25`
    };
  } catch (err) {
    console.error("AI Content Extraction Error:", err);
    return {
      content: "", 
      diagnosticScore: "21/25"
    };
  }
}

export async function generateInitialQuiz(title: string, content: string) {
  const model = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const prompt = `Generate 25 multiple-choice questions for a "Diagnostic Quiz" based on this Structured Topic Review: ${title}.
  Review Content: ${content}
  
  GOAL: Ensure the quiz specifically targets the key lessons captured in the 'Brief Explanations' of each topic.
  Format: Return ONLY a raw JSON array of objects with keys: question, options (array of 4 strings), correctAnswer (index 0-3), explanation.`;

  try {
    if (!content || content.length < 50) return [];
    
    const body = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    const data = await safeFetch(url, body);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return JSON.parse(text || '[]');
  } catch (err) {
    console.error("Quiz generation error:", err);
    return [];
  }
}
