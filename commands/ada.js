const { openaiApiKey } = require('../config.json');
const axios = require('axios');

module.exports = async (ctx) => {
  const { message } = ctx;
  const question = message.text.trim().replace(/^\/ada\s+/, '');
  if (!question) {
    return 'No input specified.';
  }
  const res = await axios.post('https://api.openai.com/v1/completions', {
    model: 'ada',
    prompt: `Q: ${question}\nA: `,
    stop: '\n',
    max_tokens: 1000,
    temperature: 1,
  }, {
    headers: { 'Authorization': `Bearer ${openaiApiKey}` }
  });
  return res.data.choices[0].text.trim() || 'No answer returned.';
};
