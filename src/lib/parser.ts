import { categorize } from './categories';
import type { Direction, Transaction } from './types';

export async function parseFiles(files: FileList | File[]): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  for (const file of Array.from(files)) {
    const buffer = await file.arrayBuffer();
    const text = decodeBuffer(buffer);
    transactions.push(...parseCSV(text, file.name));
  }
  return mergeTransactions(transactions);
}

function decodeBuffer(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    try {
      return new TextDecoder('gb18030').decode(buffer);
    } catch {
      return new TextDecoder('gbk').decode(buffer);
    }
  }
}

export function parseCSV(text: string, fileName: string): Transaction[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  if (text.includes('微信支付账单') || fileName.includes('微信')) return parseWeChat(lines);
  if (text.includes('支付宝') || text.includes('交易分类') || fileName.includes('支付宝')) return parseAlipay(lines);
  return parseGeneric(lines);
}

function parseWeChat(lines: string[]): Transaction[] {
  const headerIdx = lines.findIndex((line) => line.startsWith('交易时间,'));
  if (headerIdx < 0) return [];

  return lines.slice(headerIdx + 1).flatMap((line, index) => {
    const cols = splitCSVLine(line).map((col) => col.trim());
    if (cols.length < 6) return [];

    const [time, type, counterpart, product, direction, amountRaw, , status, txId] = cols;
    const amount = parseAmount(amountRaw);
    if (!time.match(/^\d{4}-/) || Number.isNaN(amount)) return [];

    const tx: Transaction = {
      id: txId || `wechat_${time}_${amount}_${index}`,
      time,
      date: time.slice(0, 10),
      timestamp: new Date(time).getTime(),
      type,
      counterpart,
      description: product,
      direction: parseDirection(direction),
      amount,
      source: 'wechat',
      category: 'other',
      status,
    };
    tx.category = categorize(tx);
    return [tx];
  });
}

function parseAlipay(lines: string[]): Transaction[] {
  const headerIdx = lines.findIndex((line) => line.startsWith('交易时间,'));
  if (headerIdx < 0) return [];

  return lines.slice(headerIdx + 1).flatMap((line, index) => {
    const cols = splitCSVLine(line).map((col) => col.trim());
    if (cols.length < 8) return [];

    const [time, type, counterpart, , product, direction, amountRaw, , status, txId] = cols;
    const amount = parseAmount(amountRaw);
    if (!time.match(/^\d{4}-/) || Number.isNaN(amount)) return [];

    const tx: Transaction = {
      id: txId || `alipay_${time}_${amount}_${index}`,
      time,
      date: time.slice(0, 10),
      timestamp: new Date(time).getTime(),
      type,
      counterpart,
      description: product,
      direction: parseDirection(direction),
      amount,
      source: 'alipay',
      category: 'other',
      status,
    };
    tx.category = categorize(tx);
    return [tx];
  });
}

function parseGeneric(lines: string[]): Transaction[] {
  const headerIdx = lines.findIndex((line) => /date|time|交易时间/i.test(line) && /amount|金额/i.test(line));
  if (headerIdx < 0) return [];
  const headers = splitCSVLine(lines[headerIdx]).map((header) => header.trim().toLowerCase());

  return lines.slice(headerIdx + 1).flatMap((line, index) => {
    const cols = splitCSVLine(line).map((col) => col.trim());
    const at = (...names: string[]) => {
      const idx = headers.findIndex((h) => names.some((name) => h.includes(name)));
      return idx >= 0 ? cols[idx] || '' : '';
    };

    const time = at('time', 'date', '交易时间') || cols[0];
    const amount = parseAmount(at('amount', '金额') || cols[1]);
    if (!time || Number.isNaN(amount)) return [];

    const directionText = at('direction', '收/支', '类型');
    const tx: Transaction = {
      id: `generic_${time}_${amount}_${index}`,
      time: time.length === 10 ? `${time} 12:00:00` : time,
      date: time.slice(0, 10),
      timestamp: new Date(time).getTime(),
      type: at('category', '分类') || '其他',
      counterpart: at('merchant', 'counterpart', '交易对方') || '未知商户',
      description: at('description', '商品', '说明') || '',
      direction: directionText ? parseDirection(directionText) : amount < 0 ? 'expense' : 'income',
      amount: Math.abs(amount),
      source: 'generic',
      category: 'other',
    };
    tx.category = categorize(tx);
    return [tx];
  });
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && inQuote && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (char === ',' && !inQuote) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  result.push(current);
  return result;
}

function parseDirection(value: string): Direction {
  if (value.includes('支') || value.toLowerCase().includes('expense')) return 'expense';
  if (value.includes('收') || value.toLowerCase().includes('income')) return 'income';
  return 'neutral';
}

function parseAmount(value: string): number {
  return Number.parseFloat(value.replace(/[¥￥,\s]/g, ''));
}

export function mergeTransactions(transactions: Transaction[]): Transaction[] {
  const seen = new Map<string, Transaction>();
  for (const tx of transactions) {
    const key = `${tx.timestamp}_${tx.amount.toFixed(2)}_${tx.direction}`;
    const current = seen.get(key);
    if (!current || (tx.source === 'alipay' && current.source !== 'alipay')) {
      seen.set(key, tx);
    }
  }
  return [...seen.values()].sort((a, b) => b.timestamp - a.timestamp);
}
