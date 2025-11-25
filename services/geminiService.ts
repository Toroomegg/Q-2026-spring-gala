import { GoogleGenAI } from "@google/genai";
import { Candidate } from "../types";

let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateLiveCommentary = async (candidates: Candidate[]): Promise<string> => {
  if (!ai) return "Live commentary unavailable (API Key missing).";

  // Sort by Total Score
  const sorted = [...candidates].sort((a, b) => b.totalScore - a.totalScore);
  const leader = sorted[0];
  const totalScoreAll = candidates.reduce((sum, c) => sum + c.totalScore, 0);

  const prompt = `
    You are a hype Master of Ceremonies (MC) at a company Spring Dinner singing competition.
    The system uses a 1-10 scoring system from the audience.

    Current Stats:
    Leader: ${leader?.name} singing "${leader?.song}" with a TOTAL SCORE of ${leader?.totalScore}.
    Runner up: ${sorted[1]?.name || 'None'} with ${sorted[1]?.totalScore || 0} points.
    Total points cast across all candidates: ${totalScoreAll}.

    Task:
    Generate a SHORT, energetic, one-sentence commentary in Traditional Chinese (Taiwanese style) to hype up the crowd.
    Focus on the high scores or the intensity of the competition.
    Do not use markdown. Just plain text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "目前戰況非常激烈！大家趕快評分！";
  } catch (error) {
    console.error("Gemini commentary failed:", error);
    return "現場氣氛嗨到最高點！請投下您神聖的分數！";
  }
};