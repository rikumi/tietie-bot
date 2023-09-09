const axios = require('axios');
const config = require('../config.json');

const api = axios.create({
  baseURL: 'https://api.openai.com/',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  },
  timeout: 60000,
});

async function* ask(prompt, systemMessage) {
  yield `[请求中]`;

  console.log('[SYSTEM]', systemMessage);
  console.log('[USER]', prompt);

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
      responseType: 'stream',
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
      if (retries) yield `[第 ${retries} 次重试]`;
      response = await sendRequest();
      break;
    } catch (e) {
      if (e.message.startsWith('timeout')) continue;
      throw e;
    }
  }
  if (!response) throw Error('All retries failed with timeout');

  let buffer = Buffer.alloc(0);
  let latestString = '';
  let endOrError = false;

  const stream = response.data;
  yield '[接收中]';

  stream.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    try {
      console.log(buffer.toString('utf8'));
      const payload = JSON.parse(buffer.toString('utf8').trim().split('\n\n').slice(-2)[0].replace(/^data:\s+/, ''));
      latestString = payload.choices[0].message.content;
    } catch (e) {
      console.error(e);
      return;
    }
  });
  stream.on('end', () => endOrError = true);
  stream.on('error', (error) => endOrError = error);

  let lastYieldedString = '';

  while (!endOrError) {
    lastYieldedString = latestString;
    yield latestString; // awaits
    while (!endOrError && lastYieldedString === latestString) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (lastYieldedString !== latestString) {
    yield latestString; // awaits
  }

  console.log('[CHATGPT]', latestString);

  if (endOrError && endOrError !== true) {
    throw endOrError;
  }
}

module.exports = {
  ask,
};
