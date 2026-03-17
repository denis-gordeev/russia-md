# Taiwan.md D3.js 視覺化升級企劃

> 將 Taiwan.md 從靜態知識庫進化為**互動視覺化的台灣探索平台**

## 🎯 戰略定位

### 為什麼是 D3.js 視覺化？

基於 Taiwan.md 的萬星目標和國際曝光策略，視覺化將成為最強引爆點：

1. **HN Show HN 吸引力** — 「Interactive Taiwan knowledge base with D3.js」比純文字更吸眼球
2. **分享病毒性** — 美麗的互動圖表天然適合 Twitter/Reddit 分享
3. **停留時間飆升** — 互動探索讓用戶從「讀」變成「玩」
4. **技術展示雙贏** — 前端技術能力 + 台灣文化內容的完美結合
5. **國際區隔** — 99% 的國家知識庫都是純文字，我們要做第 1%

## 🗺️ 現有視覺化基礎

Taiwan.md 目前已建立的視覺化基礎（Day 1 成果）：

### ✅ 已完成
1. **首頁知識圖譜**（D3.js force simulation）
   - 位置：網站首頁中央區域
   - 功能：展示主題間的關聯性

2. **Resources 頁面心智圖**（D3.js tidy tree）
   - 功能：資源分類雙向展開
   - 交互：點擊節點展開/收合

3. **基礎內容結構**
   - 12 個主題分類：history, geography, culture, food, art, music, technology, nature, people, society, economy, lifestyle
   - 47 篇中文 + 27 篇英文文章
   - Astro + Markdown SSOT 架構穩固

### 🔄 需要升級
- 現有圖譜功能較基礎，缺乏篩選、搜尋、權重顯示
- 各 Hub 頁面仍是純文字，缺乏視覺化吸引力
- 沒有地理、時間、統計數據的視覺化

---

## 研究發現

### D3.js 適合知識庫的圖表類型

基於 D3.js Gallery 和媒體案例研究，以下圖表類型最適合台灣知識庫：

#### 🗺️ **地理空間視覺化**
- **Choropleth Maps**：分區域著色地圖
  - [範例](https://observablehq.com/@d3/choropleth)
  - 適用：人口密度、經濟指標、選舉結果
- **TopoJSON Taiwan**：台灣地圖投影
  - [範例](https://observablehq.com/@d3/versor-dragging)
  - 支援縮放、拖曳、圖層切換

#### 📈 **時序數據視覺化**
- **Timeline Visualization**：歷史時間軸
  - [範例](https://observablehq.com/@d3/zoomable-bar-chart)
  - 適用：台灣 400 年歷史事件
- **Calendar Heatmap**：日曆熱力圖
  - [範例](https://observablehq.com/@d3/calendar-view)
  - 適用：節慶分布、氣候變化

#### 🌐 **網路關係視覺化**
- **Force Directed Network**：力導向圖（已有）
  - [範例](https://observablehq.com/@d3/force-directed-graph)
  - 升級：加入權重、分群、篩選
- **Sankey Diagram**：流向圖
  - [範例](https://observablehq.com/@d3/sankey)
  - 適用：貿易流動、產業鏈

#### 📊 **階層數據視覺化**
- **Treemap**：樹狀映射圖
  - [範例](https://observablehq.com/@d3/treemap)
  - 適用：GDP 結構、產業規模
- **Sunburst Chart**：旭日圖
  - [範例](https://observablehq.com/@d3/sunburst)
  - 適用：族群構成、文化分類

### 參考案例

#### 知名媒體互動視覺化標竿
1. **New York Times Interactive**
   - 地理資料結合時間序列
   - 多層次資訊揭露
   - 響應式設計典範

2. **The Guardian Data Stories**
   - 敘事驅動的資料呈現
   - 清晰的視覺層次
   - 社群分享優化

3. **The Pudding**
   - 創新的視覺語言
   - 強烈的視覺衝擊
   - 大膽的交互設計

---

## 視覺化提案（依優先序）

### 🔴 P0 — 高影響力，可立即實作（Phase 1）

#### 1. 台灣地理分布互動地圖 ⭐⭐⭐⭐⭐
- **放置位置**：Geography Hub 頁面主視覺
- **D3 圖表類型**：Choropleth + TopoJSON
- **核心功能**：
  - 基礎台灣地圖（縣市邊界）
  - 可切換圖層：國家公園、原住民族分布、主要城市
  - Hover 顯示詳細資訊
  - 點擊縣市跳轉相關文章
- **數據來源**：
  - 內政部國土測繪中心 TopoJSON
  - 原民會族群分布資料（data.gov.tw）
  - 營建署國家公園範圍
- **預估工時**：1-2 週
- **引爆點價值**：地圖視覺化最容易在社群傳播，是 HN Show 的絕佳素材

#### 2. 台灣 400 年歷史時間軸 ⭐⭐⭐⭐
- **放置位置**：History Hub 頁面頂部
- **D3 圖表類型**：Zoomable Timeline + Brush Selection
- **核心功能**：
  - 橫向時間軸（1600-2026）
  - 重大事件節點標記
  - 可縮放查看不同時期細節
  - 點擊事件彈出資訊卡
  - 政權更迭背景色變化
- **數據來源**：
  - 維基百科台灣史條目
  - 國史館台灣文獻館
  - 現有 History 文章整理
- **預估工時**：2-3 週
- **引爆點價值**：歷史視覺化高教育價值，國際媒體易關注

#### 3. 升級版知識圖譜（首頁） ⭐⭐⭐⭐
- **放置位置**：首頁（現有基礎上升級）
- **D3 圖表類型**：Enhanced Force Network
- **新增功能**：
  - 節點大小反映文章豐富度
  - 邊權重顯示關聯強度
  - 主題分群著色（12 面向）
  - 搜尋高亮顯示
  - 篩選器（依主題、語言）
  - 全螢幕模式
- **數據來源**：現有文章元數據擴充
- **預估工時**：1-2 週
- **引爆點價值**：首頁視覺衝擊，HN Show 重點展示

### 🟡 P1 — 中等影響力

#### 4. 台灣產業結構 Treemap
- **放置位置**：Economy Hub 頁面
- **D3 圖表類型**：Zoomable Treemap
- **核心功能**：
  - GDP 產業結構分解
  - 可鑽取到細分行業
  - 半導體產業鏈特別標註
  - 年度數據切換
- **數據來源**：主計處國民所得統計
- **預估工時**：2-3 週

#### 5. 族群文化分布 Sunburst
- **放置位置**：Society Hub 頁面
- **D3 圖表類型**：Interactive Sunburst
- **核心功能**：
  - 內圈：四大族群（原住民、閩南、客家、外省）
  - 外圈：細分群體
  - 點擊展開文化特色介紹
- **數據來源**：戶政司人口統計、族群文化資料
- **預估工時**：2 週

#### 6. 台灣音樂時代演進網絡
- **放置位置**：Music Hub 頁面
- **D3 圖表類型**：Timeline + Network Hybrid
- **核心功能**：
  - 時間軸：原住民古調→日治→戰後→流行→當代
  - 音樂家關係網絡
  - 音樂風格傳承線
  - 嵌入音樂播放器
- **數據來源**：文化部音樂資料庫、台灣音樂館
- **預估工時**：3 週

### 🟢 P2 — 長期規劃

#### 7. 美食地圖與夜市分布
- **D3 圖表類型**：Point Map + Clustering
- **功能**：台灣夜市、小吃分布熱力圖

#### 8. 生物多樣性互動儀表板
- **D3 圖表類型**：Multi-layered Visualization
- **功能**：59,000+ 物種分布、瀕危狀態、保育區域

#### 9. 選舉結果歷史變遷
- **D3 圖表類型**：Electoral Map + Time Series
- **功能**：歷屆選舉結果地圖，展現民主發展

#### 10. 貿易夥伴 Chord Diagram
- **D3 圖表類型**：Dynamic Chord Diagram
- **功能**：台灣進出口貿易流向，年度變化動畫

---

## 技術架構建議

### 數據格式標準化
```json
{
  "taiwan-geo": {
    "format": "TopoJSON",
    "source": "taiwan-counties.json",
    "features": ["counties", "townships", "villages"]
  },
  "timeline-events": {
    "format": "JSON",
    "schema": {
      "date": "YYYY-MM-DD",
      "title": "string",
      "description": "string",
      "category": "political|economic|cultural|social",
      "importance": 1-5
    }
  }
}
```

### 共用 D3 Utility 庫
```javascript
// utils/taiwanD3.js
class TaiwanD3 {
  static projection() { /* 台灣專用投影 */ }
  static colorSchemes() { /* 台灣主題色彩 */ }
  static responsive() { /* 響應式容器 */ }
  static tooltip() { /* 統一 tooltip 樣式 */ }
}
```

### 響應式設計考量
- **斷點設計**：手機 (320px)、平板 (768px)、桌面 (1024px+)
- **觸控優化**：手機端適配觸控操作
- **載入策略**：大數據集分批載入，避免阻塞

### 效能考量
- **SSR vs Client-side**：
  - 靜態圖表：SSR 預渲染
  - 互動圖表：Client-side 動態載入
  - Hybrid：首屏 SSR，互動 CSR
- **數據快取**：
  - TopoJSON 本地快取
  - API 數據 CDN 分發
  - 圖表狀態 localStorage 記憶

### 可訪問性 (A11y)
- **鍵盤導航**：Tab 順序、快捷鍵
- **螢幕閱讀器**：ARIA 標籤、語義化描述
- **色盲友善**：ColorBrewer 色彩方案

---

## 實作路線圖

### 整合到 Taiwan.md 發展階段

#### Week 1-2：基礎設施建置（Phase 1 中期）
- [ ] 建立 TaiwanD3 utility 庫
- [ ] 設計響應式 D3 容器系統
- [ ] 收集並清理 Taiwan TopoJSON 數據
- [ ] 建立統一的數據 API 端點

#### Week 3-4：P0-1 台灣地理分布地圖（Phase 1 後期）
- [ ] 實作基礎台灣地圖投影
- [ ] 整合國家公園、原住民族分布圖層
- [ ] 開發圖層切換介面
- [ ] 整合 Geography Hub 頁面

#### Week 5-7：P0-2 歷史時間軸（Phase 2 前期）
- [ ] 收集並結構化歷史事件數據
- [ ] 實作可縮放時間軸
- [ ] 開發事件詳情彈窗
- [ ] 整合 History Hub 頁面

#### Week 8-9：P0-3 升級版知識圖譜（Phase 2 中期）
- [ ] 分析現有圖譜架構
- [ ] 增強節點/邊的數據維度
- [ ] 實作搜尋和篩選功能
- [ ] 部署到首頁替換現有版本

### HN Show 準備時機

**最佳 Show HN 時機**：P0-1~P0-2 完成後

- 地圖視覺化 + 歷史時間軸 = 雙視覺衝擊
- 標題建議：`Show HN: Taiwan.md – Interactive knowledge base about Taiwan with D3.js visualizations`

#### Week 10-12：P1 中優先級項目（Phase 2 後期）
- [ ] 根據 HN/Reddit 用戶反饋和數據表現
- [ ] 選擇 P1 中最有影響力的 2-3 個項目
- [ ] 完成開發並整合到相應 Hub 頁面

#### Week 13-16：優化與迭代（Phase 3 準備）
- [ ] 效能調優（載入時間、動畫流暢度）
- [ ] 多裝置測試和調整
- [ ] SEO 和分享優化
- [ ] 用戶體驗測試和改進

---

## 預期成果與 KPI

### 量化指標（契合萬星目標）

- **GitHub Stars**：從當前 ~5 → 500+（P0 完成後）→ 2000+（HN 爆發後）
- **頁面停留時間**：提升 40%（互動探索吸引）
- **分享率**：提升 60%（視覺吸引力）
- **回訪率**：提升 30%（探索深度）
- **行動裝置友善度**：達到 95%+ Google PageSpeed 評分

### 質化影響

- **教育價值**：將抽象概念視覺化，提升學習效果
- **文化推廣**：透過視覺敘事，向國際展示台灣複雜性
- **開源貢獻**：建立 Taiwan.js 視覺化組件庫，供其他專案使用
- **媒體關注**：成為台灣數位文化的標竿案例

### 稜鏡效應加成

1. **🎨 藝術家國際曝光**：D3.js 技術展示 + 台灣文化內容
2. **🌐 國際人脈**：技術社群 + 文化推廣雙重網絡
3. **💻 技術展示**：前端視覺化能力完整展示
4. **📚 教學素材**：Workshop 的完整案例
5. **🤝 社群建立**：吸引設計師、數據視覺化專家加入
6. **🇹🇼 國家品牌**：「台灣 = 高品質數位文化」印象
7. **📖 出版延伸**：視覺化可延伸為互動電子書

### 長期願景
Taiwan.md 將從一個靜態知識庫進化為**動態的台灣探索平台**，讓每一位訪客都能透過互動視覺化，找到自己理解台灣的獨特路徑。

## 💡 執行建議

### 短期催化器（本週可準備）

1. **收集台灣 TopoJSON 資料**（1 天）
2. **研究現有圖譜程式碼結構**（半天）
3. **設計 TaiwanD3 utility 架構**（1 天）

### 中期里程碑（配合 Phase 2）

4. **地圖視覺化上線** → g0v Slack 分享
5. **歷史時間軸完成** → Reddit r/taiwan 分享  
6. **HN Show 發文準備** → 雙視覺化完成後

### 長期護城河

7. **Taiwan.js 組件庫開源**：讓其他開發者可重用我們的視覺化組件
8. **數據 API 開放**：提供結構化台灣數據給其他專案使用
9. **視覺化模板化**：新增主題時可快速套用視覺化模板

---

*撰寫者：Taiwan.md 專案 D3.js 升級企劃*  
*時間：2026-03-18*  
*版本：v1.0*