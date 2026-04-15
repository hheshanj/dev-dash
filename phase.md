# devdash — Step-by-Step Implementation Plan

This document breaks down the development of the `devdash` project into granular, trackable tasks.

---

## Phase 1: Environment & Project Scaffolding

**Goal:** Set up the monorepo structure, initialize the Node.js server, and install base backend dependencies.

- [ ] Create the root `devdash` directory (if not already created).
- [ ] Initialize the backend package: `npm init -y` in the root.
- [ ] Install core backend dependencies: `npm install express cors dotenv better-sqlite3 simple-git @google/genai`
- [ ] Install dev dependencies: `npm install --save-dev nodemon concurrently`
- [ ] Create the `.env` file and `.env.example` file.
    - [ ] Add `NVIDIA_API_KEY`, `NVIDIA_MODEL`, `PORT=3001`, `REPOS_PATH`, and `CHAT_HISTORY_PATH`.
- [ ] Create the Server directory structure:
    - [ ] `server/index.js` (entry point)
    - [ ] `server/db/`
    - [ ] `server/routes/`
    - [ ] `server/services/`
- [ ] Write basic Express server boilerplate in `server/index.js` (CORS, JSON parsing, basic health check route).
- [ ] Update `package.json` scripts to run the server via `nodemon`.

---

## Phase 2: Database Setup

**Goal:** Configure the SQLite database and create the schema used to cache AI analyses.

- [ ] Create `server/db/database.js`.
- [ ] Initialize the `better-sqlite3` connection.
- [ ] Execute `CREATE TABLE` statements for the `projects` table (storing repo metadata).
- [ ] Execute `CREATE TABLE` statements for the `analyses` table (storing AI JSON responses).
- [ ] Write helper functions to:
    - [ ] Insert/Update a project (`upsertProject`).
    - [ ] Insert a new analysis (`saveAnalysis`).
    - [ ] Fetch the latest analysis for a project (`getLatestAnalysis`).
    - [ ] Fetch all projects (`getAllProjects`).

---

## Phase 3: Backend Core & Git Service

**Goal:** Create the service that reads the local filesystem to find repositories and extracts Git context.

- [x] Create a `scanRepos()` utility function to read `process.env.REPOS_PATH` and identify folders containing a `.git` directory.
- [x] Create `server/services/git.js`.
- [x] Implement `getRepoInfo(repoPath)` using `simple-git`:
    - [x] Fetch the latest `N` commits (author, date, message).
    - [x] Fetch `git status` (to check for uncommitted changes).
    - [x] Fetch `git diff` for uncommitted changes (limit string length to avoid massive diffs).
    - [x] Return a cleanly formatted string or object to be used as AI context.

---

## Phase 4: Antigravity Log Parser Service

**Goal:** Extract historical context from local AI chat logs to supplement Git data.

- [x] Create `server/services/chatlog.js`.
- [x] Write a function to scan `process.env.CHAT_HISTORY_PATH` for recent session logs.
- [x] Extract the conversation text from the logs.
    - *Note: Antigravity stores artifacts as `.md` files with `.metadata.json` and `.resolved` variants per session UUID folder.*
- [x] Create a robust matcher that connects a session folder to the current repository by scanning metadata summaries for the repo name.
- [x] Return the concatenated, relevant chat history. Hard limit of 8000 chars enforced.

---

## Phase 5: Nvidia AI Service

**Goal:** Integrate the Nvidia NIM API to generate structured summaries.

- [x] Create `server/services/nvidia.js`.
- [x] Initialize the `openai` client using the API key.
- [x] Define the exact `System Prompt` detailed in `plan.md` to force a specific structured JSON output.
- [x] Write the `analyzeProject(gitContext, chatContext)` function:
    - [x] Combine Git and Chat contexts.
    - [x] Send request to Nvidia NIM.
    - [x] Attempt to parse the resulting text string as `JSON.parse()`.
    - [x] Handle potential parsing errors if the AI adds markdown codeblocks.

---

## Phase 6: API Routes & Orchestration

**Goal:** Tie the services and database together into callable API endpoints.

- [x] Create `server/routes/projects.js`.
- [x] Implement `GET /api/projects`:
    - [x] Run the filesystem scanner.
    - [x] Upsert any new repos into the `projects` SQLite table.
    - [x] Return the full list of projects from the DB.
- [x] Implement `POST /api/projects/:id/analyze`:
    - [x] Look up the repo path.
    - [x] Call `git.js` and `chatlog.js` to gather context.
    - [x] Pass context to `nvidia.js`.
    - [x] Save the resulting JSON to the `analyses` table in DB.
    - [x] Return the result to the client.
- [x] Implement `GET /api/projects/:id`:
    - [x] Return the project data along with its most recent cached analysis from the DB.
- [x] Mount the routes in `server/index.js` (e.g., `app.use('/api/projects', projectRoutes)`).

---

## Phase 7: Frontend Scaffolding & Setup

**Goal:** Initialize the React client within the monorepo.

- [ ] Navigate to the `devdash` root directory.
- [ ] Run `npm create vite@latest client -- --template react`.
- [ ] cd into `client` and install dependencies: `npm install`.
- [ ] Install Tailwind CSS, PostCSS, and autoprefixer inside the `client` folder.
- [ ] Initialize Tailwind: `npx tailwindcss init -p`.
- [ ] Configure `tailwind.config.js` and `src/index.css` to enable Tailwind.
- [ ] Install `lucide-react` for icons and `axios` (or use fetch) for API calls.
- [ ] Configure Vite proxy (`client/vite.config.js`) to route `/api` to `http://localhost:3001` to avoid CORS issues locally.
- [ ] Update root `package.json` to add a concurrent dev script: `"dev": "concurrently \"npm run server\" \"npm run client\""`.

---

## Phase 8: Frontend Components & UI Assembly

**Goal:** Build the user interface according to the design defined in `plan.md`.

- [ ] Create `client/src/pages/Dashboard.jsx`.
- [ ] Create the **ProjectList** / Grid component.
    - [ ] Fetch data from `GET /api/projects` on mount.
    - [ ] Render a card for each project (Name, Status Badge, Last Analyzed Date).
- [ ] Create the **ProjectDetailModal** (or expanding card) component.
    - [ ] Clicking a project card opens this view and fetches `GET /api/projects/:id`.
    - [ ] Display the cached summary, completion percentage, completed features, and "Next Steps".
- [ ] Hook up the "Analyze Now" button inside the Project Detail view.
    - [ ] Add loading spinners/skeletons to indicate the AI is processing.
    - [ ] On completion, swap out the old cached data with the freshly generated results.

---

## Phase 9: Polish & Error Handling

**Goal:** Harden the application and handle edge cases gracefully.

- [x] **Error Boundaries:** Created `ErrorBoundary.jsx` and wrapped `ProjectDetail` to handle malformed data.
- [x] **Context Limits:** Enforced strict character limits in `git.js` and `chatlog.js`.
- [x] **Empty States:** Handled in `ProjectDetail.jsx` with a specific UI for unanalyzed repos.
- [x] **Dark Mode:** Enabled `darkMode: 'class'` in Tailwind config for more flexible styling.
- [x] **Documentation:** Created root `README.md` with setup and execution instructions.
