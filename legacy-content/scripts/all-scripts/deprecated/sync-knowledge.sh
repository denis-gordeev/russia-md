#!/bin/bash
# 從 knowledge/ SSOT 同步到 src/content/ 投影層
# 用法: bash scripts/sync-knowledge.sh

set -e  # 遇到錯誤立即退出

echo "🔄 開始同步 knowledge/ → src/content/..."

# 建立目錄結構
echo "📁 建立目錄結構..."
mkdir -p src/content/zh-TW/{about,art,culture,economy,food,geography,history,lifestyle,music,nature,people,society,technology,resources}
mkdir -p src/content/en/{about,food,history,nature,society,technology,resources}

# 統計初始檔案數
KNOWLEDGE_COUNT=$(find knowledge/ -name "*.md" | wc -l)
CONTENT_BEFORE=$(find src/content/ -name "*.md" | wc -l)

echo "📊 knowledge/ 總檔案數: $KNOWLEDGE_COUNT"
echo "📊 同步前 src/content/ 檔案數: $CONTENT_BEFORE"

# 同步根目錄檔案
echo "📄 同步根目錄檔案..."
if [ -f "knowledge/_Home.md" ]; then
    cp "knowledge/_Home.md" "src/content/zh-TW/_Home.md"
    echo "  ✅ _Home.md"
fi

# 同步中文分類目錄
echo "🇹🇼 同步中文分類目錄..."
SYNCED_COUNT=0
for category in About Art Culture Economy Food Geography History Lifestyle Music Nature People Society Technology; do
  if [ -d "knowledge/$category" ]; then
    lowercase_category=$(echo $category | tr '[:upper:]' '[:lower:]')
    for file in knowledge/$category/*.md; do
      if [ -f "$file" ]; then
        filename=$(basename "$file")
        target_file="src/content/zh-TW/$lowercase_category/$filename"
        
        # 總是覆蓋以保持同步（SSOT 為準）
        cp "$file" "$target_file"
        echo "  ✅ $category/$filename"
        ((SYNCED_COUNT++))
      fi
    done
  fi
done

# 同步 resources 目錄（避免重複）
echo "📚 同步 resources 目錄..."
for resource_dir in "knowledge/resources" "knowledge/zh-TW/resources"; do
  if [ -d "$resource_dir" ]; then
    for file in $resource_dir/*.md; do
      if [ -f "$file" ]; then
        filename=$(basename "$file")
        target_file="src/content/zh-TW/resources/$filename"
        cp "$file" "$target_file"
        echo "  ✅ resources/$filename"
        ((SYNCED_COUNT++))
      fi
    done
  fi
done

# 同步英文內容
echo "🇺🇸 同步英文內容..."
if [ -d "knowledge/en" ]; then
  for category in About Food History Nature Society Technology; do
    if [ -d "knowledge/en/$category" ]; then
      lowercase_category=$(echo $category | tr '[:upper:]' '[:lower:]')
      for file in knowledge/en/$category/*.md; do
        if [ -f "$file" ]; then
          filename=$(basename "$file")
          target_file="src/content/en/$lowercase_category/$filename"
          cp "$file" "$target_file"
          echo "  ✅ en/$category/$filename"
          ((SYNCED_COUNT++))
        fi
      done
    fi
  done
  
  # 英文 resources
  if [ -d "knowledge/en/resources" ]; then
    for file in knowledge/en/resources/*.md; do
      if [ -f "$file" ]; then
        filename=$(basename "$file")
        target_file="src/content/en/resources/$filename"
        cp "$file" "$target_file"
        echo "  ✅ en/resources/$filename"
        ((SYNCED_COUNT++))
      fi
    done
  fi
fi

# 統計結果
CONTENT_AFTER=$(find src/content/ -name "*.md" | wc -l)

echo ""
echo "🎉 同步完成！"
echo "📊 同步後 src/content/ 檔案數: $CONTENT_AFTER"
echo "📊 新增/更新檔案數: $((CONTENT_AFTER - CONTENT_BEFORE))"
echo "🔄 實際處理檔案數: $SYNCED_COUNT"

echo ""
echo "✨ knowledge/ SSOT → src/content/ 投影層同步完成"