import { GenericMessage } from 'src/clients/base';

export const USAGE = '<start> <end> [step] [times] 随机选取一个数字，若超过一次则输出均值';

const roll = (start: number, end: number, step: number) => {
    return Math.floor((Math.floor((end - start) / step) + 1) * Math.random()) * step + start;
}

export const handleSlashCommand = async (message: GenericMessage) => {
    const [start, end, step = 1, _times = 1] = message.text.trim().split(/\s+/).slice(1).map(Number);
    if (Number.isNaN(Number(start)) || Number.isNaN(Number(end))) {
        return `用法：/roll ${USAGE}`;
    }
    const times = Math.max(0, Math.floor(_times));

    return Array(times).fill(0).map(() => roll(start, end, step)).reduce((a, b) => a + b) / times;
}
