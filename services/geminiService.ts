/// <reference types="vite/client" />
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
        You are an advanced AI agent for SuperScheduler.
        Your goal is to RETURN AN ARRAY OF ACTIONS based on the user's command.

        COMMAND: "${command}"

        ACTIONS SUPPORTED: 'create', 'update', 'delete'.

        INSTRUCTIONS:
        1. Parse intent:
           - "Add/Schedule/Remind me to..." -> 'create'
           - "Change/Move/Reschedule/Rename..." -> 'update'
           - "Delete/Remove/Cancel/Clear..." -> 'delete'
        
        2. 'create': Extract task details (title, time, recurrence).
           - "Monday to Friday" -> recurrence: 'specific_days', specificDays: [1,2,3,4,5].
        
        3. 'update': Identify the target task.
           - If user says "Change Gym to 8am", query="Gym", updates={time: "08:00"}.
        
        4. 'delete': Identify target.
           - "Delete Gym" -> query="Gym".
           - "Delete all completed" -> query="completed".

        SCHEMA:
        Array<
          | { type: 'create', data: { title: string, time: string, priority: 'normal'|'high', recurrence: any, specificDays?: number[] } }
          | { type: 'update', query: string, updates: { title?: string, time?: string, priority?: string, recurrence?: any } }
          | { type: 'delete', query: string }
        >

        EXAMPLES:
        Input: "New task Gym at 7am daily"
        Output: [{ "type": "create", "data": { "title": "Gym", "time": "07:00", "priority": "normal", "recurrence": "daily" } }]

        Input: "Change Gym to 9am"
        Output: [{ "type": "update", "query": "Gym", "updates": { "time": "09:00" } }]

        Input: "Delete the Yoga task"
        Output: [{ "type": "delete", "query": "Yoga" }]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
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