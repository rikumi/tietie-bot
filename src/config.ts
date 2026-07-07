import fs from 'fs';
import path from 'path';

const config = fs.readFileSync(path.resolve(__dirname, '../config.json'), 'utf8');
export default JSON.parse(config) as any;
