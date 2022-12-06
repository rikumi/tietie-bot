const uuid = require('uuid');
const axios = require('axios');

class ChatGPT {
  constructor(config, conversationId = null) {
    this.config = config;
    this.conversationId = conversationId;
    this.parentId = uuid.v4();
  }

  async *ask(prompt) {
    if (!this.config.Authorization || !this.validateToken(this.config.Authorization))
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
        'Authorization': `Bearer ${this.config.Authorization}`,
        'Content-Type': 'application/json',
      }
    });

    const stream = response.data;
    let previous = '', accumulated = '';
    
    while (true) {
      const chunk = await new Promise((resolve, reject) => {
        stream.on('data', resolve);
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      if (!chunk) return;
  
      accumulated += chunk.toString('utf8');
      const lastData = accumulated.split(/(\r?\n){2}/)[-1].replace(/^data:\s+/, '').trim();
      if (!lastData || lastData === '[DONE]') break;
      const payload = JSON.parse(lastData);
  
      const next = payload.message.content.parts[0];
      if (previous === next) continue;
      previous = next;
      this.parentId = payload.message.id;
      this.conversationId = payload.conversation_id;
      yield next;
    }
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
