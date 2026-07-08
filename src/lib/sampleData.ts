import { categorize } from './categories';
import type { Direction, Transaction } from './types';

const merchants = [
  ['喜茶 北京大学店', '餐饮美食', 18, 42],
  ['北京地铁乘车码', '交通出行', 3, 12],
  ['京东自营', '日用百货', 36, 480],
  ['网易云音乐会员', '文化休闲', 12, 88],
  ['校园一卡通充值', '生活服务', 20, 180],
  ['联通话费充值', '充值缴费', 28, 128],
  ['燕盛快印', '教育学习', 5, 36],
  ['携程旅行住宿', '酒店旅游', 180, 860],
  ['口腔医院', '医疗健康', 120, 680],
  ['Apple 服务', '数码电器', 18, 168],
  ['淘宝服饰店', '服饰装扮', 48, 520],
] as const;

export function makeDemoTransactions(): Transaction[] {
  const start = new Date('2026-01-01T08:10:00');
  const rows: Transaction[] = [];
  let seed = 42;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let day = 0; day < 92; day += 1) {
    const txPerDay = 2 + Math.floor(random() * 6);
    for (let i = 0; i < txPerDay; i += 1) {
      const pick = merchants[Math.floor(random() * merchants.length)];
      const date = new Date(start);
      date.setDate(start.getDate() + day);
      date.setHours(8 + Math.floor(random() * 15), Math.floor(random() * 60), 0, 0);

      const isIncome = day % 30 === 4 && i === 0;
      const direction: Direction = isIncome ? 'income' : 'expense';
      const amount = isIncome
        ? 1800 + Math.round(random() * 2200)
        : Math.round((pick[2] + random() * pick[3]) * 100) / 100;

      const tx: Transaction = {
        id: `demo_${day}_${i}`,
        time: formatDateTime(date),
        date: formatDate(date),
        timestamp: date.getTime(),
        type: isIncome ? '收入' : pick[1],
        counterpart: isIncome ? '奖学金 / 项目补贴' : pick[0],
        description: isIncome ? '阶段收入' : `${pick[1]} 示例交易`,
        direction,
        amount,
        source: 'demo',
        category: 'other',
      };
      tx.category = categorize(tx);
      rows.push(tx);
    }
  }

  return rows.sort((a, b) => b.timestamp - a.timestamp);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}
