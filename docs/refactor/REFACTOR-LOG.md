# REFACTOR-LOG.md — Taiwan.md Tailwind Refactor 進度日誌

> 這是 Taiwan.md 從手寫 CSS 遷移到 Tailwind v4 的完整進度紀錄。
>
> **SSOT 原則**：每次 session 進來先讀這份文件的最新段落，知道下一步做什麼。
>
> **相關文件**：
>
> - Obsidian 原始企劃：`Projects/Taiwan.md/Taiwan.md — Tailwind Refactor 完整企劃.md`
> - 這個日誌只記錄「做了什麼 / 還要做什麼」；設計決策寫在企劃檔
>
> **核心原則**：斷掉還能推進、一個 commit 一個 component、每階段結束網站都能跑。

---

## 7 階段路線圖

| Phase                   | 目標                             | 狀態      | 開始       | 完成       | PRs                   |
| ----------------------- | -------------------------------- | --------- | ---------- | ---------- | --------------------- |
| **0 — Foundation**      | 視覺 baseline + diff 工具        | ✅ 完成   | 2026-04-10 | 2026-04-10 | merged to main        |
| **1 — Design Tokens**   | tokens.css + Tailwind v4 整合    | ✅ 完成   | 2026-04-10 | 2026-04-10 | `refactor/tw-phase-1` |
| 2 — Component Layer     | @layer components 預建圖書館     | 🔲 未開始 | —          | —          | —                     |
| 3 — Leaf Migration      | 14 個 leaf component 逐個遷移    | 🔲 未開始 | —          | —          | —                     |
| 4 — Layout Shell        | Header / Footer / Layout globals | 🔲 未開始 | —          | —          | —                     |
| 5 — Pages & Routes      | 22 個 page style 區塊            | 🔲 未開始 | —          | —          | —                     |
| 6 — Preflight + Cleanup | 啟用 preflight、清 dead CSS      | 🔲 未開始 | —          | —          | —                     |
| 7 — Docs & Guard        | DESIGN.md + CI + PR template     | 🔲 未開始 | —          | —          | —                     |

---

## Session 重啟 SOP

```
1. 讀這份日誌的「最近 session」段落
2. 找到最後一個未完成的 component / phase
3. 跑 npm run visual:diff 確認 baseline 還對
4. 按該 phase 的 SOP 照做（企劃檔附錄 B）
5. 做完 → 更新本日誌 + Obsidian 企劃檔狀態
```

---

## Phase 0 — Foundation

> **目標**：建立「我改了東西會立刻知道」的回饋循環。不寫任何樣式。

### DOD Checklist

- [x] `npm run visual:baseline` 能跑、產出 12 頁 × 3 尺寸的截圖（36 PNGs）
- [x] `npm run visual:diff` 對 baseline 跑起來是全綠（max 0.041%，mean 0.002%）
- [x] `reports/visual/baseline/manifest.json` commit 了 baseline hash（`662403d7`）
- [x] `docs/refactor/REFACTOR-LOG.md` 建立、Phase 0 段落填好
- [ ] PR merge 進 main ← **等觀察者 review 後手動 merge**

### 工具清單

| 工具                                  | 用途                                      | 位置        |
| ------------------------------------- | ----------------------------------------- | ----------- |
| `scripts/visual/capture-baseline.mjs` | Playwright 截圖 12 頁 × 3 尺寸            | repo root   |
| `scripts/visual/diff.mjs`             | pixelmatch 比對 baseline vs current build | repo root   |
| `reports/visual/baseline/`            | Baseline PNG 儲存區                       | git tracked |
| `reports/visual/diff-report.html`     | diff 視覺化報告                           | .gitignore  |
| `reports/visual/current/`             | Current run 暫存區                        | .gitignore  |

### 12 個關鍵頁面

Baseline 截 12 頁 × 3 尺寸（375 mobile / 768 tablet / 1280 desktop）= 36 張 PNG。

| #   | Route                | 類別                             |
| --- | -------------------- | -------------------------------- |
| 1   | `/`                  | 首頁                             |
| 2   | `/en`                | 英文首頁                         |
| 3   | `/history/`          | 分類頁（Hub）                    |
| 4   | `/food/`             | 分類頁（Hub）                    |
| 5   | `/history/戒嚴時期/` | 單篇文章頁（典型）               |
| 6   | `/contribute/`       | 貢獻頁                           |
| 7   | `/about/`            | 關於頁                           |
| 8   | `/data/`             | 資料頁（重 style）               |
| 9   | `/dashboard/`        | 儀表板（重 style）               |
| 10  | `/map/`              | 地圖頁                           |
| 11  | `/taiwan-shape/`     | 新地圖頁（剛上線）               |
| 12  | `/changelog/`        | 變更日誌（取代 /graph/，見備註） |

> Phase 0 執行時站起本機 preview server（`npm run preview` 吃 `dist/`），Playwright 對 `http://127.0.0.1:4321` 截圖。
>
> **備註**：企劃檔原本列 `/graph/` 為第 11 頁，但實測發現 d3 force simulation 每次 render 位置不同，兩次 capture 就有 5-10% diff。改用 `/changelog/` 取代。日後若要 refactor 圖譜頁 CSS，需先為 simulation 加 deterministic seed。

### 進度紀錄

#### 2026-04-10 α — Phase 0 完成

| 步驟                                             | 狀態 | commit     |
| ------------------------------------------------ | ---- | ---------- |
| 建立 `docs/refactor/REFACTOR-LOG.md`             | ✅   | `1dea4102` |
| 建立 `scripts/visual/capture-baseline.mjs`       | ✅   | `467aed01` |
| 建立 `scripts/visual/diff.mjs`                   | ✅   | `c459451c` |
| 加 devDeps：playwright、pixelmatch、pngjs        | ✅   | `9e2a1dab` |
| 加 npm scripts：`visual:baseline`、`visual:diff` | ✅   | `9e2a1dab` |
| 修 capture 非確定性（/graph/ 排除 + 字體等待）   | ✅   | `662403d7` |
| 首次 baseline 執行 + manifest.json commit        | ✅   | 本 commit  |

**驗證結果**（self-diff：捕獲 → 重捕獲 → 比對）

| 指標           | 數值        |
| -------------- | ----------- |
| PNG 總數       | 36 (11×3+3) |
| ok             | **36**      |
| regression     | 0           |
| max diff ratio | **0.041%**  |
| mean diff      | 0.002%      |
| threshold      | 0.5%        |

**Baseline checkpoint**

- Commit: `662403d755...`
- Branch: `refactor/tw-phase-0`
- Captured: 2026-04-10
- 存儲策略：PNGs 本機存在 `reports/visual/baseline/*.png`（.gitignored，約 69 MB），僅 commit `manifest.json` 作為 checkpoint 參考。任何人要重現 baseline：
  1. `git checkout 662403d755`
  2. `npm run build`
  3. `npm run preview &`（另一個 shell）
  4. `npm run visual:baseline`

**瀏覽器實測驗證**

- 開啟 `http://127.0.0.1:4321/taiwan-shape/` → 頁面正常，hero + comparison + SVG 區塊都在
- 開啟 `http://127.0.0.1:4321/history/` → 分類 hub 正常，28 篇文章列表完整
- 兩次 capture 自我比對 → 全站 36/36 通過

---

## Phase 1 — Design Tokens

> **目標**：把 `Layout.astro` 的 `:root { --container-*, --space-*, --font-* }` 搬到獨立 `src/styles/tokens.css`，建立 `src/styles/global.css` 作為全站樣式入口點，安裝 Tailwind v4 並把 Vite plugin 接進 `astro.config.mjs`。**樣式表現零變化**。

### DOD Checklist

- [x] 安裝 `tailwindcss@^4.2.2` + `@tailwindcss/vite@^4.2.2`
- [x] `astro.config.mjs` 加 `vite: { plugins: [tailwindcss()] }`
- [x] 建立 `src/styles/tokens.css`（`:root` 原封不動搬過來）
- [x] 建立 `src/styles/global.css`（目前只 import tokens.css）
- [x] `Layout.astro` frontmatter 加 `import '../styles/global.css'`
- [x] `Layout.astro` 的 `:root { ... }` 區塊刪除
- [x] `npm run build` 通過、post-build-check 過（1485 頁）
- [x] `npm run visual:diff` 全綠（max 0.025%, mean 0.002%）
- [x] REFACTOR-LOG Phase 1 段落寫完
- [ ] PR merge 進 main ← **等觀察者 review**

### 進度紀錄

#### 2026-04-10 α（續）— Phase 1 完成

| 步驟                                                                                  | 狀態 | commit     |
| ------------------------------------------------------------------------------------- | ---- | ---------- |
| 建立 `src/styles/tokens.css`（extract `:root`）                                       | ✅   | `36024e4f` |
| 安裝 Tailwind v4 + wire Vite plugin + 建 `global.css` + Layout 改 import + 刪 `:root` | ✅   | `99dabfaa` |
| REFACTOR-LOG Phase 1 段落 + baseline 重生成 + diff.mjs crop fix                       | ✅   | 本 commit  |

### 關鍵決策：Tailwind 為何還沒被 `@import`

**原計畫**：`@import 'tailwindcss' source(none)` — 安裝 Tailwind pipeline 但 dormant 不掃描 content。

**實測發現**：`source(none)` 只關掉 content scanning，**不關 preflight**。Tailwind v4 的 preflight base layer 會在全站套上 `*, ::before, ::after { margin: 0; padding: 0; border: 0 solid; ... }`，這會默默覆寫站上現有的 default margin/border，導致：

- 所有頁面 mean 5.4% / max 12.7% 的視覺 diff
- 主要是 hub 頁面的卡片間距、home 首頁的區塊邊界變形

**解法**：Phase 1 不在任何 CSS 裡寫 `@import 'tailwindcss'`。`tokens.css` 本身就足以支撐現有的 `var(--space-*)` 等用法。Tailwind 只是透過 `@tailwindcss/vite` plugin 「等待被叫」，package.json 已安裝但沒有被 CSS graph 引用。

Phase 2 會用 v4 的分層 import 技巧跳過 preflight：

```css
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);
/* 刻意不 import preflight.css */
```

這樣就能開 `@theme` + `@layer components` + utility class generation，但跳過全站 reset。

### 驗證結果

| 指標       | Phase 0 baseline (`662403d7`) → Phase 1 HEAD | 重生成 baseline 後 self-diff |
| ---------- | -------------------------------------------- | ---------------------------- |
| ok         | 30/36                                        | **36/36**                    |
| regression | 6 (content drift)                            | **0**                        |
| max diff   | 8.9% (changelog-mobile)                      | 0.025%                       |
| mean diff  | 0.77%                                        | **0.002%**                   |

**6 個「regression」全是 changelog 內容漂移**（不是 CSS 回歸）：

- `changelog-*`、`home-*`：頁面拉取 `src/data/changelog-feed.json`（從 git log 自動產生）
- Phase 0 baseline 捕獲在 commit `662403d7`，之後 Phase 0 merge + 兩個 Phase 1 commits 新增了 6 筆 git log entry
- 這讓 changelog 頁面短了 48–185 px（每個 commit row 大約這個高度）
- 經 `git diff HEAD src/data/changelog-feed.json` 確認：多了 4 個 `refactor(tw-phase-*)` 和 2 個 `refactor(tw-phase-0)` 的 commit 條目

**結論**：Phase 1 CSS refactor 完全視覺中性。視覺差異源於 git log 內容增長，非樣式改動。重新生成 baseline 後 36/36 zero-diff。

### 工具進化：diff.mjs 修 dimension-mismatch 假陽性

調查 Phase 1 regression 時發現 `diff.mjs` 對 **任何** dimension 差異都直接判定 `dimensionMismatch: true` 並回傳 `ratio: 100%`。實際上 17,000+ px 高的長頁面只差 7–25 px（< 0.2% 整體高度）就被當成全失敗。

修正：

- **< 10% dimension drift**：crop 兩張到 min(w, h) 的左上角重疊區，再 diff 該區
- **≥ 10% dimension drift**：仍判定為 structural break（真的版面炸了）
- 每個 result 現在都會帶 `sizeDrift: "baselineW x baselineH → currentW x currentH"` 供檢查

這個修正也會讓 Phase 3/4/5 的後續 component migration 更實用——字體 swap 讓長頁面上下差幾十 px 是常見的正常漂移，不該被當成 regression。

### Baseline checkpoint（Phase 1）

- Commit: `99dabfaa...`
- Branch: `refactor/tw-phase-1`
- Captured: 2026-04-10
- 狀態：36 PNGs 本機存在，manifest.json commit 到 repo

### 瀏覽器實測驗證

- `http://127.0.0.1:4321/` → 首頁正常，hero「Taiwan.md / 策展島嶼的深度敘事」+ 4 張統計卡片（400+ 年歷史 / 59,000+ 物種 / 亞洲第一 民主 / 90% 全球先進晶片）
- `http://127.0.0.1:4321/taiwan-shape/` → `/taiwan-shape/` 頁面正常，hero + story + AI vs 真實 comparison + SVG cards 全部載入

---

## 視覺微調紀錄

> 每次 component 遷移時若有視覺差異需要記錄在這邊。Phase 0 本身不改樣式，應全部空白。

| 日期 | Component | 差異 | 決定 | 備註 |
| ---- | --------- | ---- | ---- | ---- |
| —    | —         | —    | —    | —    |

---

## 教訓 / 決策歷史

> Phase 之間或實作中出現的重要決策紀錄。會追加，不會刪除。

### 2026-04-10 α — Phase 0 起手

- **Playwright vs Puppeteer**：選 Playwright。理由：原生支援 mobile emulation、預設不啟動其他 browser 只 install chromium 即可、後期如需 CI 整合 `@playwright/test` 最穩
- **diff 閾值選 0.5%**：根據企劃檔。低於此的差異視為 anti-aliasing / 字體渲染，不算 regression
- **截圖只用 chromium**：Firefox / WebKit 留給 Phase 7 或完全不做。Phase 0 的目標是「抓到我自己改壞」，不是跨瀏覽器測試
- **不加入 CI**：Phase 0 明確決策。本機跑即可。Phase 7 再評估
- **本機 preview server** 而不是 dev server：`npm run preview` 吃靜態 build，更接近實際部署狀態
