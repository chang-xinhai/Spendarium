import { toPng } from 'html-to-image';
import {
  BarChart3,
  Download,
  FileText,
  Gauge,
  Landmark,
  Orbit,
  Play,
  Settings,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { CATEGORIES } from '../lib/categories';
import { downloadHTMLReport } from '../lib/exportReport';
import { buildFinanceModel, formatCurrency, maskMerchant } from '../lib/finance';
import { parseFiles } from '../lib/parser';
import { makeDemoTransactions } from '../lib/sampleData';
import type { Transaction } from '../lib/types';
import SpendingField from './SpendingField';

export default function SpendariumApp() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => makeDemoTransactions());
  const [isDragging, setDragging] = useState(false);
  const [masked, setMasked] = useState(false);
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
    <div className="app-shell" ref={exportRef}>
      <aside className="left-rail">
        <div className="brand">
          <div className="brand-mark"><Orbit size={22} /></div>
          <h1>Spendarium</h1>
          <p>黑曜预算 · Local finance</p>
        </div>
        <nav className="rail-nav" aria-label="Spendarium sections">
          <button className="rail-item active"><BarChart3 size={20} /><span>财务总览</span></button>
          <button className="rail-item"><Gauge size={20} /><span>消费轨迹</span></button>
          <button className="rail-item"><FileText size={20} /><span>报告导出</span></button>
          <button className="rail-item"><Settings size={20} /><span>设置</span></button>
        </nav>
        <div className="rail-footer">
          <strong><ShieldCheck size={14} /> Local only</strong>
          <p>No account. No upload. Your payment records stay inside this browser.</p>
        </div>
      </aside>

      <main className="main-stage">
        <section className="metric-bar" aria-label="Finance summary">
          <Metric label="Time range" value={`${model.summary.dateRange.start} - ${model.summary.dateRange.end}`} />
          <Metric label="Total spend" value={formatCurrency(model.summary.expense)} />
          <Metric label="Income" value={formatCurrency(model.summary.income)} tone="positive" />
          <Metric label="Savings" value={`${model.summary.savings >= 0 ? '+' : '-'}${formatCurrency(model.summary.savings)}`} tone={model.summary.savings >= 0 ? 'positive' : 'negative'} />
          <Metric label="Daily avg" value={formatCurrency(model.summary.avgDaily)} />
        </section>

        <section className="visual-panel" aria-label="3D spending field">
          <SpendingField transactions={model.transactions} />
          <div className="field-caption">
            <h2>Cashflow<br />Field</h2>
            <p>每一笔交易按照时间和分类落在轨道上。金额越大，亮度和高度越高；收入以绿色标记，支出沿分类分层。</p>
          </div>
          <div className="field-legend">
            {model.categories.slice(0, 6).map((category) => (
              <span className="legend-item" key={category.key}>
                <i className="legend-dot" style={{ background: category.color }} />
                {category.name}
              </span>
            ))}
          </div>
        </section>

        <section className="timeline-strip" aria-label="Monthly spending trend">
          <button className="play-button" aria-label="Replay spending animation"><Play size={18} fill="currentColor" /></button>
          <div className="timeline-bars">
            {model.daily.slice(-72).map((row) => {
              const max = Math.max(...model.daily.map((item) => item.expense), 1);
              return <i className="timeline-bar" key={row.date} style={{ height: `${Math.max(8, row.expense / max * 54)}px` }} title={`${row.date} ${formatCurrency(row.expense)}`} />;
            })}
          </div>
          <div className="timeline-meta">
            {model.monthly.length} months<br />
            {model.summary.count} records
          </div>
        </section>
      </main>

      <aside className="right-inspector">
        <section className="panel-section">
          <h2 className="section-title">Data source <UploadCloud size={14} /></h2>
          <label
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
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
            <UploadCloud size={26} />
            <strong>Upload CSV</strong>
            <span>微信 / 支付宝账单，或通用 CSV</span>
            <input type="file" accept=".csv,.txt" multiple onChange={(event) => void handleUpload(event.target.files)} />
          </label>
          <div className="button-row">
            <button className="action-button gold" onClick={() => setTransactions(makeDemoTransactions())}>Demo data</button>
            <button className="action-button" onClick={() => setTransactions([])}>Clear</button>
          </div>
          <label className="toggle-line">
            <input type="checkbox" checked={masked} onChange={(event) => setMasked(event.target.checked)} />
            隐藏商户名称用于截图和导出
          </label>
          {error ? <div className="error-banner">{error}</div> : null}
          <div className="status-note">
            <strong>Local only</strong>
            <span>文件只在浏览器内解析；GitHub Pages 不会接收你的账单。</span>
          </div>
        </section>

        <section className="panel-section">
          <h2 className="section-title">Insights <Landmark size={14} /></h2>
          <div className="insight-list">
            {model.insights.map((item) => (
              <article className="insight-card" key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <h2 className="section-title">Categories <span>{formatCurrency(model.summary.expense)}</span></h2>
          <div className="category-list">
            {model.categories.length ? model.categories.slice(0, 8).map((category) => (
              <div className="category-row" key={category.key}>
                <div className="row-top">
                  <span className="row-name">{category.name}</span>
                  <span className="row-value">{(category.pct * 100).toFixed(1)}%</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${category.pct * 100}%`, background: category.color }} />
                </div>
              </div>
            )) : <div className="empty-state">导入账单后显示分类结构。</div>}
          </div>
        </section>

        <section className="panel-section">
          <h2 className="section-title">Top merchants</h2>
          <div className="merchant-list">
            {model.merchants.map((merchant) => (
              <div className="merchant-row" key={merchant.name}>
                <div className="row-top">
                  <span className="row-name">{masked ? maskMerchant(merchant.name) : merchant.name}</span>
                  <span className="row-value">{formatCurrency(merchant.total)}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${merchant.pct * 100}%`, background: 'linear-gradient(90deg, #8f7334, #ead79b)' }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <h2 className="section-title">Export <Download size={14} /></h2>
          <div className="button-row">
            <button className="action-button" onClick={() => void exportPNG()}><Download size={16} /> PNG</button>
            <button className="action-button" onClick={() => downloadHTMLReport(model, masked)}><FileText size={16} /> HTML</button>
          </div>
        </section>
      </aside>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <strong className={`metric-value ${tone || ''}`}>{value}</strong>
    </div>
  );
}
