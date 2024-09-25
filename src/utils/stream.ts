import type stream from 'stream';

export const getStreamContent = async (stream: stream.Readable): Promise<Buffer> => {
  let buffer = Buffer.alloc(0);
  if (stream.destroyed || stream.closed || stream.errored) {
    return buffer;
  }
  stream.on('data', (chunk) => buffer = Buffer.concat([buffer, chunk]));
  return new Promise((resolve) => stream.once('end', () => resolve(buffer)));
};
