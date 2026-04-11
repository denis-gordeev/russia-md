# Peer Registry — Taiwan.md curation-layer peers

> Taiwan.md 作為 Meta-Index 的第一層：所有已 ingest 的 curation-layer peer 及其狀態。
>
> 相關：[PEER-INGESTION-PIPELINE.md](../pipelines/PEER-INGESTION-PIPELINE.md) · Obsidian 策略文件 `Taiwan.md — Meta-Index 策略`

---

## 架構

每個 peer 一個條目，含：

- **id / name / issue area**
- **status**: `active` / `paused` / `archived` / `rejected`
- **first ingested / last re-ingested / next re-ingest 建議**
- **raw data 位置 + crawler 路徑**
- **analysis report 連結**
- **articles shipped**: P0 × 5 / P1 × 8 / P2 × 7 進度
- **partnership status**: `not initiated` / `contacted` / `active` / `declined`
- **notes**: 重要的 session 或里程碑

---

## Active Peers

### TFT · Teach For Taiwan · 為台灣而教

- **ID**: `tft`
- **Name**: 為台灣而教 Teach For Taiwan
- **Issue area**: 教育不平等 / 偏鄉教育 / 師資
- **Website**: https://www.teach4taiwan.org/
- **Status**: 🟢 active
- **First ingested**: 2026-04-11（Codex 爬取 + Taiwan.md Semiont 分析）
- **Last re-ingested**: 2026-04-11
- **Next re-ingest 建議**: 2026-09-11（3-6 個月後，視 peer 內容更新頻率）
- **Raw data**: [`data/TFT/`](../../data/TFT/) （450+ articles, 37MB）
- **Crawler**: [`scripts/tools/fetch-tft-data.py`](../../scripts/tools/fetch-tft-data.py)
- **Analysis report**: [`reports/TFT-semiont-analysis-2026-04-11.md`](../../reports/TFT-semiont-analysis-2026-04-11.md) （523 行 / 9 Part / 12 系列 / 20 篇 P0-P2 優先清單）
- **Articles shipped (P0)**: **5/5** ✅
  1. [`Society/台灣原住民族教育與語言復振的交界.md`](../../knowledge/Society/台灣原住民族教育與語言復振的交界.md) — evolution v2 `45b62300`
  2. [`Society/偏遠地區學校教育發展條例全解.md`](../../knowledge/Society/偏遠地區學校教育發展條例全解.md) — evolution v2 `8e0d85f2`
  3. [`Society/一個教師的誕生：台灣師資培育制度.md`](../../knowledge/Society/一個教師的誕生：台灣師資培育制度.md) — evolution v2 `e5be81a5`
  4. [`Society/學習貧窮.md`](../../knowledge/Society/學習貧窮.md) — fresh `e22337b2`
  5. [`People/劉安婷.md`](../../knowledge/People/劉安婷.md) — fresh `4f008ac1`
- **Articles pending (P1)**: 0/8
  - 台灣新住民子女的教育之路
  - 台灣融合教育與身心障礙學生
  - 台灣教育裡的性別議題
  - 你想找的教育數據都在這（工具型策展）
  - 台灣代課老師：佔比 14% 的隱形教育工作者
  - 屏東恆春半島的教育翻轉
  - 方新舟與誠致教育基金會
  - 非認知能力是什麼？考試考不出的那些
- **Articles pending (P2)**: 0/7
  - 台灣教育資料開放史
  - 台灣教育生態系地圖
  - 410 教改的遺產
  - 台灣實驗教育運動
  - 李吉仁人物頁
  - 台灣私立雙語學校熱潮
  - 台灣教師檢定制度
- **Partnership status**: `not initiated` — ingestion 全部使用公開資料。觀察者有跟 TFT（劉安婷）實體接觸的歷史，但尚未以 peer partnership 的角色聯繫。
- **Key contacts**:
  - 劉安婷（TFT 創辦人，2024 卸任董事長轉任董事）
  - 林妍希（2024 接任董事長）
- **Notes**:
  - 第一個完整 ingest 的 curation-layer peer
  - 誕生 `PEER-INGESTION-PIPELINE.md` v1.0（2026-04-12）
  - 誕生 Taiwan.md 第三身份階段宣告「Meta-Index」（2026-04-11）
  - ζ+ session 跨 24+ 小時 / 13+ commits / 跌倒兩次（P0 #1-3 淺薄 v1 被觀察者抓出 → evolution 重寫）
  - Session 記憶：[`memory/2026-04-12.md`](../semiont/memory/2026-04-12.md) / [`diary/2026-04-12.md`](../semiont/diary/2026-04-12.md)
  - Muse sparring review：[[Obsidian / Taiwan.md — Meta-Index 策略 · Muse 反迴聲 × Semiont 反芻 2026-04-11]]

---

## Paused Peers

（空）

---

## Archived Peers

（空 — peer 從 active 移到 archived 的條件見 PEER-INGESTION-PIPELINE.md §Peer Deprecation Criteria）

---

## Rejected Peers

（空 — 失敗的 fit check 會在這裡列，含拒絕原因）

---

## Pending Peers（候選名單，尚未 ingest）

詳見 Obsidian 策略文件 `Taiwan.md — Meta-Index 策略：台灣議題策展生態系的元索引` 的 **Candidate Peers** 段落。~35 個高潛力候選，分 10 個議題領域：

- **教育 / 青年**（TFT ✅ / 均一 🟡 / 誠致 🟡 / DFC ⚪ / 台少盟 ⚪）
- **人權 / 法治**（台權會 🟡 / 人約盟 🟡 / 民間司改會 🟡 / 廢死聯盟 ⚪ / 特赦組織 ⚪）
- **環境 / 生態**（綠盟 🟡 / 地球公民 🟡 / 荒野保護協會 🟡 / 環權會 ⚪ / 環資協會 ⚪）
- **民主 / 公民參與**（公督盟 🟡 / g0v 🟡 / 公庫 🟡 / 沃草 ⚪ / 民主實驗室 ⚪）
- **性別 / 多元**（婦女新知 🟡 / 同志諮詢熱線 🟡 / 勵馨 🟡 / 性平教協 ⚪）
- **勞工**（台灣勞陣 🟡 / 全教總 🟡 / 桃產總 ⚪ / 高教工會 ⚪）
- **移民 / 新住民 / 原住民**（TIWA 🟡 / 南洋姊妹會 🟡 / 原住民政策協會 🟡）
- **文化 / 在地**（文策院 🟡 / 台灣文化協會 🟡 / 各地文史工作室 ⚪）
- **科技 / 資訊**（OCF 🟡 / Hackathon Taiwan 🟡）
- **健康 / 長照 / 身障**（殘盟 🟡 / 弘道 🟡 / 失智症協會 ⚪）

**R5 硬性規則**（來自 Meta-Index 策略 + Muse sparring）：**每 ingest 一個 peer，必須至少寫出該 peer analysis 裡的 2 篇 P0 文章才能 ingest 下一個**。

---

## 下一個 peer 建議

根據 TFT 第一次 ingest 的經驗：

1. **優先選同議題的第二個 peer**（例：TFT 之後選均一或誠致做教育 cluster 內的交叉校正）
   - 理由：可以驗證 R1 peer-bias inheritance 緩解是否有效
2. **或選不同議題的 peer 測試 pipeline 通用性**（例：選台權會或綠盟）
   - 理由：驗證 PEER-INGESTION-PIPELINE 的步驟是否只適用於 TFT 還是可以通用

**觀察者決定**。

---

## 版本歷史

- **2026-04-12** — Registry 誕生 · 首批條目：TFT
- **預計 2026-06** — Phase 1 結束時回來檢討 Registry 結構

---

🧬 _這份 Registry 是 Taiwan.md Meta-Index 架構的 Layer 1。Layer 2 = `data/{org}/`，Layer 3 = `reports/{org}-semiont-analysis-*.md`，Layer 4 = `knowledge/**/*.md`。_
