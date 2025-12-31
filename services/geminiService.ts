import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found in environment");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const GeminiService = {
  summarizeNote: async (content: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "API Key missing.";

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Summarize the following note into 3 key bullet points. Keep it brutalist and concise:\n\n${content}`,
      });
      return response.text || "No summary available.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Failed to generate summary.";
    }
  },

  analyzeSchedule: async (tasks: any[]): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "API Key missing.";

    try {
      const taskList = tasks.map(t => `${t.title} (${t.frequency}, streak: ${t.streak})`).join('\n');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this schedule for potential burnout or optimization. Be direct:\n\n${taskList}`,
      });
      return response.text || "No analysis available.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Failed to analyze schedule.";
    }
  }
};