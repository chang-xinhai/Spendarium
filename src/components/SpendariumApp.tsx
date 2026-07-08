import { toPng } from 'html-to-image';
import { ArrowLeft, BarChart3, Code2, Download, FileText, LockKeyhole, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CATEGORIES } from '../lib/categories';
import { downloadHTMLReport } from '../lib/exportReport';
import { buildFinanceModel, formatCurrency, maskMerchant } from '../lib/finance';
import { parseFiles } from '../lib/parser';
import { makeDemoTransactions } from '../lib/sampleData';
import type { FinanceModel, Transaction } from '../lib/types';
import TerrainMap from './TerrainMap';

export default function SpendariumApp() {
  const demo = useMemo(() => makeDemoTransactions(), []);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [view, setView] = useState<'landing' | 'workspace'>('landing');
  const [masked, setMasked] = useState(false);
  const [error, setError] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);
  const model = useMemo(() => buildFinanceModel(transactions.length ? transactions : demo), [transactions, demo]);
  const previewModel = useMemo(() => buildFinanceModel(demo), [demo]);

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, [view]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    try {
      const parsed = await parseFiles(files);
      if (!parsed.length) {
        setError('没有识别到有效交易记录。请确认是微信/支付宝导出的 CSV，或包含 date/time 与 amount 列。');
        return;
      }
      setTransactions(parsed);
      setView('workspace');
    } catch (event) {
      setError(event instanceof Error ? event.message : '解析失败，请换一个 CSV 文件试试。');
    }
  }

  function useSample() {
    setTransactions(demo);
    setError('');
    setView('workspace');
  }

  async function exportPNG() {
    if (!exportRef.current) return;
    const dataUrl = await toPng(exportRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#f7f4ee' });
    const anchor = document.createElement('a');
    anchor.download = `spendarium-${model.summary.dateRange.start}-${model.summary.dateRange.end}.png`;
    anchor.href = dataUrl;
    anchor.click();
  }

  return view === 'landing' ? (
    <Landing preview={previewModel} onFiles={handleFiles} onSample={useSample} error={error} />
  ) : (
    <Workspace
      model={model}
      masked={masked}
      setMasked={setMasked}
      onFiles={handleFiles}
      onSample={useSample}
      onBack={() => setView('landing')}
      onExportPNG={exportPNG}
      exportRef={exportRef}
    />
  );
}

function Landing({ preview, onFiles, onSample, error }: {
  preview: FinanceModel;
  onFiles: (files: FileList | null) => void;
  onSample: () => void;
  error: string;
}) {
  return (
    <main className="landing-page">
      <nav className="top-nav">
        <a className="brand-link" href="/">
          <span className="brand-glyph">S</span>
          Spendarium
        </a>
        <div className="nav-actions">
          <a href="https://github.com/chang-xinhai/Spendarium" target="_blank" rel="noreferrer"><Code2 size={17} /> GitHub</a>
          <label className="nav-upload">
            <UploadCloud size={17} /> 上传账单
            <input type="file" accept=".csv,.txt" multiple onChange={(event) => onFiles(event.target.files)} />
          </label>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <div className="quiet-lock"><LockKeyhole size={15} /> Local-first finance map</div>
          <h1>Spendarium</h1>
          <p className="hero-subtitle">把账单变成一张消费地形图。</p>
          <p className="hero-body">
            上传微信或支付宝账单，在浏览器本地生成热力图、分类结构、趋势报告和可探索的消费地形。你的流水不离开电脑。
          </p>
          <div className="hero-actions">
            <label className="primary-cta">
              <UploadCloud size={18} /> 上传账单
              <input type="file" accept=".csv,.txt" multiple onChange={(event) => onFiles(event.target.files)} />
            </label>
            <button className="secondary-cta" onClick={onSample}>试用示例</button>
          </div>
          <div className="command-strip">
            <span>privacy</span>
            <code>all parsing runs in your browser</code>
          </div>
          {error ? <div className="landing-error">{error}</div> : null}
        </div>

        <div className="product-window" aria-label="Spendarium preview">
          <div className="window-bar">
            <i /><i /><i />
            <span>spendarium terrain</span>
          </div>
          <div className="preview-body">
            <div className="terrain-preview">
              <TerrainMap transactions={preview.transactions} compact />
              <div className="terrain-label top">high spend ridges</div>
              <div className="terrain-label bottom">time axis</div>
            </div>
            <aside className="preview-rail">
              <MiniMetric label="Total spend" value={formatCurrency(preview.summary.expense)} />
              <MiniMetric label="Daily avg" value={formatCurrency(preview.summary.avgDaily)} />
              <MiniMetric label="Peak day" value={formatCurrency(preview.summary.maxDay.total)} />
              <div className="preview-note">Peaks are spending intensity. Contours are amount levels. Rows are categories.</div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function Workspace({ model, masked, setMasked, onFiles, onSample, onBack, onExportPNG, exportRef }: {
  model: FinanceModel;
  masked: boolean;
  setMasked: (value: boolean) => void;
  onFiles: (files: FileList | null) => void;
  onSample: () => void;
  onBack: () => void;
  onExportPNG: () => void;
  exportRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <main className="workspace-page" ref={exportRef}>
      <header className="workspace-header">
        <button className="ghost-button" onClick={onBack}><ArrowLeft size={17} /> 首页</button>
        <div>
          <h1>消费地形报告</h1>
          <p>{model.summary.dateRange.start} - {model.summary.dateRange.end} · {model.summary.count} 笔记录</p>
        </div>
        <div className="workspace-actions">
          <label className="small-button"><UploadCloud size={16} /> 上传<input type="file" accept=".csv,.txt" multiple onChange={(event) => onFiles(event.target.files)} /></label>
          <button className="small-button" onClick={onSample}>示例</button>
          <button className="small-button" onClick={() => void onExportPNG()}><Download size={16} /> PNG</button>
          <button className="small-button" onClick={() => downloadHTMLReport(model, masked)}><FileText size={16} /> HTML</button>
        </div>
      </header>

      <section className="terrain-card">
        <div className="terrain-copy">
          <span className="section-kicker">Terrain map</span>
          <h2>按时间隆起的消费地貌</h2>
          <p>横向是时间，纵深是消费分类，高度代表对应日期与分类的支出强度。连续山脊意味着稳定的消费习惯，孤峰代表异常支出。</p>
        </div>
        <div className="terrain-stage">
          <TerrainMap transactions={model.transactions} />
        </div>
      </section>

      <section className="summary-row">
        <SummaryCard label="总收入" value={formatCurrency(model.summary.income)} />
        <SummaryCard label="总支出" value={formatCurrency(model.summary.expense)} />
        <SummaryCard label="净储蓄" value={`${model.summary.savings >= 0 ? '+' : '-'}${formatCurrency(model.summary.savings)}`} />
        <SummaryCard label="最大单日" value={formatCurrency(model.summary.maxDay.total)} />
      </section>

      <section className="workspace-grid">
        <Panel title="消费热力图" right={`${model.daily.length} active days`}>
          <Heatmap model={model} />
        </Panel>
        <Panel title="支出分类占比">
          <CategoryDonut model={model} />
        </Panel>
        <Panel title="Top 消费商户">
          <MerchantList model={model} masked={masked} />
        </Panel>
        <Panel title="月度收支趋势">
          <MonthlyTrend model={model} />
        </Panel>
        <Panel title="每日支出波动">
          <DailyLine model={model} />
        </Panel>
        <Panel title="交易明细" right={<label className="mask-toggle"><input type="checkbox" checked={masked} onChange={(event) => setMasked(event.target.checked)} /> 隐藏商户</label>}>
          <TransactionTable model={model} masked={masked} />
        </Panel>
      </section>
    </main>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="mini-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <article className="summary-tile"><span>{label}</span><strong>{value}</strong></article>;
}

function Panel({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="analysis-panel">
      <div className="analysis-title"><h3>{title}</h3>{right ? <div>{right}</div> : null}</div>
      {children}
    </section>
  );
}

function Heatmap({ model }: { model: FinanceModel }) {
  const days = makeHeatmapDays(model);
  const max = Math.max(...days.map((day) => day.expense), 1);
  return (
    <div className="heatmap-wrap">
      <div className="day-labels"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>
      <div className="heatmap-grid">
        {days.map((day) => {
          const level = day.expense ? Math.max(1, Math.ceil(day.expense / max * 5)) : 0;
          return <span className={`heat-cell l${level}`} key={day.date} title={`${day.date} · ${formatCurrency(day.expense)}`} />;
        })}
      </div>
    </div>
  );
}

function CategoryDonut({ model }: { model: FinanceModel }) {
  let cursor = 0;
  const gradient = model.categories.map((category) => {
    const start = cursor;
    cursor += category.pct * 100;
    return `${category.color} ${start}% ${cursor}%`;
  }).join(', ');

  return (
    <div className="donut-layout">
      <div className="donut" style={{ background: `conic-gradient(${gradient || '#e7e2d8 0% 100%'})` }}>
        <div><strong>{formatCurrency(model.summary.expense)}</strong><span>total</span></div>
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
          <span>{String(index + 1).padStart(2, '0')}</span>
          <b>{masked ? maskMerchant(merchant.name) : merchant.name}</b>
          <i><em style={{ width: `${merchant.pct * 100}%` }} /></i>
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
          <div><i className="income" style={{ height: `${Math.max(5, month.income / max * 122)}px` }} /><i className="expense" style={{ height: `${Math.max(5, month.expense / max * 122)}px` }} /></div>
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
    const y = height - (row.expense / max) * (height - 18) - 9;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="daily-line" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily spend line chart">
      <polyline points={points} fill="none" stroke="#111111" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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
            <span>{tx.time}</span>
            <b>{masked ? maskMerchant(tx.counterpart || tx.description) : tx.counterpart || tx.description}</b>
            <em style={{ color: category.color }}>{category.name}</em>
            <strong>{tx.direction === 'income' ? '+' : tx.direction === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}</strong>
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
