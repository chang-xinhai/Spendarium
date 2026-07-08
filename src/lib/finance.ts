import { CATEGORIES } from './categories';
import type { CategoryKey, FinanceModel, FinanceSummary, MerchantSummary, Transaction } from './types';

export function buildFinanceModel(transactions: Transaction[]): FinanceModel {
  const txs = transactions.filter((tx) => Number.isFinite(tx.timestamp)).sort((a, b) => b.timestamp - a.timestamp);
  const dateRange = getDateRange(txs);
  const summary = getSummary(txs, dateRange);
  const categories = getCategorySummary(txs, summary.expense);
  const merchants = getMerchants(txs, summary.expense);
  const monthly = getMonthly(txs);
  const daily = getDaily(txs);
  const insights = getInsights(summary, categories, merchants);

  return { transactions: txs, summary, categories, merchants, monthly, daily, insights };
}

function getDateRange(transactions: Transaction[]): { start: string; end: string } {
  if (!transactions.length) return { start: '2026-01-01', end: '2026-03-31' };
  const dates = transactions.map((tx) => tx.date).sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}

function getSummary(transactions: Transaction[], dateRange: { start: string; end: string }): FinanceSummary {
  const income = sum(transactions.filter((tx) => tx.direction === 'income').map((tx) => tx.amount));
  const expense = sum(transactions.filter((tx) => tx.direction === 'expense').map((tx) => tx.amount));
  const days = Math.max(1, Math.round((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / 86400000) + 1);
  const dailyMap = getDaily(transactions);
  const maxDay = dailyMap.reduce((best, row) => row.expense > best.total ? { date: row.date, total: row.expense } : best, { date: '-', total: 0 });
  const expenseTxs = transactions.filter((tx) => tx.direction === 'expense');
  const maxTransaction = expenseTxs.reduce<Transaction | undefined>((best, tx) => !best || tx.amount > best.amount ? tx : best, undefined);

  return {
    income,
    expense,
    savings: income - expense,
    count: transactions.filter((tx) => tx.direction !== 'neutral').length,
    days,
    avgDaily: expense / days,
    maxDay,
    maxTransaction,
    dateRange,
  };
}

function getCategorySummary(transactions: Transaction[], totalExpense: number) {
  const map = new Map<CategoryKey, { total: number; count: number }>();
  for (const tx of transactions) {
    if (tx.direction !== 'expense') continue;
    const current = map.get(tx.category) || { total: 0, count: 0 };
    current.total += tx.amount;
    current.count += 1;
    map.set(tx.category, current);
  }

  return [...map.entries()]
    .map(([key, value]) => ({
      key,
      name: CATEGORIES[key].name,
      color: CATEGORIES[key].color,
      total: value.total,
      count: value.count,
      pct: totalExpense ? value.total / totalExpense : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function getMerchants(transactions: Transaction[], totalExpense: number): MerchantSummary[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const tx of transactions) {
    if (tx.direction !== 'expense') continue;
    const name = tx.counterpart || tx.description || '未知商户';
    const current = map.get(name) || { total: 0, count: 0 };
    current.total += tx.amount;
    current.count += 1;
    map.set(name, current);
  }

  return [...map.entries()]
    .map(([name, value]) => ({ name, total: value.total, count: value.count, pct: totalExpense ? value.total / totalExpense : 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

function getMonthly(transactions: Transaction[]) {
  const map = new Map<string, { income: number; expense: number }>();
  for (const tx of transactions) {
    const month = tx.date.slice(0, 7);
    const current = map.get(month) || { income: 0, expense: 0 };
    if (tx.direction === 'income') current.income += tx.amount;
    if (tx.direction === 'expense') current.expense += tx.amount;
    map.set(month, current);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, ...value }));
}

function getDaily(transactions: Transaction[]) {
  const map = new Map<string, { expense: number; count: number }>();
  for (const tx of transactions) {
    if (tx.direction !== 'expense') continue;
    const current = map.get(tx.date) || { expense: 0, count: 0 };
    current.expense += tx.amount;
    current.count += 1;
    map.set(tx.date, current);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, ...value }));
}

function getInsights(summary: FinanceSummary, categories: ReturnType<typeof getCategorySummary>, merchants: MerchantSummary[]) {
  const topCategory = categories[0];
  const topMerchant = merchants[0];
  const savingsRate = summary.income ? summary.savings / summary.income : 0;
  return [
    {
      title: topCategory ? `${topCategory.name} 是当前最大支出面` : '等待更多交易',
      body: topCategory ? `占总支出的 ${(topCategory.pct * 100).toFixed(1)}%，共 ${topCategory.count} 笔。` : '上传账单后会生成分类洞察。',
    },
    {
      title: topMerchant ? `${topMerchant.name} 是最高频消费源` : '商户结构尚未形成',
      body: topMerchant ? `累计 ${formatCurrency(topMerchant.total)}，占 ${(topMerchant.pct * 100).toFixed(1)}%。` : '导入更多流水后可以识别商户集中度。',
    },
    {
      title: summary.savings >= 0 ? '当前收支为正' : '当前收支承压',
      body: summary.income ? `净储蓄率 ${(savingsRate * 100).toFixed(1)}%，日均支出 ${formatCurrency(summary.avgDaily)}。` : `未识别到收入，当前日均支出 ${formatCurrency(summary.avgDaily)}。`,
    },
  ];
}

export function formatCurrency(value: number): string {
  return `¥${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function maskMerchant(name: string): string {
  if (name.length <= 2) return '*'.repeat(name.length);
  return `${name.slice(0, 1)}${'*'.repeat(Math.min(6, name.length - 2))}${name.slice(-1)}`;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
