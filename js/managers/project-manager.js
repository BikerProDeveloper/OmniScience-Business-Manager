class ProjectManager {
  constructor() {
    this.octokit = null;
  }

  async createGitHubRepo(projectName, description = '', isPrivate = true) {
    try {
      const response = await fetch('/.netlify/functions/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, description, isPrivate })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      return data;
    } catch (error) {
      console.error('GitHub repo creation error:', error);
      throw error;
    }
  }

  async listGitHubRepos() {
    try {
      const response = await fetch('/.netlify/functions/projects');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      return data.repos;
    } catch (error) {
      console.error('GitHub repos fetch error:', error);
      throw error;
    }
  }

  async setupNetlifyDeploy(repoUrl, siteName) {
    const response = await fetch('/.netlify/functions/netlify-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl, siteName })
    });

    return await response.json();
  }

  async getNetlifySites() {
    try {
      const response = await fetch('/.netlify/functions/netlify-sites');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      return data.sites;
    } catch (error) {
      console.error('Netlify sites fetch error:', error);
      throw error;
    }
  }
}
