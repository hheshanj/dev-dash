const { Octokit } = require('@octokit/rest');
const simpleGit = require('simple-git');
const path = require('path');

let octokit = null;

function getOctokit() {
  if (octokit) return octokit;
  
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('GITHUB_TOKEN not configured - GitHub features disabled');
    return null;
  }
  
  octokit = new Octokit({ auth: token });
  return octokit;
}

async function getRemoteOrigin(repoPath) {
  const git = simpleGit(repoPath);
  try {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    if (origin && origin.refs.fetch) {
      const url = origin.refs.fetch;
      const match = url.match(/github\.com[/:]([\w-]+)\/([\w.-]+)/);
      if (match) {
        return { owner: match[1], repo: match[2].replace('.git', '') };
      }
    }
  } catch (err) {
    console.error('Error getting remote origin:', err.message);
  }
  return null;
}

async function getRepoStats(repoPath) {
  const github = getOctokit();
  if (!github) return null;
  
  const remote = await getRemoteOrigin(repoPath);
  if (!remote) return null;
  
  try {
    const { data: repo } = await github.repos.get({
      owner: remote.owner,
      repo: remote.repo
    });
    
    return {
      owner: remote.owner,
      repo: remote.repo,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      language: repo.language,
      description: repo.description,
      pushedAt: repo.pushed_at,
      defaultBranch: repo.default_branch
    };
  } catch (err) {
    console.error('Error fetching repo stats:', err.message);
    return null;
  }
}

async function getIssues(repoPath) {
  const github = getOctokit();
  if (!github) return [];
  
  const remote = await getRemoteOrigin(repoPath);
  if (!remote) return [];
  
  try {
    const { data: issues } = await github.issues.listForRepo({
      owner: remote.owner,
      repo: remote.repo,
      state: 'open',
      per_page: 10
    });
    
    return issues.map(issue => ({
      number: issue.number,
      title: issue.title,
      labels: issue.labels.map(l => l.name),
      createdAt: issue.created_at,
      comments: issue.comments
    }));
  } catch (err) {
    console.error('Error fetching issues:', err.message);
    return [];
  }
}

async function getPullRequests(repoPath) {
  const github = getOctokit();
  if (!github) return [];
  
  const remote = await getRemoteOrigin(repoPath);
  if (!remote) return [];
  
  try {
    const { data: prs } = await github.pulls.list({
      owner: remote.owner,
      repo: remote.repo,
      state: 'open',
      per_page: 10
    });
    
    return prs.map(pr => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      createdAt: pr.created_at,
      draft: pr.draft,
      comments: pr.comments
    }));
  } catch (err) {
    console.error('Error fetching pull requests:', err.message);
    return [];
  }
}

async function getRemoteRepos() {
  const github = getOctokit();
  if (!github) return [];
  
  try {
    const { data: repos } = await github.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated'
    });
    
    return repos.map(repo => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      language: repo.language,
      private: repo.private,
      updatedAt: repo.updated_at,
      htmlUrl: repo.html_url
    }));
  } catch (err) {
    console.error('Error fetching remote repos:', err.message);
    return [];
  }
}

module.exports = { getRepoStats, getIssues, getPullRequests, getRemoteRepos, getRemoteOrigin };
