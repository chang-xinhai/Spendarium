import { toPng } from 'html-to-image';
import { ArrowLeft, Code2, Download, FileText, Plus, Search, Tags, UploadCloud, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { CATEGORIES } from '../lib/categories';
import { downloadHTMLReport } from '../lib/exportReport';
import { buildFinanceModel, formatCurrency, maskMerchant } from '../lib/finance';
import { parseFiles } from '../lib/parser';
import { makeDemoTransactions } from '../lib/sampleData';
import type { CategoryKey, Direction, FinanceModel, Transaction } from '../lib/types';
import TerrainMap from './TerrainMap';

const APP_BASE = import.meta.env.BASE_URL || '/';
const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];
const TAG_STORAGE_KEY = 'spendarium.tag-state.v1';

interface TopicTag {
  id: string;
  name: string;
}

interface TagState {
  tags: TopicTag[];
  assignments: Record<string, string[]>;
  deletedDefaultTagIds?: string[];
}

const DEFAULT_TAGS: TopicTag[] = [
  { id: 'topic_food', name: '美食' },
  { id: 'topic_travel', name: '旅行' },
  { id: 'topic_learning', name: '学习' },
  { id: 'topic_health', name: '健康' },
];
const LEGACY_DEFAULT_TAG_IDS = new Set(['topic_motorcycle']);

export default function SpendariumApp() {
  const demo = useMemo(() => makeDemoTransactions(), []);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [view, setView] = useState<'landing' | 'workspace'>('landing');
  const [masked, setMasked] = useState(false);
  const [error, setError] = useState('');
  const [tagState, setTagState] = useState<TagState>(() => loadTagState());
  const [activeTagId, setActiveTagId] = useState<string>('all');
  const exportRef = useRef<HTMLDivElement>(null);
  const sourceTransactions = useMemo(() => transactions.length ? transactions : demo, [transactions, demo]);
  const baseModel = useMemo(() => buildFinanceModel(sourceTransactions), [sourceTransactions]);
  const scopedTransactions = useMemo(
    () => activeTagId === 'all' ? sourceTransactions : sourceTransactions.filter((tx) => tagState.assignments[tx.id]?.includes(activeTagId)),
    [activeTagId, sourceTransactions, tagState.assignments],
  );
  const model = useMemo(() => buildFinanceModel(scopedTransactions), [scopedTransactions]);
  const previewModel = useMemo(() => buildFinanceModel(demo), [demo]);

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, [view]);

  useEffect(() => {
    saveTagState(tagState);
  }, [tagState]);

  useEffect(() => {
    if (activeTagId !== 'all' && !tagState.tags.some((tag) => tag.id === activeTagId)) setActiveTagId('all');
  }, [activeTagId, tagState.tags]);

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

  function createTag(name: string) {
    const clean = normalizeTagName(name);
    if (!clean) return '';
    const existing = tagState.tags.find((tag) => tag.name.toLowerCase() === clean.toLowerCase());
    if (existing) return existing.id;
    const defaultMatch = DEFAULT_TAGS.find((tag) => tag.name.toLowerCase() === clean.toLowerCase());
    if (defaultMatch && tagState.deletedDefaultTagIds?.includes(defaultMatch.id)) {
      setTagState((current) => ({
        ...current,
        deletedDefaultTagIds: current.deletedDefaultTagIds?.filter((id) => id !== defaultMatch.id),
        tags: [...current.tags, defaultMatch],
      }));
      return defaultMatch.id;
    }
    const nextTag = { id: makeTagId(clean), name: clean };
    setTagState((current) => ({ ...current, tags: [...current.tags, nextTag] }));
    return nextTag.id;
  }

  function deleteTag(tagId: string) {
    setTagState((current) => {
      const defaultIds = new Set(DEFAULT_TAGS.map((tag) => tag.id));
      const assignments: Record<string, string[]> = {};
      for (const [txId, values] of Object.entries(current.assignments)) {
        const next = values.filter((id) => id !== tagId);
        if (next.length) assignments[txId] = next;
      }
      const deletedDefaultTagIds = defaultIds.has(tagId)
        ? Array.from(new Set([...(current.deletedDefaultTagIds || []), tagId]))
        : current.deletedDefaultTagIds;
      return {
        ...current,
        tags: current.tags.filter((tag) => tag.id !== tagId),
        assignments,
        deletedDefaultTagIds,
      };
    });
  }

  function assignTag(txIds: string[], tagId: string) {
    if (!txIds.length || !tagId) return;
    setTagState((current) => {
      const assignments = { ...current.assignments };
      for (const id of txIds) {
        const existing = assignments[id] || [];
        if (!existing.includes(tagId)) assignments[id] = [...existing, tagId];
      }
      return { ...current, assignments };
    });
  }

  function removeTag(txId: string, tagId: string) {
    setTagState((current) => {
      const existing = current.assignments[txId] || [];
      const next = existing.filter((id) => id !== tagId);
      const assignments = { ...current.assignments };
      if (next.length) assignments[txId] = next;
      else delete assignments[txId];
      return { ...current, assignments };
    });
  }

  async function exportPNG() {
    if (!exportRef.current) return;
    const dataUrl = await toPng(exportRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#ffffff' });
    const anchor = document.createElement('a');
    const topic = activeTagId === 'all' ? 'all' : getActiveTagName(activeTagId, tagState.tags);
    anchor.download = `spendarium-${slugifyFilePart(topic)}-${model.summary.dateRange.start}-${model.summary.dateRange.end}.png`;
    anchor.href = dataUrl;
    anchor.click();
  }

  return view === 'landing' ? (
    <Landing preview={previewModel} onFiles={handleFiles} onSample={useSample} error={error} />
  ) : (
    <Workspace
      baseModel={baseModel}
      model={model}
      masked={masked}
      setMasked={setMasked}
      tagState={tagState}
      activeTagId={activeTagId}
      setActiveTagId={setActiveTagId}
      createTag={createTag}
      deleteTag={deleteTag}
      assignTag={assignTag}
      removeTag={removeTag}
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
        <a className="brand-link" href={APP_BASE}>
          <span className="brand-glyph"><BrandMark /></span>
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
            <span>隐私</span>
            <code>所有解析都在浏览器本地完成</code>
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
            </div>
            <aside className="preview-rail">
              <MiniMetric label="总支出" value={formatCurrency(preview.summary.expense)} />
              <MiniMetric label="日均支出" value={formatCurrency(preview.summary.avgDaily)} />
              <MiniMetric label="峰值单日" value={formatCurrency(preview.summary.maxDay.total)} />
              <MiniMetric label="记录笔数" value={`${preview.summary.count} 笔`} />
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function Workspace({
  baseModel,
  model,
  masked,
  setMasked,
  tagState,
  activeTagId,
  setActiveTagId,
  createTag,
  deleteTag,
  assignTag,
  removeTag,
  onFiles,
  onSample,
  onBack,
  onExportPNG,
  exportRef,
}: {
  baseModel: FinanceModel;
  model: FinanceModel;
  masked: boolean;
  setMasked: (value: boolean) => void;
  tagState: TagState;
  activeTagId: string;
  setActiveTagId: (tagId: string) => void;
  createTag: (name: string) => string;
  deleteTag: (tagId: string) => void;
  assignTag: (txIds: string[], tagId: string) => void;
  removeTag: (txId: string, tagId: string) => void;
  onFiles: (files: FileList | null) => void;
  onSample: () => void;
  onBack: () => void;
  onExportPNG: () => void;
  exportRef: React.RefObject<HTMLDivElement | null>;
}) {
  const reportTagContext = useMemo(
    () => buildReportTagContext(model.transactions, baseModel.transactions, tagState, activeTagId),
    [activeTagId, baseModel.transactions, model.transactions, tagState],
  );

  return (
    <main className="workspace-page" ref={exportRef}>
      <header className="workspace-header">
        <button className="ghost-button" onClick={onBack}><ArrowLeft size={17} /> 首页</button>
        <div>
          <h1>消费地形报告</h1>
          <p>{model.summary.dateRange.start} - {model.summary.dateRange.end} · {model.summary.count} 笔记录{activeTagId !== 'all' ? ' · 专题视图' : ''}</p>
        </div>
        <div className="workspace-actions">
          <label className="small-button"><UploadCloud size={16} /> 上传<input type="file" accept=".csv,.txt" multiple onChange={(event) => onFiles(event.target.files)} /></label>
          <button className="small-button" onClick={onSample}>示例</button>
          <button className="small-button" onClick={() => void onExportPNG()}><Download size={16} /> PNG</button>
          <button className="small-button" onClick={() => downloadHTMLReport(model, masked, reportTagContext)}><FileText size={16} /> HTML</button>
        </div>
      </header>

      <TopicScopeBar
        activeTagId={activeTagId}
        assignments={tagState.assignments}
        baseModel={baseModel}
        createTag={createTag}
        deleteTag={deleteTag}
        model={model}
        setActiveTagId={setActiveTagId}
        tags={tagState.tags}
      />

      <section className="terrain-card">
        <div className="terrain-copy">
          <span className="section-kicker">消费地形</span>
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
        <Panel title="消费热力图" span="full">
          <Heatmap model={model} />
        </Panel>
        <Panel title="支出分类占比">
          <CategoryDonut model={model} />
        </Panel>
        <Panel title="消费商户排行">
          <MerchantList model={model} masked={masked} />
        </Panel>
        <Panel title="月度收支趋势">
          <MonthlyTrend model={model} />
        </Panel>
        <Panel title="每日支出波动">
          <DailySpendChart model={model} />
        </Panel>
        <Panel title="交易明细" span="full" right={<label className="mask-toggle"><input type="checkbox" checked={masked} onChange={(event) => setMasked(event.target.checked)} /> 隐藏商户</label>}>
          <TransactionTable
            assignTag={assignTag}
            createTag={createTag}
            masked={masked}
            model={model}
            removeTag={removeTag}
            tagState={tagState}
          />
        </Panel>
      </section>
    </main>
  );
}

function TopicScopeBar({ activeTagId, assignments, baseModel, createTag, deleteTag, model, setActiveTagId, tags }: {
  activeTagId: string;
  assignments: Record<string, string[]>;
  baseModel: FinanceModel;
  createTag: (name: string) => string;
  deleteTag: (tagId: string) => void;
  model: FinanceModel;
  setActiveTagId: (tagId: string) => void;
  tags: TopicTag[];
}) {
  const [draft, setDraft] = useState('');
  const stats = useMemo(() => buildTagStats(baseModel.transactions, tags, assignments), [assignments, baseModel.transactions, tags]);
  const activeName = activeTagId === 'all' ? '全部账单' : tags.find((tag) => tag.id === activeTagId)?.name || '专题';

  function createEmptyTag() {
    const tagId = createTag(draft);
    if (!tagId) return;
    setDraft('');
  }

  return (
    <section className="topic-scope" aria-label="专题筛选">
      <div className="topic-scope-copy">
        <span><Tags size={15} /> 专题视图</span>
        <strong>{activeName}</strong>
        <em>{model.summary.count} 笔 · {formatCurrency(model.summary.expense)} 支出</em>
      </div>
      <div className="topic-control">
        <div className="topic-chips">
          <button className={activeTagId === 'all' ? 'active' : ''} type="button" onClick={() => setActiveTagId('all')}>
            All <small>{baseModel.summary.count}</small>
          </button>
          {tags.map((tag) => {
            const tagStats = stats.get(tag.id) || { count: 0, expense: 0 };
            return (
              <span className={`topic-chip ${activeTagId === tag.id ? 'active' : ''}`} key={tag.id}>
                <button type="button" onClick={() => setActiveTagId(tag.id)}>
                  {tag.name} <small>{tagStats.count}</small>
                </button>
                <button aria-label={`删除标签 ${tag.name}`} className="topic-delete" type="button" onClick={() => deleteTag(tag.id)}>
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
        <div className="topic-create-row">
          <label className="topic-create-box">
            <Plus size={14} />
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="新建标签" onKeyDown={(event) => {
              if (event.key === 'Enter') createEmptyTag();
            }} />
          </label>
          <button disabled={!normalizeTagName(draft)} type="button" onClick={createEmptyTag}>新建</button>
        </div>
      </div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="mini-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <article className="summary-tile"><span>{label}</span><strong>{value}</strong></article>;
}

function BrandMark() {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true">
      <path d="M7 24c6-7 16-7 22 0" />
      <path d="M9 19c5-5 13-5 18 0" />
      <path d="M12 14c4-3 8-3 12 0" />
      <path d="M16 9h6" />
    </svg>
  );
}

function Panel({ title, right, span, children }: { title: string; right?: ReactNode; span?: 'full'; children: ReactNode }) {
  return (
    <section className={`analysis-panel ${span === 'full' ? 'panel-full' : ''}`}>
      <div className="analysis-title"><h3>{title}</h3>{right ? <div>{right}</div> : null}</div>
      {children}
    </section>
  );
}

function Heatmap({ model }: { model: FinanceModel }) {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const years = useMemo(() => getHeatmapYears(model, todayKey), [model, todayKey]);
  const [view, setView] = useState<HeatmapView>({ type: 'rolling' });
  const heatmap = useMemo(() => buildHeatmap(model, view, todayKey), [model, view, todayKey]);
  const [hovered, setHovered] = useState<HeatmapHover | null>(null);

  useEffect(() => {
    if (view.type === 'year' && !years.includes(view.year)) setView({ type: 'rolling' });
  }, [view, years]);

  function showTooltip(day: HeatmapDay, event: ReactPointerEvent<HTMLButtonElement>) {
    setHovered({ day, x: event.clientX + 14, y: event.clientY + 14 });
  }

  return (
    <div className="heatmap-shell">
      <div className="heatmap-meta">
        <span>{heatmap.yearLabel}</span>
        <div className="heatmap-legend" aria-label="消费金额图例">
          <span>少</span><i className="l0" /><i className="l1" /><i className="l2" /><i className="l3" /><i className="l4" /><i className="l5" /><span>多</span>
        </div>
        <span>{heatmap.activeDays} 个活跃日 · 今天 {todayKey}</span>
      </div>
      <div className="heatmap-layout">
        <div className="heatmap-wrap">
          <div className="day-labels"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>
          <div className="heatmap-calendar">
            <div className="heatmap-months" style={{ gridTemplateColumns: `repeat(${heatmap.weeks.length}, var(--heat-cell))` }}>
              {heatmap.months.map((month) => (
                <span key={month.key} style={{ gridColumn: `${month.start + 1} / span ${month.span}` }}>{month.label}</span>
              ))}
            </div>
            <div className="heatmap-weeks">
              {heatmap.weeks.map((week, weekIndex) => (
                <div className="heatmap-week" key={week[0]?.date || weekIndex}>
                  {week.map((day) => (
                    <button
                      className={`heat-cell l${day.level} ${day.inRange ? '' : 'out-range'} ${day.future ? 'future' : ''}`}
                      key={day.date}
                      type="button"
                      aria-label={`${day.date} 支出 ${formatCurrency(day.expense)}，${day.count} 笔交易${day.future ? '，未来日期' : ''}`}
                      onPointerEnter={(event) => showTooltip(day, event)}
                      onPointerMove={(event) => showTooltip(day, event)}
                      onPointerLeave={() => setHovered(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="heatmap-years" aria-label="热力图时间范围">
          <button className={view.type === 'rolling' ? 'active' : ''} type="button" onClick={() => setView({ type: 'rolling' })}>最近一年</button>
          {years.map((year) => (
            <button
              className={view.type === 'year' && view.year === year ? 'active' : ''}
              key={year}
              type="button"
              onClick={() => setView({ type: 'year', year })}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
      <div className="heatmap-caption">
        <span>{heatmap.rangeLabel}</span>
      </div>
      {hovered ? (
        <div className="chart-tooltip heatmap-tooltip" style={{ left: hovered.x, top: hovered.y }}>
          <strong>{hovered.day.date}</strong>
          <span>{formatCurrency(hovered.day.expense)}</span>
          <em>{hovered.day.future ? '未来日期' : `${hovered.day.count} 笔交易`}</em>
        </div>
      ) : null}
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
        <div><strong>{formatCurrency(model.summary.expense)}</strong><span>总支出</span></div>
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
  const totals = model.monthly.reduce((sum, month) => ({
    income: sum.income + month.income,
    expense: sum.expense + month.expense,
  }), { income: 0, expense: 0 });

  return (
    <div className="month-trend">
      <div className="month-trend-legend">
        <span><i className="income" />收入 <strong>{formatCurrency(totals.income)}</strong></span>
        <span><i className="expense" />支出 <strong>{formatCurrency(totals.expense)}</strong></span>
      </div>
      <div className="month-trend-chart">
        {model.monthly.map((month) => (
          <div
            aria-label={`${month.month} 收入 ${formatCurrency(month.income)}，支出 ${formatCurrency(month.expense)}`}
            className="month-col"
            key={month.month}
            title={`${month.month}\n收入 ${formatCurrency(month.income)}\n支出 ${formatCurrency(month.expense)}`}
          >
            <div className="month-bars">
              <span className="month-bar-wrap income-wrap">
                <em>{formatCompactCurrency(month.income)}</em>
                <i className="income" style={{ height: `${Math.max(5, month.income / max * 152)}px` }} />
              </span>
              <span className="month-bar-wrap expense-wrap">
                <em>{formatCompactCurrency(month.expense)}</em>
                <i className="expense" style={{ height: `${Math.max(5, month.expense / max * 152)}px` }} />
              </span>
            </div>
            <span className="month-label">{month.month}</span>
            <div className="month-values">
              <em className="income">收 {formatCompactCurrency(month.income)}</em>
              <em className="expense">支 {formatCompactCurrency(month.expense)}</em>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailySpendChart({ model }: { model: FinanceModel }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const rows = useMemo(() => buildDailySeries(model), [model]);
  const width = 900;
  const height = 300;
  const margin = { top: 20, right: 26, bottom: 44, left: 70 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const max = Math.max(...rows.map((row) => row.expense), 1);
  const yTicks = makeTicks(max, 4);
  const xTicks = makeDateTicks(rows, 7);
  const points = rows.map((row, index) => {
    const x = margin.left + (rows.length <= 1 ? 0 : index / (rows.length - 1) * innerWidth);
    const y = margin.top + innerHeight - (row.expense / max) * innerHeight;
    return { ...row, x, y };
  });
  const linePath = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || margin.left} ${margin.top + innerHeight} L ${margin.left} ${margin.top + innerHeight} Z`;
  const hovered = hoverIndex === null ? null : points[hoverIndex];

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!svgRef.current || !points.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * width;
    const ratio = Math.min(1, Math.max(0, (x - margin.left) / innerWidth));
    setHoverIndex(Math.round(ratio * (points.length - 1)));
  }

  return (
    <div className="daily-chart-wrap">
      <svg
        ref={svgRef}
        className="daily-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="每日支出折线图"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="dailyArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#07c160" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#07c160" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((tick) => {
          const y = margin.top + innerHeight - (tick / max) * innerHeight;
          return (
            <g key={tick}>
              <line className="chart-grid" x1={margin.left} x2={width - margin.right} y1={y} y2={y} />
              <text className="chart-y-label" x={margin.left - 12} y={y + 4} textAnchor="end">{formatCompactCurrency(tick)}</text>
            </g>
          );
        })}
        <line className="chart-axis" x1={margin.left} x2={width - margin.right} y1={margin.top + innerHeight} y2={margin.top + innerHeight} />
        <line className="chart-axis" x1={margin.left} x2={margin.left} y1={margin.top} y2={margin.top + innerHeight} />
        {xTicks.map((tick) => {
          const point = points[tick.index];
          return point ? <text className="chart-x-label" key={tick.index} x={point.x} y={height - 12} textAnchor="middle">{tick.label}</text> : null;
        })}
        <path className="daily-area" d={areaPath} />
        <path className="daily-line" d={linePath} />
        {hovered ? (
          <g>
            <line className="chart-crosshair" x1={hovered.x} x2={hovered.x} y1={margin.top} y2={margin.top + innerHeight} />
            <line className="chart-crosshair" x1={margin.left} x2={width - margin.right} y1={hovered.y} y2={hovered.y} />
            <circle className="daily-point" cx={hovered.x} cy={hovered.y} r="5" />
          </g>
        ) : null}
      </svg>
      {hovered ? (
        <div
          className="chart-tooltip daily-tooltip"
          style={{ left: `${hovered.x / width * 100}%`, top: `${hovered.y / height * 100}%` }}
        >
          <strong>{hovered.date}</strong>
          <span>{formatCurrency(hovered.expense)}</span>
          <em>{hovered.count} 笔交易</em>
        </div>
      ) : null}
    </div>
  );
}

function TransactionTable({ assignTag, createTag, masked, model, removeTag, tagState }: {
  assignTag: (txIds: string[], tagId: string) => void;
  createTag: (name: string) => string;
  masked: boolean;
  model: FinanceModel;
  removeTag: (txId: string, tagId: string) => void;
  tagState: TagState;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | CategoryKey>('all');
  const [direction, setDirection] = useState<'all' | Direction>('all');
  const [sort, setSort] = useState<'time-desc' | 'time-asc' | 'amount-desc' | 'amount-asc' | 'merchant-asc'>('time-desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const filtered = useMemo(() => filterTransactions(model.transactions, { query, category, direction, sort }), [model.transactions, query, category, direction, sort]);
  const shown = filtered.slice(0, 200);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const tagById = useMemo(() => new Map(tagState.tags.map((tag) => [tag.id, tag])), [tagState.tags]);
  const allShownSelected = shown.length > 0 && shown.every((tx) => selectedSet.has(tx.id));

  useEffect(() => {
    const visibleIds = new Set(model.transactions.map((tx) => tx.id));
    setSelectedIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [model.transactions]);

  function toggleSelected(txId: string) {
    setSelectedIds((current) => current.includes(txId) ? current.filter((id) => id !== txId) : [...current, txId]);
  }

  function toggleShown() {
    const shownIds = shown.map((tx) => tx.id);
    if (allShownSelected) {
      const shownSet = new Set(shownIds);
      setSelectedIds((current) => current.filter((id) => !shownSet.has(id)));
    } else {
      setSelectedIds((current) => Array.from(new Set([...current, ...shownIds])));
    }
  }

  function assignSelected(tagId: string) {
    if (!selectedIds.length) return;
    assignTag(selectedIds, tagId);
  }

  function createAndAssign() {
    const tagId = createTag(tagDraft);
    if (!tagId || !selectedIds.length) return;
    assignTag(selectedIds, tagId);
    setTagDraft('');
  }

  return (
    <div className="tx-module">
      <div className="tx-toolbar">
        <label className="tx-search-box">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索商户、商品、类型" />
        </label>
        <select value={category} onChange={(event) => setCategory(event.target.value as 'all' | CategoryKey)} aria-label="按分类筛选">
          <option value="all">全部分类</option>
          {CATEGORY_KEYS.map((key) => <option key={key} value={key}>{CATEGORIES[key].name}</option>)}
        </select>
        <select value={direction} onChange={(event) => setDirection(event.target.value as 'all' | Direction)} aria-label="按收支方向筛选">
          <option value="all">全部收支</option>
          <option value="expense">支出</option>
          <option value="income">收入</option>
          <option value="neutral">中性</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="排序方式">
          <option value="time-desc">时间最新</option>
          <option value="time-asc">时间最早</option>
          <option value="amount-desc">金额最高</option>
          <option value="amount-asc">金额最低</option>
          <option value="merchant-asc">商户 A-Z</option>
        </select>
        <span className="tx-count">{filtered.length} 条匹配</span>
      </div>
      <div className="tx-tag-bar">
        <button className="tx-action-button" disabled={!shown.length} type="button" onClick={toggleShown}>
          {allShownSelected ? '取消当前' : '选择当前'}
        </button>
        <span>{selectedIds.length ? `已选 ${selectedIds.length} 条` : '选中交易后批量打标签'}</span>
        <label className="tag-create-box">
          <Plus size={14} />
          <input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} placeholder="新建标签" onKeyDown={(event) => {
            if (event.key === 'Enter') createAndAssign();
          }} />
        </label>
        <button className="tx-action-button primary" disabled={!selectedIds.length || !normalizeTagName(tagDraft)} type="button" onClick={createAndAssign}>添加</button>
        <div className="tag-quick-list" aria-label="已有标签">
          {tagState.tags.map((tag) => (
            <button disabled={!selectedIds.length} key={tag.id} type="button" onClick={() => assignSelected(tag.id)}>{tag.name}</button>
          ))}
        </div>
      </div>
      <div className="tx-table">
        {shown.length ? shown.map((tx) => {
          const cat = CATEGORIES[tx.category];
          const txTags = (tagState.assignments[tx.id] || []).map((id) => tagById.get(id)).filter(Boolean) as TopicTag[];
          return (
            <div className="tx-row" key={tx.id}>
              <label className="tx-select" aria-label={`选择 ${tx.time} 的交易`}>
                <input checked={selectedSet.has(tx.id)} type="checkbox" onChange={() => toggleSelected(tx.id)} />
              </label>
              <span>{tx.time}</span>
              <div className="tx-merchant">
                <b>{masked ? maskMerchant(tx.counterpart || tx.description) : tx.counterpart || tx.description}</b>
                {txTags.length ? (
                  <div className="tx-tags">
                    {txTags.map((tag) => (
                      <button key={tag.id} type="button" onClick={() => removeTag(tx.id, tag.id)}>
                        {tag.name}<X size={11} />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <em className="tx-category" style={{ color: cat.color, borderColor: `${cat.color}44` }}><i style={{ background: cat.color }} />{cat.name}</em>
              <small>{sourceLabel(tx.source)}</small>
              <strong className={tx.direction}>{tx.direction === 'income' ? '+' : tx.direction === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}</strong>
            </div>
          );
        }) : <div className="empty-state">暂无匹配的交易记录</div>}
      </div>
    </div>
  );
}

interface HeatmapDay {
  date: string;
  expense: number;
  count: number;
  level: 0 | 1 | 2 | 3 | 4 | 5;
  inRange: boolean;
  future: boolean;
}

interface HeatmapHover {
  day: HeatmapDay;
  x: number;
  y: number;
}

type HeatmapView = { type: 'rolling' } | { type: 'year'; year: number };

function getHeatmapYears(model: FinanceModel, todayKey: string) {
  const years = new Set<number>([parseDateKey(todayKey).getFullYear()]);
  for (const tx of model.transactions) years.add(Number(tx.date.slice(0, 4)));
  return [...years].filter(Number.isFinite).sort((a, b) => b - a);
}

function parseDateKey(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function startOfMondayWeek(date: Date) {
  const start = new Date(date);
  start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return start;
}

function endOfSundayWeek(date: Date) {
  const end = new Date(date);
  end.setDate(date.getDate() + (6 - ((date.getDay() + 6) % 7)));
  return end;
}

function isDateKeyBetween(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function buildHeatmap(model: FinanceModel, view: HeatmapView, todayKey: string) {
  const daily = new Map(model.daily.map((row) => [row.date, row]));
  const today = parseDateKey(todayKey);
  const isRolling = view.type === 'rolling';
  const displayStart = isRolling ? addDays(today, -364) : new Date(view.year, 0, 1);
  const displayEnd = isRolling ? today : new Date(view.year, 11, 31);
  const start = startOfMondayWeek(displayStart);
  const end = endOfSundayWeek(displayEnd);
  const max = Math.max(
    ...model.daily
      .filter((row) => isDateKeyBetween(row.date, toDateKey(displayStart), toDateKey(displayEnd)) && row.date <= todayKey)
      .map((row) => row.expense),
    1,
  );

  const days: HeatmapDay[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const date = toDateKey(cursor);
    const row = daily.get(date);
    const inDisplayRange = cursor >= displayStart && cursor <= displayEnd;
    const future = date > todayKey;
    const expense = inDisplayRange && !future ? row?.expense || 0 : 0;
    const ratio = expense / max;
    const level = (expense === 0 ? 0 : ratio > 0.8 ? 5 : ratio > 0.55 ? 4 : ratio > 0.32 ? 3 : ratio > 0.12 ? 2 : 1) as HeatmapDay['level'];
    days.push({ date, expense, count: inDisplayRange && !future ? row?.count || 0 : 0, level, inRange: inDisplayRange, future });
    cursor.setDate(cursor.getDate() + 1);
  }
  const weeks: HeatmapDay[][] = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));
  const months = buildHeatmapMonths(start, displayStart, displayEnd, weeks.length);
  const activeDays = days.filter((day) => day.inRange && !day.future && day.expense > 0).length;
  const yearLabel = isRolling ? `最近一年 · 截至今天` : `${view.year} 年`;
  const rangeLabel = `${toDateKey(displayStart)} - ${toDateKey(displayEnd)}`;
  return { weeks, months, yearLabel, activeDays, rangeLabel };
}

function buildHeatmapMonths(calendarStart: Date, labelStart: Date, calendarEnd: Date, weekCount: number) {
  const labels: Array<{ key: string; label: string; start: number; span: number }> = [];
  const cursor = new Date(labelStart.getFullYear(), labelStart.getMonth(), 1);
  while (cursor <= calendarEnd) {
    const start = Math.max(0, Math.floor((cursor.getTime() - calendarStart.getTime()) / (86400000 * 7)));
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    const nextStart = Math.min(weekCount, Math.floor((next.getTime() - calendarStart.getTime()) / (86400000 * 7)));
    const span = Math.max(1, nextStart - start);
    labels.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: `${cursor.getMonth() + 1}月`,
      start,
      span,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return labels;
}

function buildDailySeries(model: FinanceModel) {
  const daily = new Map(model.daily.map((row) => [row.date, row]));
  const rows: Array<{ date: string; expense: number; count: number }> = [];
  const cursor = parseDateKey(model.summary.dateRange.start);
  const end = parseDateKey(model.summary.dateRange.end);
  while (cursor <= end) {
    const date = toDateKey(cursor);
    const row = daily.get(date);
    rows.push({ date, expense: row?.expense || 0, count: row?.count || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return rows.length ? rows : [{ date: model.summary.dateRange.start, expense: 0, count: 0 }];
}

function makeDateTicks(rows: Array<{ date: string }>, maxTicks: number) {
  if (rows.length <= 1) return [{ index: 0, label: rows[0]?.date || '' }];
  const step = Math.max(1, Math.floor((rows.length - 1) / (maxTicks - 1)));
  const ticks = [];
  for (let index = 0; index < rows.length; index += step) ticks.push({ index, label: formatShortDate(rows[index].date) });
  if (ticks[ticks.length - 1]?.index !== rows.length - 1) ticks.push({ index: rows.length - 1, label: formatShortDate(rows[rows.length - 1].date) });
  return ticks;
}

function makeTicks(max: number, count: number) {
  return Array.from({ length: count + 1 }, (_, index) => Math.round(max / count * index));
}

function formatCompactCurrency(value: number) {
  if (value >= 10000) return `¥${(value / 10000).toFixed(1)}w`;
  if (value >= 1000) return `¥${(value / 1000).toFixed(1)}k`;
  return `¥${Math.round(value)}`;
}

function formatShortDate(date: string) {
  const parsed = parseDateKey(date);
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

function filterTransactions(transactions: Transaction[], filters: {
  query: string;
  category: 'all' | CategoryKey;
  direction: 'all' | Direction;
  sort: 'time-desc' | 'time-asc' | 'amount-desc' | 'amount-asc' | 'merchant-asc';
}) {
  const query = filters.query.trim().toLowerCase();
  return transactions
    .filter((tx) => {
      if (filters.category !== 'all' && tx.category !== filters.category) return false;
      if (filters.direction !== 'all' && tx.direction !== filters.direction) return false;
      if (!query) return true;
      return `${tx.counterpart} ${tx.description} ${tx.type}`.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (filters.sort === 'time-asc') return a.timestamp - b.timestamp;
      if (filters.sort === 'amount-desc') return b.amount - a.amount;
      if (filters.sort === 'amount-asc') return a.amount - b.amount;
      if (filters.sort === 'merchant-asc') return (a.counterpart || a.description).localeCompare(b.counterpart || b.description, 'zh-CN');
      return b.timestamp - a.timestamp;
    });
}

function buildTagStats(transactions: Transaction[], tags: TopicTag[], assignments: Record<string, string[]>) {
  const stats = new Map(tags.map((tag) => [tag.id, { count: 0, expense: 0 }]));
  for (const tx of transactions) {
    const txTags = assignments[tx.id] || [];
    for (const tagId of txTags) {
      const current = stats.get(tagId);
      if (!current) continue;
      if (tx.direction !== 'neutral') current.count += 1;
      if (tx.direction === 'expense') current.expense += tx.amount;
    }
  }
  return stats;
}

function buildReportTagContext(currentTransactions: Transaction[], allTransactions: Transaction[], state: TagState, activeTagId: string) {
  const tagById = new Map(state.tags.map((tag) => [tag.id, tag.name]));
  const stats = buildTagStats(allTransactions, state.tags, state.assignments);
  return {
    activeTagName: activeTagId === 'all' ? '全部账单' : getActiveTagName(activeTagId, state.tags),
    tagSummary: state.tags.map((tag) => {
      const tagStats = stats.get(tag.id) || { count: 0, expense: 0 };
      return { name: tag.name, count: tagStats.count, expense: tagStats.expense };
    }),
    transactionTags: Object.fromEntries(
      currentTransactions.map((tx) => [
        tx.id,
        (state.assignments[tx.id] || []).map((tagId) => tagById.get(tagId)).filter(Boolean) as string[],
      ]),
    ),
  };
}

function getActiveTagName(activeTagId: string, tags: TopicTag[]) {
  return tags.find((tag) => tag.id === activeTagId)?.name || '专题';
}

function loadTagState(): TagState {
  if (typeof window === 'undefined') return { tags: DEFAULT_TAGS, assignments: {} };
  try {
    const raw = window.localStorage.getItem(TAG_STORAGE_KEY);
    if (!raw) return { tags: DEFAULT_TAGS, assignments: {} };
    const parsed = JSON.parse(raw) as Partial<TagState>;
    const deletedDefaultTagIds = Array.isArray(parsed.deletedDefaultTagIds)
      ? parsed.deletedDefaultTagIds.filter((value): value is string => typeof value === 'string')
      : [];
    const assignedTagIds = new Set<string>();
    if (parsed.assignments && typeof parsed.assignments === 'object') {
      for (const values of Object.values(parsed.assignments)) {
        if (!Array.isArray(values)) continue;
        for (const value of values) {
          if (typeof value === 'string') assignedTagIds.add(value);
        }
      }
    }
    const savedTags = Array.isArray(parsed.tags)
      ? parsed.tags
        .filter((tag): tag is TopicTag => typeof tag?.id === 'string' && typeof tag?.name === 'string')
        .filter((tag) => !LEGACY_DEFAULT_TAG_IDS.has(tag.id) || assignedTagIds.has(tag.id))
      : [];
    const defaultTagIds = new Set(DEFAULT_TAGS.map((tag) => tag.id));
    const customTags = savedTags.filter((tag) => !defaultTagIds.has(tag.id));
    const tags = [...DEFAULT_TAGS.filter((tag) => !deletedDefaultTagIds.includes(tag.id)), ...customTags];
    const assignments: Record<string, string[]> = {};
    if (parsed.assignments && typeof parsed.assignments === 'object') {
      for (const [txId, values] of Object.entries(parsed.assignments)) {
        if (!Array.isArray(values)) continue;
        const clean = values.filter((value): value is string => typeof value === 'string' && tags.some((tag) => tag.id === value));
        if (clean.length) assignments[txId] = Array.from(new Set(clean));
      }
    }
    return { tags, assignments, deletedDefaultTagIds };
  } catch {
    return { tags: DEFAULT_TAGS, assignments: {} };
  }
}

function saveTagState(state: TagState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(state));
}

function normalizeTagName(name: string) {
  return name.trim().replace(/\s+/g, ' ').slice(0, 18);
}

function makeTagId(name: string) {
  const slug = Array.from(name).map((char) => char.charCodeAt(0).toString(36)).join('').slice(0, 24);
  return `topic_${slug}_${Date.now().toString(36)}`;
}

function slugifyFilePart(value: string) {
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'topic';
}

function sourceLabel(source: Transaction['source']) {
  if (source === 'wechat') return '微信';
  if (source === 'alipay') return '支付宝';
  if (source === 'demo') return '示例';
  return 'CSV';
}
