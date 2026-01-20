import { GoogleGenAI } from "@google/genai";
import { CHECKLIST_RULES, DrawingError } from "../types";

const SYSTEM_INSTRUCTION = `
You are a Senior BIM QA/QC Engineer. Your task is to review construction drawings (Images) and detect errors based strictly on the visible content.
DO NOT hallucinate. If you cannot find an error, do not invent one.

CHECKLIST TO VERIFY:
${CHECKLIST_RULES}

OUTPUT INSTRUCTION:
Return a JSON object with a property "errors" which is an array of objects.
Each object must have:
- "id": integer (1, 2, 3...)
- "description_en": string (Description in English)
- "description_vn": string (Description in Vietnamese)
- "type": "critical" | "warning" | "info"
- "box_2d": [ymin, xmin, ymax, xmax] (Array of 4 integers). 
  IMPORTANT: Coordinates are normalized to 0-1000 scale. 
  (0,0) is top-left, (1000,1000) is bottom-right.
  Mark the location of the error precisely. If the error is general (e.g. Title Block missing), mark the area where it should be or the whole sheet if applicable.

Example:
{
  "errors": [
    {
      "id": 1,
      "description_en": "Missing DN tag on pipe",
      "description_vn": "Thiếu tag DN trên ống",
      "type": "warning",
      "box_2d": [450, 200, 480, 250]
    }
  ]
}
`;

export const analyzeDrawing = async (
  base64Image: string, 
  mimeType: string = "image/png"
): Promise<DrawingError[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: "Perform a QA/QC check on this drawing based on the provided checklist. Return JSON format.",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.1, // Low temperature for factual analysis
      },
    });

    let text = response.text;
    if (!text) return [];

    // Clean potential markdown code blocks
    text = text.replace(/^```json\s*/, "").replace(/```$/, "").trim();

    const result = JSON.parse(text);
    
    // Validate and map raw result to strict types
    if (result && Array.isArray(result.errors)) {
      return result.errors.map((e: any) => ({
        id: e.id,
        description_en: e.description_en || "Unknown error",
        description_vn: e.description_vn || "Lỗi không xác định",
        type: e.type || "warning",
        box_2d: Array.isArray(e.box_2d) && e.box_2d.length === 4 
          ? { ymin: e.box_2d[0], xmin: e.box_2d[1], ymax: e.box_2d[2], xmax: e.box_2d[3] } 
          : null
      }));
    }

    return [];
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};