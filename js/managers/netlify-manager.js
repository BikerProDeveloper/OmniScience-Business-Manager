class NetlifyManager {
  constructor() {
    this.baseURL = 'https://api.netlify.com/api/v1';
  }

  async createSiteFromGit(repoUrl, siteName) {
    const response = await fetch(\\/sites\, {
      method: 'POST',
      headers: {
        'Authorization': \Bearer \\,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: siteName,
        repo: { url: repoUrl },
        build_settings: {
          cmd: 'npm run build',
          dir: 'dist'
        }
      })
    });

    return await response.json();
  }

  async deploySite(siteId) {
    const response = await fetch(\\/sites/\/builds\, {
      method: 'POST',
      headers: {
        'Authorization': \Bearer \\
      }
    });

    return await response.json();
  }

  async getSiteDeploys(siteId) {
    const response = await fetch(\\/sites/\/deploys\, {
      headers: {
        'Authorization': \Bearer \\
      }
    });

    return await response.json();
  }
}
