import crypto from 'crypto';
import { IncomingMessage, ServerResponse } from 'http';
import qs from 'querystring';
import wecom from '@wecom/crypto';
import config from '../../../config.json';

// WebHook URL: /wecom-webhook?robot_callback_format=json
export const ROUTE = /^\/wecom-webhook\?.*/;

const wecomWebhookHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const { msg_signature, timestamp, nonce, echostr } = qs.parse(req.url?.split('?')?.[1] ?? '');
  if (!echostr || typeof echostr !== 'string') {
    res.writeHead(400);
    res.end();
    return;
  }
  const signature = crypto.createHash('sha1')
    .update([config.wecom.token, timestamp, nonce, echostr].sort().join('')).digest('hex');

  if (signature !== msg_signature) {
    res.writeHead(403);
    res.end();
    return;
  }
  const { message } = wecom.decrypt(config.wecom.encodingAESKey, echostr);
  res.writeHead(200);
  res.write(message);
  res.end();
};

export default wecomWebhookHandler;
