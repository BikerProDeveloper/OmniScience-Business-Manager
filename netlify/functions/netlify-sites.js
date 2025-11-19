exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const response = await fetch('https://api.netlify.com/api/v1/sites', {
      headers: {
        'Authorization': \Bearer \\,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Netlify API error');
    
    const sites = await response.json();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sites })
    };

  } catch (error) {
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ error: 'Failed to fetch Netlify sites' }) 
    };
  }
};
