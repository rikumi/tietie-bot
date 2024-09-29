import { GenericMessage } from 'src/clients/base';

export const USAGE = '<start> <end> [step] [times] 随机选取一个数字，若超过一次则输出均值';

const roll = (start: number, end: number, step: number) => {
    return Math.floor((Math.floor((end - start) / step) + 1) * Math.random()) * step + start;
}

export const handleSlashCommand = async (message: GenericMessage) => {
    const [start, end, _step, _times] = message.text.split(/\s+/).slice(1).map(Number);
    if (Number.isNaN(start) || Number.isNaN(end)) {
        return `用法：/roll ${USAGE}`;
    }
    const step = _step || 1;
    const times = Math.max(0, Math.floor(_times || 1));

    return Array(times).fill(0).map(() => roll(start, end, step)).reduce((a, b) => a + b) / times;
}
