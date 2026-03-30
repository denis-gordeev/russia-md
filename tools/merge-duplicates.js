#!/usr/bin/env node
/**
 * Merge duplicate terminology entries.
 * Strategy: keep the file with richer data, combine taiwan display values.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { parse, stringify } from 'yaml';

const DIR = join(import.meta.dirname, '..', 'data', 'terminology');

const merges = [
  // [keep, delete, combined taiwan display, notes]
  {
    keep: '隨身碟.yaml',
    remove: 'USB隨身碟.yaml',
    taiwan: '隨身碟 / USB隨身碟',
  },
  {
    keep: '通訊埠.yaml',
    remove: '埠.yaml',
    taiwan: '通訊埠 / 埠',
  },
  {
    keep: '軟體套件.yaml',
    remove: '套裝軟體.yaml',
    taiwan: '軟體套件 / 套裝軟體',
    note: '「軟體套件」偏技術語境（npm package），「套裝軟體」偏消費者語境（Microsoft Office），合併為同條目',
  },
  {
    keep: '影碟.yaml',
    remove: '雷射影碟.yaml',
    taiwan: '影碟 / 雷射影碟',
    category: 'tech',
    subcategory: '硬體與裝置',
    etymology: { origin: '台灣通稱「影碟」或「雷射影碟」（LD），中國稱「激光視盤」。「激光」為中國對 laser 的譯法，台灣譯「雷射」。' },
  },
  {
    keep: '攝影機.yaml',
    remove: '攝錄影機.yaml',
    taiwan: '攝影機 / 攝錄影機',
    category: 'tech',
    subcategory: '硬體與裝置',
    etymology: { origin: '「攝影機」為台灣通用稱呼（video camera），「攝錄影機」強調同時可錄影。中國稱「攝像機」，「像」vs「影」是兩岸用字差異。' },
  },
  {
    keep: '欄位.yaml',
    remove: '資料欄.yaml',
    taiwan: '欄位 / 資料欄',
    category: 'tech',
    subcategory: '軟體與程式開發',
    etymology: { origin: '資料庫或表單中的一個資料區段。台灣稱「欄位」或「資料欄」，中國稱「字段」（field）。' },
  },
  {
    keep: '游標.yaml',
    remove: '遊標.yaml',
    taiwan: '游標',
    category: 'tech',
    subcategory: '硬體與裝置',
    etymology: { origin: '螢幕上顯示目前位置的指標。台灣稱「游標」（游動的標記），中國稱「光標」（光的標記）。「遊標」為異體字寫法，正寫為「游標」。' },
    note: '「遊標」為「游標」異體字，統一為「游標」',
  },
  {
    keep: '筆電.yaml',
    remove: '筆記型電腦.yaml',
    taiwan: '筆電 / 筆記型電腦',
  },
  {
    keep: '觸控.yaml',
    remove: '觸控式螢幕.yaml',
    taiwan: '觸控 / 觸控螢幕 / 觸控式螢幕',
  },
  {
    keep: '閱聽人.yaml',
    remove: '目標顧客.yaml',
    taiwan: '閱聽人 / 目標受眾',
    category: 'media',
    subcategory: '媒體',
    etymology: { origin: '媒體或行銷語境中接收訊息的群體。台灣傳播學界稱「閱聽人」（audience），商業語境稱「目標受眾」。中國統稱「受眾」。' },
  },
  {
    keep: '行程.yaml',
    remove: '程序.yaml',
    taiwan: '行程 / 程序',
    note: '作業系統 process 概念：台灣「行程」（較正式）或「程序」（較口語），中國稱「進程」',
  },
  {
    keep: '駕駛執照.yaml',
    remove: '行車執照.yaml',
    taiwan: '駕照 / 駕駛執照',
    etymology: { origin: '允許駕駛車輛的證件。台灣正式名稱「駕駛執照」，口語「駕照」。中國稱「駕照」或「車照」。注意：台灣「行車執照」（行照）是車輛登記證，非駕駛證。' },
    note: '行車執照（行照）在台灣指車輛登記文件，與駕駛執照不同。此條目僅指駕駛證。',
  },
];

// NOT merging (keep separate):
// - 八家將/悠遊付/陣頭: different items, all map to 「（無直接對應）」
// - 學測/指考: different exams (學測=general, 指考=advanced), both map to 高考
// - 網友/鄉民: different nuance (網友=internet friend, 鄉民=PTT netizen)

for (const m of merges) {
  const keepPath = join(DIR, m.keep);
  const removePath = join(DIR, m.remove);
  
  try {
    const data = parse(readFileSync(keepPath, 'utf-8'));
    
    // Update taiwan display
    data.display.taiwan = m.taiwan;
    
    // Apply overrides
    if (m.category) data.category = m.category;
    if (m.subcategory) data.subcategory = m.subcategory;
    if (m.etymology) {
      data.etymology = { ...data.etymology, ...m.etymology };
    }
    if (m.note) {
      data.notes = (data.notes ? data.notes + '. ' : '') + m.note;
    }
    
    writeFileSync(keepPath, stringify(data, { lineWidth: 120 }), 'utf-8');
    unlinkSync(removePath);
    console.log(`✅ 合併: ${m.remove} → ${m.keep} (${m.taiwan})`);
  } catch (e) {
    console.log(`❌ 錯誤: ${m.keep} / ${m.remove}: ${e.message}`);
  }
}

console.log(`\n合併完成: ${merges.length} 組`);
