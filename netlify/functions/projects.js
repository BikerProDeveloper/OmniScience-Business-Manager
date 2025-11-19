const { Octokit } = require('@octokit/rest');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    if (event.httpMethod === 'POST') {
      const { name, description, isPrivate = true } = JSON.parse(event.body);
      
      const repo = await octokit.repos.createForAuthenticatedUser({
        name: name.toLowerCase().replace(/ /g, '-'),
        description,
        private: isPrivate,
        auto_init: true
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          repo: repo.data, 
          url: repo.data.html_url,
          clone_url: repo.data.clone_url
        })
      };
    }

    const repos = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 10
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ repos: repos.data })
    };

  } catch (error) {
    console.error('GitHub error:', error);
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ error: 'GitHub operation failed' }) 
    };
  }
};
