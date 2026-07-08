import { toPng } from 'html-to-image';
import {
  BarChart3,
  CalendarDays,
  Download,
  FileText,
  Flame,
  Gauge,
  PieChart,
  ShieldCheck,
  Sparkles,
  Tags,
  UploadCloud,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { CATEGORIES } from '../lib/categories';
import { downloadHTMLReport } from '../lib/exportReport';
import { buildFinanceModel, formatCurrency, maskMerchant } from '../lib/finance';
import { parseFiles } from '../lib/parser';
import { makeDemoTransactions } from '../lib/sampleData';
import type { FinanceModel, Transaction } from '../lib/types';
import SpendingField from './SpendingField';

export default function SpendariumApp() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => makeDemoTransactions());
  const [masked, setMasked] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);
  const model = useMemo(() => buildFinanceModel(transactions), [transactions]);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    try {
      const parsed = await parseFiles(files);
      if (!parsed.length) {
        setError('没有识别到有效交易记录。请确认是微信/支付宝导出的 CSV，或包含 date/time 与 amount 列。');
        return;
      }
      setTransactions(parsed);
    } catch (event) {
      setError(event instanceof Error ? event.message : '解析失败，请换一个 CSV 文件试试。');
    }
  }

  async function exportPNG() {
    if (!exportRef.current) return;
    const dataUrl = await toPng(exportRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#06060b',
    });
    const anchor = document.createElement('a');
    anchor.download = `spendarium-${model.summary.dateRange.start}-${model.summary.dateRange.end}.png`;
    anchor.href = dataUrl;
    anchor.click();
  }

  return (
    <div className="ledger-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-orbit"><Sparkles size={20} /></div>
          <h1>Spendarium</h1>
          <p>黑曜记账 · Personal Finance</p>
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          <a className="nav-item active" href="#dashboard"><BarChart3 size={19} /><span>财务总览</span></a>
          <a className="nav-item" href="#heatmap"><Flame size={19} /><span>消费热力图</span></a>
          <a className="nav-item" href="#categories"><Tags size={19} /><span>分类分析</span></a>
          <a className="nav-item" href="#field"><Gauge size={19} /><span>3D 轨迹场</span></a>
        </nav>
        <div className="privacy-card">
          <strong><ShieldCheck size={15} /> Local only</strong>
          <span>No account. No upload. Your bills stay in this browser.</span>
        </div>
      </aside>

      <main className="ledger-main" ref={exportRef}>
        <header className="dashboard-header" id="dashboard">
          <div>
            <h2><em>Dashboard</em> · 财务总览</h2>
            <p>{model.summary.dateRange.start} - {model.summary.dateRange.end} · {model.summary.count} 笔记录</p>
          </div>
          <div className="header-actions">
            <label
              className={`compact-upload ${dragging ? 'dragging' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void handleUpload(event.dataTransfer.files);
              }}
            >
              <UploadCloud size={17} />
              <span>上传 CSV</span>
              <input type="file" accept=".csv,.txt" multiple onChange={(event) => void handleUpload(event.target.files)} />
            </label>
            <button className="btn gold" onClick={() => setTransactions(makeDemoTransactions())}>Demo</button>
            <button className="btn" onClick={() => void exportPNG()}><Download size={16} /> PNG</button>
            <button className="btn" onClick={() => downloadHTMLReport(model, masked)}><FileText size={16} /> HTML</button>
          </div>
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        <section className="summary-grid" aria-label="Summary">
          <SummaryCard tone="income" label="总收入" value={formatCurrency(model.summary.income)} sub={`${model.transactions.filter((tx) => tx.direction === 'income').length} 笔收入`} />
          <SummaryCard tone="expense" label="总支出" value={formatCurrency(model.summary.expense)} sub={`${model.transactions.filter((tx) => tx.direction === 'expense').length} 笔支出`} />
          <SummaryCard tone={model.summary.savings >= 0 ? 'income' : 'expense'} label="净储蓄" value={`${model.summary.savings >= 0 ? '+' : '-'}${formatCurrency(model.summary.savings)}`} sub={`日均支出 ${formatCurrency(model.summary.avgDaily)}`} />
          <SummaryCard tone="count" label="最大单日" value={formatCurrency(model.summary.maxDay.total)} sub={model.summary.maxDay.date} />
        </section>

        <section className="panel heatmap-panel" id="heatmap">
          <PanelTitle icon={<Flame size={16} />} title="消费热力图" right={`${model.daily.length} active days`} />
          <Heatmap model={model} />
        </section>

        <section className="analysis-grid" id="categories">
          <div className="panel">
            <PanelTitle icon={<PieChart size={16} />} title="支出分类占比" />
            <CategoryDonut model={model} />
          </div>
          <div className="panel">
            <PanelTitle icon={<BarChart3 size={16} />} title="Top 消费商户" />
            <MerchantList model={model} masked={masked} />
          </div>
          <div className="panel wide">
            <PanelTitle icon={<CalendarDays size={16} />} title="月度收支趋势" />
            <MonthlyTrend model={model} />
          </div>
          <div className="panel wide">
            <PanelTitle icon={<Gauge size={16} />} title="每日支出波动" />
            <DailyLine model={model} />
          </div>
        </section>

        <section className="panel transaction-panel">
          <PanelTitle
            icon={<FileText size={16} />}
            title="交易明细"
            right={<label className="mask-toggle"><input type="checkbox" checked={masked} onChange={(event) => setMasked(event.target.checked)} /> 隐藏商户</label>}
          />
          <TransactionTable model={model} masked={masked} />
        </section>

        <section className="panel field-panel" id="field">
          <PanelTitle icon={<Sparkles size={16} />} title="3D 消费轨迹场" right="Three.js enhancement" />
          <div className="field-layout">
            <div className="field-copy">
              <h3>把原本的分析再多一层空间感。</h3>
              <p>这里不是替代热力图和图表，而是用时间、分类和金额生成一张可旋转的消费轨迹场，方便 demo 时展示视觉冲击力。</p>
              <div className="insight-list">
                {model.insights.map((item) => (
                  <article className="insight-card" key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </article>
                ))}
              </div>
            </div>
            <div className="field-canvas">
              <SpendingField transactions={model.transactions} minHeight={360} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <article className={`summary-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </article>
  );
}

function PanelTitle({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) {
  return (
    <div className="panel-title">
      <span>{icon}{title}</span>
      {right ? <small>{right}</small> : null}
    </div>
  );
}

function Heatmap({ model }: { model: FinanceModel }) {
  const days = makeHeatmapDays(model);
  const max = Math.max(...days.map((day) => day.expense), 1);
  return (
    <div className="heatmap-wrap">
      <div className="day-labels"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>
      <div className="heatmap-grid" style={{ gridTemplateRows: 'repeat(7, 14px)' }}>
        {days.map((day) => {
          const level = day.expense ? Math.max(1, Math.ceil(day.expense / max * 5)) : 0;
          return (
            <span
              className={`heat-cell l${level}`}
              key={day.date}
              title={`${day.date} · ${formatCurrency(day.expense)} · ${day.count} 笔`}
            />
          );
        })}
      </div>
    </div>
  );
}

function CategoryDonut({ model }: { model: FinanceModel }) {
  let cursor = 0;
  const gradient = model.categories.length
    ? model.categories.map((category) => {
      const start = cursor;
      cursor += category.pct * 100;
      return `${category.color} ${start}% ${cursor}%`;
    }).join(', ')
    : '#2a2a2f 0% 100%';

  return (
    <div className="donut-layout">
      <div className="donut" style={{ background: `conic-gradient(${gradient})` }}>
        <div><strong>{formatCurrency(model.summary.expense)}</strong><span>total spend</span></div>
      </div>
      <div className="category-list">
        {model.categories.slice(0, 8).map((category) => (
          <div className="category-row" key={category.key}>
            <span><i style={{ background: category.color }} />{category.name}</span>
            <strong>{(category.pct * 100).toFixed(1)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function MerchantList({ model, masked }: { model: FinanceModel; masked: boolean }) {
  return (
    <div className="merchant-list">
      {model.merchants.map((merchant, index) => (
        <div className="merchant-row" key={merchant.name}>
          <span className="rank">{String(index + 1).padStart(2, '0')}</span>
          <span className="merchant-name">{masked ? maskMerchant(merchant.name) : merchant.name}</span>
          <div className="bar-track"><i style={{ width: `${merchant.pct * 100}%` }} /></div>
          <strong>{formatCurrency(merchant.total)}</strong>
        </div>
      ))}
    </div>
  );
}

function MonthlyTrend({ model }: { model: FinanceModel }) {
  const max = Math.max(...model.monthly.flatMap((month) => [month.income, month.expense]), 1);
  return (
    <div className="month-trend">
      {model.monthly.map((month) => (
        <div className="month-col" key={month.month}>
          <div className="month-bars">
            <i className="income" style={{ height: `${Math.max(4, month.income / max * 120)}px` }} />
            <i className="expense" style={{ height: `${Math.max(4, month.expense / max * 120)}px` }} />
          </div>
          <span>{month.month}</span>
        </div>
      ))}
    </div>
  );
}

function DailyLine({ model }: { model: FinanceModel }) {
  const rows = model.daily.slice(-90);
  const max = Math.max(...rows.map((row) => row.expense), 1);
  const width = 820;
  const height = 180;
  const points = rows.map((row, index) => {
    const x = rows.length <= 1 ? 0 : index / (rows.length - 1) * width;
    const y = height - (row.expense / max) * (height - 16) - 8;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="daily-line" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily spend line chart">
      <defs>
        <linearGradient id="dailyFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#c8a44e" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#c8a44e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${height} ${points} ${width},${height}`} fill="url(#dailyFill)" stroke="none" />
      <polyline points={points} fill="none" stroke="#c8a44e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TransactionTable({ model, masked }: { model: FinanceModel; masked: boolean }) {
  return (
    <div className="tx-table">
      {model.transactions.slice(0, 80).map((tx) => {
        const category = CATEGORIES[tx.category];
        return (
          <div className="tx-row" key={tx.id}>
            <span className="tx-time">{tx.time}</span>
            <span className="tx-merchant">{masked ? maskMerchant(tx.counterpart || tx.description) : tx.counterpart || tx.description}</span>
            <span className="tx-cat" style={{ color: category.color }}>{category.name}</span>
            <span className="tx-source">{tx.source}</span>
            <strong className={tx.direction}>{tx.direction === 'income' ? '+' : tx.direction === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}</strong>
          </div>
        );
      })}
    </div>
  );
}

function makeHeatmapDays(model: FinanceModel) {
  const daily = new Map(model.daily.map((row) => [row.date, row]));
  const start = new Date(model.summary.dateRange.start);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(model.summary.dateRange.end);
  end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));

  const days: Array<{ date: string; expense: number; count: number }> = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    const row = daily.get(date);
    days.push({ date, expense: row?.expense || 0, count: row?.count || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
