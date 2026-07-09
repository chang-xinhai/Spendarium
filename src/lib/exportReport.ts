import { formatCurrency, maskMerchant } from './finance';
import type { FinanceModel } from './types';

export interface ReportTagContext {
  activeTagName: string;
  tagSummary: Array<{ name: string; count: number; expense: number }>;
  transactionTags: Record<string, string[]>;
}

export function downloadHTMLReport(model: FinanceModel, masked: boolean, tagContext?: ReportTagContext): void {
  const html = createHTMLReport(model, masked, tagContext);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const topic = tagContext?.activeTagName ? slugifyFilePart(tagContext.activeTagName) : 'all';
  anchor.download = `spendarium-report-${topic}-${model.summary.dateRange.start}-${model.summary.dateRange.end}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function createHTMLReport(model: FinanceModel, masked: boolean, tagContext?: ReportTagContext): string {
  const categories = model.categories.map((row) => `
    <tr>
      <td>${escapeHTML(row.name)}</td>
      <td>${formatCurrency(row.total)}</td>
      <td>${row.count}</td>
      <td>${(row.pct * 100).toFixed(1)}%</td>
    </tr>`).join('');

  const merchants = model.merchants.map((row) => `
    <tr>
      <td>${escapeHTML(masked ? maskMerchant(row.name) : row.name)}</td>
      <td>${formatCurrency(row.total)}</td>
      <td>${row.count}</td>
      <td>${(row.pct * 100).toFixed(1)}%</td>
    </tr>`).join('');

  const tagSummary = tagContext?.tagSummary.length
    ? tagContext.tagSummary.map((row) => `
      <tr>
        <td>${escapeHTML(row.name)}</td>
        <td>${formatCurrency(row.expense)}</td>
        <td>${row.count}</td>
      </tr>`).join('')
    : '<tr><td colspan="3">暂无标签</td></tr>';

  const transactions = model.transactions.map((tx) => {
    const tags = tagContext?.transactionTags[tx.id] || [];
    const amount = `${tx.direction === 'income' ? '+' : tx.direction === 'expense' ? '-' : ''}${formatCurrency(tx.amount)}`;
    return `
      <tr>
        <td>${escapeHTML(tx.time)}</td>
        <td>${escapeHTML(masked ? maskMerchant(tx.counterpart || tx.description) : tx.counterpart || tx.description)}</td>
        <td>${escapeHTML(tx.type)}</td>
        <td>${escapeHTML(tags.join(' / ') || '-')}</td>
        <td>${amount}</td>
      </tr>`;
  }).join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Spendarium Report</title>
  <style>
    body { margin: 0; background: #08080d; color: #f1ede6; font-family: ui-sans-serif, system-ui, sans-serif; }
    main { max-width: 920px; margin: 0 auto; padding: 48px 24px; }
    h1 { font-family: Georgia, serif; font-style: italic; font-size: 56px; line-height: 0.95; margin: 0 0 8px; color: #ead79b; }
    p { color: #a7a29a; line-height: 1.7; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 32px 0; }
    .card { border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 18px; background: rgba(255,255,255,.035); }
    .label { color: #68635c; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; }
    .value { display: block; margin-top: 8px; font-family: ui-monospace, monospace; font-size: 20px; }
    table { border-collapse: collapse; width: 100%; margin: 18px 0 34px; }
    th, td { border-bottom: 1px solid rgba(255,255,255,.08); padding: 11px 8px; text-align: left; }
    th { color: #c8a44e; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
    .topic { color: #ead79b; font-family: ui-monospace, monospace; }
  </style>
</head>
<body>
  <main>
    <h1>Spendarium</h1>
    <p>消费分析报告 · ${model.summary.dateRange.start} - ${model.summary.dateRange.end}<br />专题：<span class="topic">${escapeHTML(tagContext?.activeTagName || '全部账单')}</span><br />数据由浏览器本地生成，没有上传到服务器。</p>
    <section class="grid">
      <div class="card"><span class="label">Income</span><strong class="value">${formatCurrency(model.summary.income)}</strong></div>
      <div class="card"><span class="label">Expense</span><strong class="value">${formatCurrency(model.summary.expense)}</strong></div>
      <div class="card"><span class="label">Savings</span><strong class="value">${model.summary.savings >= 0 ? '+' : '-'}${formatCurrency(model.summary.savings)}</strong></div>
      <div class="card"><span class="label">Transactions</span><strong class="value">${model.summary.count}</strong></div>
    </section>
    <h2>分类支出</h2>
    <table><thead><tr><th>分类</th><th>金额</th><th>笔数</th><th>占比</th></tr></thead><tbody>${categories}</tbody></table>
    <h2>Top 商户</h2>
    <table><thead><tr><th>商户</th><th>金额</th><th>笔数</th><th>占比</th></tr></thead><tbody>${merchants}</tbody></table>
    <h2>标签摘要</h2>
    <table><thead><tr><th>标签</th><th>支出</th><th>笔数</th></tr></thead><tbody>${tagSummary}</tbody></table>
    <h2>交易标签明细</h2>
    <table><thead><tr><th>时间</th><th>商户</th><th>类型</th><th>标签</th><th>金额</th></tr></thead><tbody>${transactions}</tbody></table>
  </main>
</body>
</html>`;
}

function slugifyFilePart(value: string): string {
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'topic';
}

function escapeHTML(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}
