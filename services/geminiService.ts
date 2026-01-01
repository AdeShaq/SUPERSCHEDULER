import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = import.meta.env.VITE_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment");
    return null;
  }
  return new GoogleGenAI({ apiKey });
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
  },

  parseTaskCommand: async (command: string): Promise<any[]> => {
    const ai = getAiClient();
    if (!ai) return null;

    try {
      const prompt = `
        You are an advanced task parser. Extract task details from this command: "${command}".
        If the command implies multiple steps or a schedule, break it down into multiple task objects.
        Return ONLY a raw JSON ARRAY of objects (no markdown, no quotes around the block). 
        Each object must have:
        - title: string (the task action)
        - time: string (HH:mm format, 24h. Assume today unless specified. If no time, use "12:00")
        - priority: "normal" | "high" (keywords: urgent, asap, important = high)
        - recurrence: "none" | "daily" | "weekly" | "monthly"
        - specificDay: number (0-6, where 0=Sunday) if a specific day is mentioned (e.g. "every Monday").
        
        Example outputs:
        "Buy milk" -> [{ "title": "Buy milk", "time": "12:00", "priority": "normal", "recurrence": "none" }]
        "Gym at 6, Meeting at 9" -> [
            { "title": "Gym", "time": "06:00", "priority": "normal" },
            { "title": "Meeting", "time": "09:00", "priority": "normal" }
        ]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const text = response.text || "{}";
      // Clean potential markdown code blocks
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error("Gemini Parse Error:", error);
      return null;
    }
  }
};