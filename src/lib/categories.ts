import type { CategoryInfo, CategoryKey, Transaction } from './types';

export const CATEGORIES: Record<CategoryKey, CategoryInfo> = {
  food: { name: '餐饮美食', en: 'Dining', color: '#e6b768' },
  transport: { name: '交通出行', en: 'Transport', color: '#5da8ff' },
  shopping: { name: '购物消费', en: 'Shopping', color: '#c58cff' },
  entertainment: { name: '休闲娱乐', en: 'Leisure', color: '#a682ff' },
  living: { name: '生活服务', en: 'Living', color: '#67d7a1' },
  health: { name: '医疗健康', en: 'Health', color: '#f28a82' },
  education: { name: '教育学习', en: 'Learning', color: '#8aa6ff' },
  telecom: { name: '通讯充值', en: 'Telecom', color: '#67d6dd' },
  travel: { name: '旅行住宿', en: 'Travel', color: '#e9ca7d' },
  transfer: { name: '转账红包', en: 'Transfer', color: '#d4b87a' },
  digital: { name: '数码电器', en: 'Digital', color: '#b3bccf' },
  clothing: { name: '服饰美妆', en: 'Style', color: '#e59bc3' },
  investment: { name: '投资理财', en: 'Investment', color: '#75d6c4' },
  other: { name: '其他', en: 'Other', color: '#a9a39a' },
};

const RULES: Array<{ cat: CategoryKey; keywords: string[] }> = [
  { cat: 'food', keywords: ['餐饮', '美食', '饭', '面', '咖啡', '奶茶', '外卖', '饿了么', '美团', 'kfc', '肯德基', '麦当劳', '星巴克', '便利店', '全家'] },
  { cat: 'transport', keywords: ['交通', '出行', '滴滴', '高德打车', '地铁', '公交', '12306', '停车', '加油', '高速', '机票', '火车'] },
  { cat: 'shopping', keywords: ['购物', '淘宝', '京东', '拼多多', '小红书', '超市', '百货', '自营', '便利蜂'] },
  { cat: 'entertainment', keywords: ['休闲', '娱乐', '电影', '游戏', '会员', '优酷', '腾讯视频', '爱奇艺', '网易云', 'spotify', 'steam', 'gpt', 'gemini'] },
  { cat: 'living', keywords: ['生活', '水费', '电费', '物业', '洗衣', '充电', '校园卡', '一卡通', '维修', '家居'] },
  { cat: 'health', keywords: ['医疗', '健康', '医院', '药', '口腔', '体检'] },
  { cat: 'education', keywords: ['教育', '学习', '打印', '教材', '课程', '学校', '大学'] },
  { cat: 'telecom', keywords: ['话费', '通讯', '联通', '移动', '电信', '充值缴费'] },
  { cat: 'travel', keywords: ['酒店', '旅游', '携程', '去哪儿', '住宿', '民宿'] },
  { cat: 'transfer', keywords: ['转账', '红包', '群收款', '收款'] },
  { cat: 'digital', keywords: ['数码', '电器', 'vpn', '软件', '订阅', '服务器', '云服务'] },
  { cat: 'clothing', keywords: ['服饰', '美妆', '衣服', '鞋', '背包', '美容'] },
  { cat: 'investment', keywords: ['理财', '基金', '余额宝', '零钱通', '投资'] },
];

const ALIPAY_MAP: Record<string, CategoryKey> = {
  餐饮美食: 'food',
  交通出行: 'transport',
  日用百货: 'shopping',
  文化休闲: 'entertainment',
  生活服务: 'living',
  转账红包: 'transfer',
  酒店旅游: 'travel',
  医疗健康: 'health',
  充值缴费: 'telecom',
  教育学习: 'education',
  数码电器: 'digital',
  服饰装扮: 'clothing',
  美容美发: 'clothing',
  投资理财: 'investment',
  家居家装: 'living',
};

export function categorize(tx: Pick<Transaction, 'source' | 'type' | 'counterpart' | 'description'>): CategoryKey {
  if (tx.source === 'alipay' && ALIPAY_MAP[tx.type]) return ALIPAY_MAP[tx.type];

  const haystack = `${tx.type} ${tx.counterpart} ${tx.description}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) return rule.cat;
  }

  return 'other';
}
