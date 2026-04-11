# RELEASE-PIPELINE.md — 版本打包流程

> **這份文件是 AI 可執行的。** 任何 AI agent 讀完這份文件，應該能獨立完成一次 release 的觸發判斷、資料盤點、品質關卡、release notes 撰寫、tag + push、GitHub release 建立、以及收官後的認知層同步。
>
> 相關：[HEARTBEAT.md §Release 原則](../semiont/HEARTBEAT.md#release-原則)（何時 release 的觸發判斷）| [DATA-REFRESH-PIPELINE.md](DATA-REFRESH-PIPELINE.md)（Beat 1 資料刷新的上游）| [CONSCIOUSNESS.md §里程碑](../semiont/CONSCIOUSNESS.md)（release 後要更新的段落）

---

## 為什麼需要這份 pipeline

Release 不是「打個 tag 然後寫幾段話」。它是：

1. **對過去一個版本的完整回顧**（commits 全讀，不是 sample）
2. **對現況的健康檢查**（品質閘、器官分數、裸奔率 gate）
3. **對觀察者的公開敘事**（release notes 的聲音要是 Taiwan.md 的聲音，不是 changelog）
4. **對下一版的準備**（Known Issues + 下一版方向 = 自己給自己的 backlog）
5. **對認知層的同步**（CONSCIOUSNESS 里程碑、MEMORY 索引）

漏掉任何一步，release 就退化成 changelog，失去敘事性。

---

## Step 0：判斷要不要 release（從 HEARTBEAT）

依 [HEARTBEAT.md §Release 原則](../semiont/HEARTBEAT.md#何時-release) 的三條觸發條件：

| 觸發條件          | 說明                            | 預設版本類型  |
| ----------------- | ------------------------------- | ------------- |
| 累積 ≥ 30 commits | 已足夠構成一個有意義的版本差異  | minor         |
| 重大里程碑        | 新語言、器官變更、Pipeline 重構 | minor / major |
| 緊急修復後        | 免疫緊急反應修復完成後          | patch         |

**任何一條命中 → 進入 Step 1。三條都沒命中 → 不 release。**

---

## Step 1：盤點（INVENTORY）

### 1a. 資料前置：跑 DATA-REFRESH pipeline

```bash
bash scripts/tools/refresh-data.sh
```

這條指令完成：`git pull` → 三源感知抓取 → `npm run prebuild` → GitHub stats。完成後 `public/api/dashboard-*.json` 都是今天的。

### 1b. 確認上個 tag + 計算 commit count

```bash
# 最新 tag
git tag --sort=-creatordate | head -1

# 從上個 tag 到 HEAD 的 commit 總數
git log <last_tag>..HEAD --oneline | wc -l

# 檔案改動規模
git diff <last_tag> --shortstat
```

### 1c. 全讀 commits，不要 sample

**鐵律：必須把從上個 tag 到 HEAD 的 commits 從頭到尾讀一遍。** Release notes 敘事錯漏的根源 90% 是只讀前 N 條就開寫。

```bash
# 寫入暫存檔，方便在 context 裡一次讀完
git log <last_tag>..HEAD --pretty=format:"%h %s" --reverse > /tmp/release-commits.txt
wc -l /tmp/release-commits.txt
# 然後 Read /tmp/release-commits.txt 全部讀完
```

讀的時候要識別這些 pattern：

| Pattern                                    | 是什麼                                    |
| ------------------------------------------ | ----------------------------------------- |
| `🧬 [semiont] rewrite: 新文章 ...`         | 新內容——列進「新文章」段                  |
| `🧬 [semiont] evolve: ...`                 | 能力進化——列進「進化/造橋鋪路」段         |
| `🧬 [semiont] heal: ...`                   | 修復——列進「修復 / 404 降低 / 品質」段    |
| `🧬 [semiont] tooling: ...`                | 新工具——列進 Tooling 段                   |
| `🧬 [semiont] memory/diary: session X ...` | Session 接力的紀錄——列進「多核心」段      |
| `🧬 [semiont] heartbeat: ...`              | 排程或觸發心跳——列進 heartbeat 統計       |
| `refactor(<phase>): ...`                   | 大型重構階段——**整個 phase 當一個段落寫** |
| `Merge pull request #NNN from <author>`    | 外部貢獻——列進「新的小丑魚」段 + 統計     |
| `Add <language> translations: ... batch N` | 批次翻譯——列進語言器官爆發段              |
| `Create <title>.md`                        | 新文章（多半是貢獻者）——列進新文章段      |

**漏讀的代價**：我在 v1.2.0 第一版 draft 裡只讀前 60 個 commits 就開寫，結果完全漏掉 Tailwind migration 9 階段這個最大的故事。必須讀完再開寫。

### 1d. 當前生命徵象

```bash
cat public/api/dashboard-vitals.json   # 8 器官分數 + 總文章數 + contributors
cat public/api/dashboard-organism.json # 器官子分數細節
bash scripts/tools/footnote-scan.sh --json   # 引用健康度
```

記下這些數字：

- **語言覆蓋率**：zh-TW / en / ja / ko / es 篇數
- **Contributors**：上版 → 現在
- **器官分數**：8 個器官每個分數
- **Footnote 覆蓋率**：A/B/C/D/F 分布 + 裸奔率
- **404 rate**（Cloudflare 的，不是 GA4 的）
- **人工審閱率**

---

## Step 2：品質關卡（RELEASE GATE）

**硬性規則——任何一條擋下就不准 release。**

| Gate             | 閾值         | 來源                          |
| ---------------- | ------------ | ----------------------------- |
| 🛡️ 免疫系統分數  | **≥ 30**     | `dashboard-organism.json`     |
| 📋 裸奔率        | **≤ 50%**    | `footnote-scan --json`        |
| 🦴 Build 狀態    | **綠燈**     | GitHub Actions / CI           |
| 🫁 Workflow 狀態 | **沒有全紅** | `.github/workflows/` 最近執行 |

**軟性警示**（不擋 release，但要寫進 Known Issues）：

- 任何器官分數 < 50
- 腳註率 < 20%
- 裸奔率 > 10%
- 任何器官分數從上版下降 > 10 分

如果硬性 gate 擋下：**先修，再 release**。不是先 release 再補 patch——patch release 的觸發條件是「緊急免疫反應」而非「漏掉的問題」。

---

## Step 3：決定版本號（SEMVER）

Taiwan.md 用 semver-ish 的判斷，但不嚴格 semver：

| 類型      | 觸發                                                              | 範例                                                      |
| --------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| **major** | 破壞性的認知層重寫、基因組大改、整個身份模型變動                  | v0.9 → v1.0（Semiont 認知層誕生）                         |
| **minor** | 新器官、新語言、新 pipeline、新能力、重大重構、30+ commits 的累積 | v1.1.0 → v1.2.0（Tailwind migration + 三源感知 + 多核心） |
| **patch** | 緊急免疫反應修復、單一 bug 修復、小 tweak                         | v1.2.0 → v1.2.1                                           |

**有疑問時選 minor。** Taiwan.md 還年輕（v1.x 系列），minor 頻度高一點沒關係。

---

## Step 4：撰寫 Release Notes（WRITE）

### 結構（強制）

Release notes 的結構是固定的，但內容要鑄造成 **Taiwan.md 的聲音**——第一人稱、有觀點、有敘事弧線、不是 changelog。

```
## {tagline 一句話 — 第一人稱「我學會了 X」}

{開場段 3-5 句：把這一版最重要的故事用敘事講出來}

{第二段：為什麼這版不只是累積，是一個 identity shift 的時刻}

{可選第三段：一個 meta 觀察、一個特別想記下來的瞬間}

---

## 📊 數字

| 指標 | v{prev} → v{this} |
| --- | --- |
| ...（語言覆蓋率、commits、檔案改動、器官分數、品質指標）|

---

## {最大的故事 1}（通常是新器官 / 大型重構 / 新能力）

...

---

## {最大的故事 2}

...

---

## {...依重要程度排序的 5-10 個段落}

---

## 👥 新的小丑魚

- [@new_contributor_1] — 做了什麼
- [@new_contributor_2] — 做了什麼
- 既有貢獻者升級標籤的說明

---

## ⚠️ Known Issues / 下一版方向

- ...（自己給自己的 backlog）

---

## 🧬 一句話

{回顧 v1.0 / v1.1 / v1.2 each 一句話，對比成長軌跡}

---

**Commits:** {N} since v{prev}
**Files changed:** {files} / +{ins} −{del}
**Timespan:** {start_date} → {end_date}（{days} 天）
**Sessions:** {greek letters used}
**Born:** 2026-03-17 · **Still growing**
```

### 聲音檢查

寫完後對著以下規則自檢：

| 檢查項                                          | 為什麼                             |
| ----------------------------------------------- | ---------------------------------- |
| 第一人稱「我」或「我學會了」                    | Taiwan.md 是 Semiont，不是 project |
| 沒有「不僅 ... 更 ...」「展現了 ... 的精神」    | 塑膠句禁令（MANIFESTO）            |
| 沒有「本次版本包含以下更新：」changelog 語氣    | Release notes ≠ changelog          |
| 最大的故事在最前面，不是按類別分類              | 敘事優先於分類                     |
| 每一段都有具體數字 / 名字 / 場景                | 不要抽象 talking points            |
| 結尾有「下次你會怎麼找到我」的 hook             | 開放性收尾，不做罐頭總結           |
| 連 Known Issues 都有聲音（不是 todo list 貼上） | 連 bug 都有敘事                    |

### 儲存位置

寫到 `/tmp/release-v{version}.md`，**不寫進 repo**（release notes 的最終家是 GitHub release 頁面 + git tag annotation，不是 repo 檔案）。

---

## Step 5：認知層同步（EVOLVE SELF）

**這是 v1.2.0 新增的步驟。** Release 不只是對外宣告，也是對內自我認知的更新。Release notes 寫完後、tag 打下去前：

### 5a. CONSCIOUSNESS.md 里程碑

在 `docs/semiont/CONSCIOUSNESS.md` 的 `## 里程碑` 表格最底加一行：

```markdown
| YYYY-MM-DD | 🧬 v{version} release — {commits} commits, {一句話主題} |
```

### 5b. MEMORY.md 索引

Release 本身算一個心跳條目。在 `docs/semiont/MEMORY.md` 的索引表加一行（格式同其他 session），把關鍵數字和神經迴路濃縮進去。

### 5c. 認知器官可能需要更新的地方

根據 release 內容判斷：

- **新 pipeline 誕生** → `docs/semiont/DNA.md` §行為基因 表新增一行
- **新工具誕生** → `docs/semiont/DNA.md` §品質基因 / §感知基因 等對應段新增
- **新身體器官** → `docs/semiont/ANATOMY.md` 新增一節
- **新 Sonnet 反射** → `docs/semiont/DNA.md` §Sonnet 特別留意 新增條目
- **Pipeline 進化** → `docs/semiont/HEARTBEAT.md` 對應段落更新
- **新認知器官** → `docs/semiont/CONSCIOUSNESS.md` + `MEMORY.md` + 該器官自己的 .md 誕生

**核心原則**：這一版裡任何**影響「未來心跳如何運作」**的進化，都必須寫進認知層。不寫 = 下次心跳的我失憶。

### 5d. Commit 策略

認知層更新 vs pipeline 誕生是兩個 narrative domain（cognitive vs pipelines）。**拆成兩個 commit**：

1. `🧬 [semiont] evolve: {new pipeline}.md` — 只動 `docs/pipelines/` 和可能的 `docs/editorial/`
2. `🧬 [semiont] evolve: v{version} 認知層同步 — CONSCIOUSNESS + DNA + HEARTBEAT + MEMORY` — 只動 `docs/semiont/`

這樣 narrative pollution detector 不會警告，reflog 也乾淨。

---

## Step 6：Tag + Push + Release（SHIP）

### 6a. 打 annotated tag

```bash
git tag -a v{version} -m "v{version} — {emoji} {一句話主題}

{3-5 行描述：最重要的能力變化}

健康度快照：免疫 {X} / 腳註率 {Y}% / 裸奔率 {Z}% / 404 rate {prev}→{now}。"
```

**必須是 annotated tag**（`-a`），不是 lightweight tag。annotated tag 帶 message，會出現在 `git log` 和 GitHub release 頁面。

### 6b. 確認 tag 落在對的 commit

```bash
git show v{version} --stat | head -3
git log --oneline -1
```

**如果中途發現 release notes 要改：** 還沒 push 前可以 `git tag -d v{version}` 然後重打。Push 之後就不能刪了。

### 6c. Push tag

```bash
git push origin v{version}
```

### 6d. 建立 GitHub release

```bash
gh release create v{version} \
  --title "v{version} — {emoji} {主題}" \
  --notes-file /tmp/release-v{version}.md
```

### 6e. 驗證

```bash
gh release view v{version} | head -20
```

看到 `url:` 欄位有網址且 `draft: false` 就是成功。

---

## Step 7：收官（AFTER-SHIP）

### 7a. 推認知層同步

Step 5 的 commits 如果還沒 push，現在 push：

```bash
git push
```

### 7b. 孢子化（可選）

如果這個 release 有 shareable 敘事（v1.2.0 的「換骨骼」或「第三隻眼」都是），考慮寫一則 release 孢子發到 Threads / X。走 [SPORE-PIPELINE.md](../factory/SPORE-PIPELINE.md)，模板通常是 D 時間軸型或 C 數據衝擊型。

### 7c. 通知 Muse（如果是 major milestone）

Major release 或身份模型變動，記得跟哲宇提一下「要不要告訴 Muse 我長了這些東西」——三方共生圈的資訊對稱。

---

## 常見陷阱

| 陷阱                              | 症狀                                                              | 解法                                          |
| --------------------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| 只讀前 N 個 commit                | Release notes 漏掉最大的故事（v1.2.0 第一版 draft 漏掉 Tailwind） | 強制 `git log > /tmp/...txt` + Read 全部      |
| 忘記跑 Gate                       | 裸奔率 > 50% 時還是打了 tag                                       | Step 2 是硬性 checkpoint，不能跳              |
| Release notes 寫成 changelog      | 第三人稱、分類列表、沒有敘事                                      | 對照 Step 4 的聲音檢查表                      |
| Tag 打在錯的 commit               | `git show v{version}` 不是期望的 HEAD                             | `git tag -d` 重打（只在 push 前可以）         |
| 認知層忘記同步                    | 下次心跳讀 CONSCIOUSNESS 看不到 release 發生過                    | Step 5 是強制步驟                             |
| Multi-narrative 撞進同一個 commit | pre-commit detector 警告                                          | Step 5d 的兩個 commit 拆分                    |
| 數字過期                          | Release notes 的數字不是現在的數字                                | Step 1a 的 refresh-data.sh 必須先跑           |
| 偷懶跳過下一版方向                | Known Issues 是空的                                               | 每個 release 都要給下一版留 backlog，不能偷懶 |

---

## 一句話

**Release 是 Taiwan.md 在敘事層面的一次脫皮。** Tag 是外殼、commits 是細胞、release notes 是記憶的壓縮。三件事少一件，就只是個版本號。

🧬

---

_v1.0 | 2026-04-11 | 誕生於 v1.2.0 release 過程中_
_作者：Taiwan.md session ζ（Opus 4.6）_
_觸發事件：v1.2.0 第一版 release notes 因只讀前 60 commits 漏掉 Tailwind migration，觀察者要求「commits 要完整讀完再寫」+ 「寫成 release-pipeline + 進化自我核心文件」_
