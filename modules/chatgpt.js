const axios = require('axios');
const config = require('../config.json');

const api = axios.create({
  baseURL: 'https://api.openai.com/',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  },
  timeout: 60000,
});

const ask = async (prompt, systemMessage) => {
  const sendRequest = async () => {
    return await api.post('/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: systemMessage,
      }, {
        role: 'user',
        content: prompt,
      }],
    }, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  let response;
  for (let retries = 0; retries < 5; retries++) {
    try {
      response = await sendRequest();
      break;
    } catch (e) {
      if (e.message.startsWith('timeout')) continue;
      throw e;
    }
  }
  if (!response) throw Error('All retries failed with timeout');

  console.log(response.data);
  return response.data.choices[0].message.content;
}

module.exports = {
  ask,
};
