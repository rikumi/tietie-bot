const uuid = require('uuid');
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://chat.openai.com/',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  },
  timeout: 10000,
});

class ChatGPT {
  constructor(token) {
    this.token = token;
    this.resetChat();
  }

  resetChat() {
    this.conversationId = null;
    this.parentId = uuid.v4();
    this.lastResponsePromise = Promise.resolve();
  }

  async *ask(prompt) {
    await this.getTokens();

    let error = undefined;
    this.lastResponsePromise = this.lastResponsePromise.then(() => api.post('/backend-api/conversation', {
      action: 'next',
      messages: [{
        id: uuid.v4(),
        role: 'user',
        content: {
          content_type: 'text',
          parts: [prompt],
        },
      }],
      model: 'text-davinci-002-render',
      conversation_id: this.conversationId,
      parent_message_id: this.parentId,
    }, {
      responseType: 'stream',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.authorization}`,
        'Content-Type': 'application/json',
      },
    })).catch(e => error = e);

    let buffer = Buffer.alloc(0);
    let latestString = '';
    let endOrError = false;

    const res = await this.lastResponsePromise;
    if (error) {
      console.error(error);
      throw error;
    }
    const stream = res.data;

    stream.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const payload = JSON.parse(buffer.toString('utf8').trim().split('\n\n').slice(-2)[0].replace(/^data:\s+/, ''));
        if (!latestString) {
          this.conversationId = payload.conversation_id;
          this.parentId = payload.message.id;
        }
        latestString = payload.message.content.parts[0];
      } catch (e) {
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

    if (endOrError !== true) {
      throw endOrError;
    }
  }

  validateToken(token) {
    if (!token) return false;
    const parsed = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return Date.now() <= parsed.exp * 1000;
  }

  async getTokens() {
    if (!this.token) {
      throw new Error('No session token provided');
    }

    const response = await api.get('/api/auth/session', {
      headers: {
        'Cookie': `__Secure-next-auth.session-token=${this.token}`
      }
    });

    try {
      const cookies = response.headers['set-cookie'];
      const sessionCookie = cookies.find(cookie => cookie.startsWith('__Secure-next-auth.session-token'));
      this.token = sessionCookie.split('=')[1];
      this.authorization = response.data.accessToken;
    } catch (err) {
      throw new Error(`Failed to fetch new session tokens due to: ${err}`);
    }
  }
}

ChatGPT.instances = {};
ChatGPT.getInstance = (token) => {
  if (!ChatGPT.instances[token]) {
    ChatGPT.instances[token] = new ChatGPT(token);
  }
  return ChatGPT.instances[token];
};

module.exports = ChatGPT;
