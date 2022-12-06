const uuid = require('uuid');
const axios = require('axios');

class ChatGPT {
  constructor(config, conversationId = null) {
    this.config = config;
    this.conversationId = conversationId;
    this.parentId = uuid.v4();
  }

  async ask(prompt) {
    if (!this.config.Authorization || !this.validateToken(this.config.Authorization))
      await this.getTokens();

    let response = await axios.request({
      method: 'POST',
      url: 'https://chat.openai.com/backend-api/conversation',
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
        'Authorization': `Bearer ${this.config.Authorization}`,
        'Content-Type': 'application/json',
      }
    });

    try {
      const parts = response.data.split('\n');
      response = JSON.parse(parts[parts.length-5].split('data: ')[1]);
    } catch (err) {
      throw new Error(`Could not find or parse actual response text due to: ${err}`);
    }

    this.parentId = response.message.id;
    this.conversationId = response.conversation_id;

    return response.message.content.parts[0];
  }

  validateToken(token) {
    if (!token) return false;
    const parsed = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return Date.now() <= parsed.exp * 1000;
  }

  async getTokens() {
    if (!this.config.hasOwnProperty('SessionToken')) {
      throw new Error('No session token provided');
    }

    const response = await axios.request({
      method: 'GET',
      url: 'https://chat.openai.com/api/auth/session',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'Cookie': `__Secure-next-auth.session-token=${this.config.SessionToken}`
      }
    });

    try {
      const cookies = response.headers['set-cookie'];
      const sessionCookie = cookies.find(cookie => cookie.startsWith('__Secure-next-auth.session-token'));

      this.config.SessionToken = sessionCookie.split('=')[1];
      this.config.Authorization = response.data.accessToken;
    } catch (err) {
      throw new Error(`Failed to fetch new session tokens due to: ${err}`);
    }
  }
}

const instances = {};

module.exports = (ctx, bot) => {
  const { message } = ctx;
  const token = message.text.replace(/^\/chatgpt_token\s+/, '').trim();
  if (!token || !/^[\w\-.]+$/.test(token)) {
    ctx.reply('Token 不符合格式！', { reply_to_message_id: message.message_id });
    return;
  }
  const chatId = message.chat.id;
  instances[chatId] = new ChatGPT({ SessionToken: token });
  ctx.reply('Token 设置成功，会话初始化成功', { reply_to_message_id: message.message_id });
};

module.exports.instances = instances;
