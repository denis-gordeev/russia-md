#!/usr/bin/env node
/**
 * Enrich invade-imported terms with better etymology, category, and details.
 * Also fix non-standard categories across the entire DB.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse, stringify } from 'yaml';

const DIR = join(import.meta.dirname, '..', 'data', 'terminology');

// Category normalization map
const CAT_MAP = {
  'names': 'culture',
  'internet': 'tech',
  'transport': 'daily',
  'geography': 'culture',
  'computing': 'tech',
  'politics': 'culture',
  'science': 'tech',
  'social': 'daily',
  'finance': 'business',
  'gaming': 'tech',
  'academic': 'education',
  'workplace': 'business',
};

const validCats = new Set(['tech', 'daily', 'food', 'culture', 'education', 'business', 'media', 'medical', 'legal', 'military', 'nature', 'sports', 'slang']);

// Manual enrichment for the 8 weak invade entries
const ENRICHMENTS = {
  '學渣.yaml': {
    category: 'education',
    subcategory: '教育',
    etymology: { origin: '中國校園俗語，形容成績很差的學生，與「學霸」相對。台灣對應「吊車尾」（排名末段）或「後段班」。' },
  },
  '實時.yaml': {
    category: 'tech',
    subcategory: '軟體與程式開發',
    etymology: { origin: '表示「即時」的概念。台灣用「即時」（立即的時間），中國用「實時」（real-time 直譯）。科技文件中差異尤其明顯。' },
  },
  '封禁.yaml': {
    category: 'tech',
    subcategory: '網路與通訊',
    etymology: { origin: '網路平台對帳號或內容的限制措施。台灣稱「封鎖」，中國稱「封禁」（禁止+封鎖的結合）。' },
  },
  '打車.yaml': {
    category: 'daily',
    subcategory: '交通',
    etymology: { origin: '招叫計程車。台灣說「叫車」或「搭計程車」（小黃），中國說「打車」或「打的」（「的」來自 taxi 的粵語音譯「的士」）。' },
  },
  '打醬油.yaml': {
    category: 'daily',
    subcategory: '日常生活',
    fork_type: 'E',
    etymology: { origin: '中國網路用語，表示路過、不相干、與我無關。源自 2008 年「我出來買醬油的」網路梗。台灣不用此說法，會說「湊熱鬧」或「偶然路過」。' },
  },
  '直白.yaml': {
    category: 'daily',
    subcategory: '日常生活',
    etymology: { origin: '形容說話坦率不拐彎。中國較常說「直白」，台灣較常用「直接」或「明確」。兩岸都能理解但使用頻率不同。' },
  },
  '長知識.yaml': {
    category: 'daily',
    subcategory: '日常生活',
    etymology: { origin: '表示學到新知識。中國說「長知識」（「長」= 增長），台灣說「學到了」或「受教了」（較謙遜）。' },
  },
  '長臉.yaml': {
    category: 'daily',
    subcategory: '日常生活',
    etymology: { origin: '為某人增添光彩、面子。中國說「長臉」或「給某人長臉」，台灣說「給面子」或「出風頭」（語境略有不同）。' },
  },
};

// Also enrich some notable invade terms that could use better etymology
const NOTABLE_ENRICHMENTS = {
  '內卷.yaml': {
    category: 'daily',
    fork_type: 'E',
    etymology: { origin: '「involution」的中文翻譯，原為人類學術語。2020年後成為中國最熱門流行語，形容無意義的過度競爭（如職場無止境加班）。台灣對應「過度競爭」或「內耗」，但「內卷」一詞在台灣年輕族群中也開始流通。' },
  },
  '躺平.yaml': {
    category: 'daily',
    fork_type: 'E',
    etymology: { origin: '2021年中國流行語，表示放棄競爭、不再努力追求社會期望。與「內卷」互為反義。台灣對應「擺爛」或「我就爛」。此詞反映中國年輕世代對996工作文化的消極抵抗。' },
  },
  '潤.yaml': {
    category: 'daily',
    fork_type: 'E',
    etymology: { origin: '諧音自英文 Run，意思是「離開中國、移民海外」。2022年後在中國社群媒體廣泛使用，常被審查。台灣不使用此詞，直接說「移民」。' },
  },
  '吃瓜.yaml': {
    category: 'daily',
    fork_type: 'E',
    etymology: { origin: '源自「吃瓜群眾」，比喻旁觀看熱鬧的人（像嗑瓜子看戲）。中國網路高頻用語。台灣說「看八卦」「看戲」「吃瓜」（已部分傳入台灣年輕族群）。' },
  },
  '摳圖.yaml': {
    category: 'tech',
    subcategory: '設計與多媒體',
    etymology: { origin: '影像處理中將主體從背景分離。中國稱「摳圖」（摳出圖像），台灣稱「去背」（去除背景）。兩岸用語邏輯相反：中國描述「取出主體」，台灣描述「移除背景」。' },
  },
  '碰瓷.yaml': {
    category: 'daily',
    fork_type: 'E',
    etymology: { origin: '原指故意撞壞別人的瓷器再敲詐，後泛指假車禍、假受傷的詐騙手法。中國高頻使用。台灣說「假車禍」或「敲竹槓」。' },
  },
  '真香.yaml': {
    category: 'daily',
    fork_type: 'E',
    etymology: { origin: '源自2014年《變形計》節目，王境澤說「我就算餓死也不吃你們的東西」後大快朵頤說「真香」。指態度反轉、被打臉。台灣可對應「嘴巴說不要，身體很誠實」。' },
  },
  '性價比.yaml': {
    category: 'daily',
    etymology: { origin: '「性能價格比」的簡稱。中國說「性價比」，台灣說「CP值」（源自英文 Cost-Performance ratio）。兩者語意相同但台灣借用英文縮寫。' },
  },
  '刷手機.yaml': {
    category: 'daily',
    etymology: { origin: '無目的地瀏覽手機內容。中國說「刷手機」（像刷卡一樣快速翻動），台灣說「滑手機」（描述手指在螢幕上滑動的動作）。兩岸都很形象但取不同動作特徵。' },
  },
  'YYDS.yaml': {
    category: 'slang',
    fork_type: 'E',
    etymology: { origin: '「永遠的神」拼音首字母縮寫（Yǒng Yuǎn De Shén）。2021年中國網路最熱門縮寫，表示極度崇拜。台灣不使用此縮寫，會說「最強」「神等級」。' },
  },
  'AWSL.yaml': {
    category: 'slang',
    fork_type: 'E',
    etymology: { origin: '「啊我死了」拼音首字母縮寫（Ā Wǒ Sǐ Le），表示被萌到或被美到「要死了」。B站彈幕高頻用語。台灣不使用此縮寫。' },
  },
  '拉黑.yaml': {
    category: 'tech',
    subcategory: '網路與通訊',
    etymology: { origin: '將對方加入黑名單。中國說「拉黑」（拉進黑名單），台灣說「封鎖」。微信、QQ 等中國社群軟體的標準用語。' },
  },
  '屏蔽.yaml': {
    category: 'tech',
    subcategory: '網路與通訊',
    etymology: { origin: '隱藏或阻擋特定內容或使用者。中國常用「屏蔽」（用屏風遮蔽），台灣用「封鎖」「隱藏」「遮蔽」等，視語境而定。在中國也常指政府對網路內容的審查。' },
  },
  '充值.yaml': {
    category: 'daily',
    etymology: { origin: '為預付費帳戶加錢。中國說「充值」（充入價值），台灣說「儲值」（儲存價值）或「加值」。悠遊卡「加值」、遊戲「儲值」為台灣常見用法。' },
  },
  '視頻電話.yaml': {
    category: 'tech',
    etymology: { origin: '透過網路進行的影像通話。中國說「視頻電話」，台灣說「視訊電話」或「視訊通話」。「視頻」vs「視訊」是兩岸最常見的科技用語差異之一。' },
  },
};

const files = readdirSync(DIR).filter(f => f.endsWith('.yaml') && !f.startsWith('_'));
let fixedCat = 0;
let enriched = 0;

for (const file of files) {
  const fpath = join(DIR, file);
  const raw = readFileSync(fpath, 'utf-8');
  let d = parse(raw);
  let changed = false;
  
  // Fix non-standard categories
  if (d.category && !validCats.has(d.category)) {
    const mapped = CAT_MAP[d.category];
    if (mapped) {
      d.category = mapped;
      changed = true;
      fixedCat++;
    }
  }
  
  // Apply enrichments
  const enrich = ENRICHMENTS[file] || NOTABLE_ENRICHMENTS[file];
  if (enrich) {
    if (enrich.category) { d.category = enrich.category; changed = true; }
    if (enrich.subcategory) { d.subcategory = enrich.subcategory; changed = true; }
    if (enrich.fork_type) { d.fork_type = enrich.fork_type; changed = true; }
    if (enrich.etymology) {
      d.etymology = { ...d.etymology, ...enrich.etymology };
      changed = true;
    }
    enriched++;
  }
  
  if (changed) {
    writeFileSync(fpath, stringify(d, { lineWidth: 120 }), 'utf-8');
  }
}

console.log(`✅ 分類修正: ${fixedCat} 筆`);
console.log(`✅ 詞條充實: ${enriched} 筆`);
console.log(`📦 總詞條: ${files.length} 筆`);
