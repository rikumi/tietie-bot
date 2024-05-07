import readline from 'readline';
import { MatrixAuth } from 'matrix-bot-sdk';
import config from '../../config.json';

const rl = readline.createInterface(process.stdin, process.stdout);
const ask = async (q: string) => new Promise<string>(r => rl.question(q, r));

(async () => {
  if (!config.matrixHomeServer) {
    console.log('Using default home server; you can change it in config.json');
  }
  const homeserverUrl = 'https://' + (config.matrixHomeServer || 'matrix.org');
  const auth = new MatrixAuth(homeserverUrl);
  const client = await auth.passwordLogin(await ask('Username: '), await ask('Password: '), await ask('Device Name: '));
  console.log('AccessToken:', client.accessToken);
  rl.close();
})();
