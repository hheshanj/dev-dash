# devdash — Phase 2: Enhanced Insights & Improvements

Based on the initial foundational build, we are introducing advanced analytics, deeper codebase understanding, AI-driven improvement recommendations, and GitHub integration.

## 1. Deep Codebase Context Retrieval
**Problem:** The AI currently only reads `git` history and chat logs. It misses the actual code and documentation.
**Solution:**
- **File System Scanning:** Expand `git.js` or create a new `files.js` service to recursively read the directory tree, respecting `.gitignore`.
- **Content Extraction:** Explicitly load important files such as `README.md`, `package.json`, and key entry points (e.g., `src/index.js`, `main.py`).
- **AI Context Enrichment:** Feed these code snippets and the project structure summary to the Nvidia NIM `analyzeProject` call for a more holistic overview.

## 2. Deep Project Analysis & Improvements
**Problem:** We lack actionable insights beyond resuming stalled work.
**Solution:**
- **Improvements Endpoint:** Create a new API route `POST /api/projects/:id/improve`.
- **AI Prompt:** Using the deep codebase context (files + git log), instruct the Nvidia Llama 3.1 model to identify code smells, architectural weaknesses, missing documentation, or optimization opportunities.
- **Frontend Integration:** Add a "Check for Improvements" button in the `ProjectDetail` view. This triggers the endpoint and displays actionable suggestions.

## 3. Graphical Representations & Metrics
**Problem:** Textual summaries are great, but visual trends provide instant insight.
**Solution:**
- **Data Engineering (Backend):**
  - **Commits & Edits:** Parse `git log --stat` to extract the number of lines added/deleted per commit and group them by date (e.g., weekly or daily trends).
  - **Languages Used:** Aggregate file counts and sizes by extension to construct a language breakdown.
  - **Stats API:** Serve these metrics via a new `GET /api/projects/:id/stats` endpoint.
- **Visualizations (Frontend):**
  - Install a charting library like `recharts`.
  - Add a dedicated "Analytics" tab or section to the `ProjectDetail` view.
  - Render a Line Chart for cumulative commits/edits over time.
  - Render a Pie Chart illustrating the "Languages Used" breakdown.

## 4. GitHub Integration
**Problem:** The app is restricted to isolated local repositories, missing out on remote cloud context (issues, PRs, unseen repos).
**Solution:**
- **Authentication:** Enable configuring a GitHub Personal Access Token (`GITHUB_TOKEN`) in the `.env` file.
- **Data Enrichment:** Use the `@octokit/rest` API to match local folders with their remote GitHub repository limits. Fetch open Issues, Pull Requests, and latest remote activity.
- **Remote Repo Syncing:** Add a new view to show "Remote Repositories" that exist on your GitHub but aren't currently cloned locally.
- **Frontend Integration:** Display GitHub stats on the `ProjectDetail` page (e.g., "5 Open Issues", "2 Pending PRs").

## Implementation Steps
1. **Backend Extensions:**
   - Write `files.js` to parse `.gitignore` and fetch the repo's file tree and key file contents.
   - Write `stats.js` to run `git log --stat` and aggregate commit/edit data, and tally languages.
   - Write `github.js` to act as an octokit wrapper, fetching repo stats and issues based on the local git remotes.
2. **API Routes:**
   - Update `POST /api/projects/:id/analyze` to use `files.js` and `github.js`.
   - Add `POST /api/projects/:id/improve`.
   - Add `GET /api/projects/:id/stats`.
3. **Frontend Extensions:**
   - Install `recharts` via `npm install recharts`.
   - Update `ProjectDetail` UI to feature a graphical statistics area, GitHub issues, and the "Improvements" action panel.
