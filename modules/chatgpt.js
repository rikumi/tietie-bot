const uuid = require('uuid');
const axios = require('axios');

class ChatGPT {
  constructor(token) {
    this.token = token;
    this.resetChat();
  }

  resetChat() {
    this.conversationId = null;
    this.parentId = uuid.v4();
  }

  async ask(prompt, onMessage) {
    await this.getTokens();
    let response = await axios.request({
      method: 'POST',
      url: 'https://chat.openai.com/backend-api/conversation',
      responseType: 'stream',
      data: {
        action: 'next',
        messages: [
          {
            id: uuid.v4(),
            role: 'user',
            content: {
              content_type: 'text',
              parts: [prompt],
            },
          },
        ],
        model: 'text-davinci-002-render',
        conversation_id: this.conversationId,
        parent_message_id: this.parentId,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.authorization}`,
        'Content-Type': 'application/json',
      }
    });

    const stream = response.data;

    let buffer = Buffer.alloc(0);
    let lastData = '';

    stream.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const data = buffer.toString('utf8').split('\n\n').slice(-2)[0];
      console.log(data);
      if (lastData === data || data === 'data: [DONE]') return;
      const message = JSON.parse(data.replace(/^data:\s+/, '')).message.content.parts[0];
      if (!message) return;
      onMessage(message);
    });

    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
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

    const response = await axios.request({
      method: 'GET',
      url: 'https://chat.openai.com/api/auth/session',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
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
