export type Direction = 'income' | 'expense' | 'neutral';

export type CategoryKey =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'living'
  | 'health'
  | 'education'
  | 'telecom'
  | 'travel'
  | 'transfer'
  | 'digital'
  | 'clothing'
  | 'investment'
  | 'other';

export interface Transaction {
  id: string;
  time: string;
  date: string;
  timestamp: number;
  type: string;
  counterpart: string;
  description: string;
  direction: Direction;
  amount: number;
  source: 'wechat' | 'alipay' | 'demo' | 'generic';
  category: CategoryKey;
  status?: string;
}

export interface CategoryInfo {
  name: string;
  en: string;
  color: string;
}

export interface CategorySummary {
  key: CategoryKey;
  name: string;
  color: string;
  total: number;
  count: number;
  pct: number;
}

export interface MerchantSummary {
  name: string;
  total: number;
  count: number;
  pct: number;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  savings: number;
  count: number;
  days: number;
  avgDaily: number;
  maxDay: { date: string; total: number };
  maxTransaction?: Transaction;
  dateRange: { start: string; end: string };
}

export interface FinanceModel {
  transactions: Transaction[];
  summary: FinanceSummary;
  categories: CategorySummary[];
  merchants: MerchantSummary[];
  monthly: Array<{ month: string; income: number; expense: number }>;
  daily: Array<{ date: string; expense: number; count: number }>;
  insights: Array<{ title: string; body: string }>;
}
