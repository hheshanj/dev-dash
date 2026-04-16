const OpenAI = require("openai");

// Lazy factory: reads process.env at call-time so DB-injected settings work
function getClient() {
  return new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });
}

const DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";
const MAX_RETRIES = 5;

/**
 * Calculates exponential backoff for retries.
 * @param {number} attempt - 0-indexed attempt number
 * @returns {number} milliseconds to wait
 */
function getRetryDelayMs(attempt) {
  return Math.min(Math.pow(2, attempt) * 1000, 8000);
}

/**
 * Analyzes a project using Git history and AI chat logs using Nvidia NIM API.
 * 
 * @param {string} repoName - The name of the repository.
 * @param {object} gitContext - The Git context containing commits, status, and diff.
 * @param {string} chatContext - The concatenated chat logs from Antigravity.
 * @returns {Promise<object>} - The structured analysis as a JSON object.
 */
async function analyzeProject(repoName, gitContext, chatContext, fileContext = null, githubContext = null) {
  const modelToUse = process.env.NVIDIA_MODEL || DEFAULT_MODEL;
  const openai = getClient();

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
${gitContext.diff || 'No uncommitted changes.'}`;

  let codeSection = '';
  if (fileContext && fileContext.tree) {
    codeSection = `
--- Project Structure ---
${JSON.stringify(fileContext.tree, null, 2).substring(0, 2000)}

--- Key Files ---
${fileContext.keyFiles?.map(f => `=== ${f.path} ===\n${f.content.substring(0, 3000)}`).join('\n\n') || 'No key files found.'}`;
  }

  const userPrompt = `
Project Name: ${repoName}

--- Git Context ---
${gitText}
${codeSection}

--- GitHub Context ---
${githubContext && (githubContext.issues?.length > 0 || githubContext.pullRequests?.length > 0) ? `
Open Issues:
${githubContext.issues.map(i => `- #${i.number} [${i.labels.join(', ')}]: ${i.title}`).join('\n')}

Open Pull Requests:
${githubContext.pullRequests.map(pr => `- #${pr.number} [${pr.state}]: ${pr.title}`).join('\n')}
` : 'No open issues or PRs.'}

--- AI Chat Context (Antigravity) ---
${chatContext || 'No chat history available.'}

Generate the JSON analysis for "${repoName}" based on the above context:`;

  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`[nvidia] Requesting analysis from ${modelToUse}... (attempt ${attempt + 1}/${MAX_RETRIES})`);
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
      
      // Retry on 429 (rate limit) OR 500 (transient server error / no body)
      const isRetryable = (error.status === 429 || error.status === 500 || !error.status);
      if (isRetryable && attempt < MAX_RETRIES - 1) {
        const delayMs = getRetryDelayMs(attempt);
        console.warn(`[nvidia] Retryable error (${error.status || 'no status'}). Retrying in ${delayMs/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      // Handle auth errors (401)
      if (error.status === 401) {
        const friendly = new Error('Invalid Nvidia API key. Please check your settings.');
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

async function improveProject(repoName, codeContext) {
  const modelToUse = process.env.NVIDIA_MODEL || DEFAULT_MODEL;
  const openai = getClient();

  const systemPrompt = `You are a senior software architect reviewing code for a project named "${repoName}".

Analyze the provided codebase structure, key files, and Git history to identify:
- Code smells and anti-patterns
- Architectural weaknesses or design issues
- Missing documentation or tests
- Performance optimization opportunities
- Security concerns
- Missing error handling or edge cases

Provide actionable, specific suggestions that a developer can implement. Focus on high-impact improvements.

Output strictly as JSON matching this schema:
{
  "overall_assessment": "Brief 1-2 sentence assessment of code quality.",
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "category": "architecture" | "performance" | "security" | "documentation" | "testing" | "code-quality",
      "title": "Short descriptive title",
      "description": "What the issue is and why it matters.",
      "file": "File path where issue exists (if applicable)",
      "suggestion": "How to fix or improve it."
    }
  ],
  "quick_wins": ["Quick improvement that can be done in < 1 hour"],
  "long_term_improvements": ["Larger refactoring or architectural changes"]
}`;

  const userPrompt = `
Project Name: ${repoName}

--- File Tree ---
${JSON.stringify(codeContext.tree || [], null, 2)}

--- Key Files Content ---
${codeContext.keyFiles?.map(f => `=== ${f.path} ===\n${f.content.substring(0, 3000)}`).join('\n\n') || 'No key files found.'}

--- Git Context ---
${codeContext.gitContext?.commits || 'No commits available.'}

Generate the improvement analysis for "${repoName}" based on the above codebase:`;

  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`[nvidia] Requesting improvement analysis from ${modelToUse}...`);
      const start = Date.now();
      
      const completion = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2048,
        response_format: { type: "json_object" }
      });

      const duration = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[nvidia] Received improvement response in ${duration}s`);

      let text = completion.choices[0].message.content.trim();

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
      
      const isRetryable = (error.status === 429 || error.status === 500 || !error.status);
      if (isRetryable && attempt < MAX_RETRIES - 1) {
        const delayMs = getRetryDelayMs(attempt);
        console.warn(`[nvidia] Retryable error (${error.status || 'no status'}). Retrying improve in ${delayMs/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      if (error.status === 401) {
        const friendly = new Error('Invalid Nvidia API key. Please check your settings.');
        friendly.status = 401;
        throw friendly;
      }

      console.error("[nvidia] API error:", error.message || error);
      throw error;
    }
  }

  throw lastError;
}

module.exports = { analyzeProject, improveProject };
