import { GenericMessage } from 'src/clients/base';
import matrix from 'src/clients/matrix';

export const USAGE = `<mxcUri> 强制结束 Matrix 媒体文件的上传过程`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const mxcUri = message.text.trim().split(/\s+/)[1];
  if (!mxcUri) return;
  await matrix.flushMedia(mxcUri);
  return 'OK';
};
