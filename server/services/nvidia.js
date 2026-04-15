const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

const DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";
const MAX_RETRIES = 3;

/**
 * Calculates exponential backoff for retries.
 * @param {number} attempt - 0-indexed attempt number
 * @returns {number} milliseconds to wait
 */
function getRetryDelayMs(attempt) {
  return Math.pow(3, attempt) * 5000;
}

/**
 * Analyzes a project using Git history and AI chat logs using Nvidia NIM API.
 * 
 * @param {string} repoName - The name of the repository.
 * @param {object} gitContext - The Git context containing commits, status, and diff.
 * @param {string} chatContext - The concatenated chat logs from Antigravity.
 * @returns {Promise<object>} - The structured analysis as a JSON object.
 */
async function analyzeProject(repoName, gitContext, chatContext) {
  const modelToUse = process.env.NVIDIA_MODEL || DEFAULT_MODEL;

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
  "resumability_score": 8,
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

  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`[nvidia] Requesting analysis from ${modelToUse}...`);
      const start = Date.now();
      
      const completion = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1024,
        response_format: { type: "json_object" }
      });

      const duration = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[nvidia] Received response in ${duration}s`);

      let text = completion.choices[0].message.content.trim();

      // Extract JSON if wrapped in markdown (though response_format should handle it)
      const jsonMatch = text.match(/```json\s?([\s\S]*?)\s?```/) || text.match(/```\s?([\s\S]*?)\s?```/);
      if (jsonMatch) {
        text = jsonMatch[1];
      }

      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error("[nvidia] Failed to parse JSON response:", text);
        throw new Error("AI returned malformed JSON.");
      }
    } catch (error) {
      lastError = error;
      
      // Handle rate limits (429)
      if (error.status === 429 && attempt < MAX_RETRIES - 1) {
        const delayMs = getRetryDelayMs(attempt);
        console.warn(`[nvidia] Rate limited (429). Retrying in ${delayMs/1000}s... (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      // Handle auth errors (401)
      if (error.status === 401) {
        const friendly = new Error('Invalid Nvidia API key. Please check NVIDIA_API_KEY in your .env file.');
        friendly.status = 401;
        throw friendly;
      }

      console.error("[nvidia] API error:", error.message || error);
      throw error;
    }
  }

  throw lastError;
}

module.exports = { analyzeProject };
