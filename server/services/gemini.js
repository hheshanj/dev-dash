const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Analyzes a project using Git history and AI chat logs to generate a structured JSON summary.
 * 
 * @param {string} repoName - The name of the repository.
 * @param {object} gitContext - The Git context containing commits, status, and diff.
 * @param {string} chatContext - The concatenated chat logs from Antigravity.
 * @returns {Promise<object>} - The structured analysis as a JSON object.
 */
async function analyzeProject(repoName, gitContext, chatContext) {
  const systemPrompt = `You are a senior developer handing over a project. Analyze the provided Git history and AI chat logs for a project named "${repoName}".

Provide a highly structured, objective analysis. Do not hallucinate features not mentioned in the logs.

Output strictly as JSON matching this schema:
{
  "summary": "2-3 sentence plain English overview of the project's purpose and current state.",
  "completed_features": ["Feature A", "Feature B"],
  "in_progress": ["Feature C implementation", "Debugging issue X"],
  "abandoned_or_stalled": ["Attempted migration to Y (reverted)"],
  "completion_percentage": 75,
  "status": "active" | "stalled" | "completed",
  "last_meaningful_activity": "YYYY-MM-DD",
  "resumability_score": 8, // 1-10 scale indicating how easy it is to pick up where left off
  "next_suggested_step": "Fix the failing tests in config.js before proceeding to deployment."
}`;

  const gitText = `
Git Commits (Recent):
${gitContext.commits || 'No recent commits found.'}

Git Status:
${gitContext.status || 'Clean'}

Git Diff (Uncommitted Changes):
${gitContext.diff || 'No uncommitted changes.'}
`;

  const userPrompt = `
Project Name: ${repoName}

--- Git Context ---
${gitText}

--- AI Chat Context (Antigravity) ---
${chatContext || 'No chat history available.'}

Generate the JSON analysis for "${repoName}" based on the above context:`;

  try {
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt }
    ]);
    
    const response = await result.response;
    let text = response.text();
    
    // Attempt to extract JSON if Gemini wraps it in markdown code blocks
    const jsonMatch = text.match(/```json\s?([\s\S]*?)\s?```/) || text.match(/```\s?([\s\S]*?)\s?```/);
    if (jsonMatch) {
      text = jsonMatch[1];
    }
    
    text = text.trim();

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON. Raw output:", text);
      throw new Error("AI returned malformed JSON. Please try again.");
    }
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}

module.exports = { analyzeProject };
