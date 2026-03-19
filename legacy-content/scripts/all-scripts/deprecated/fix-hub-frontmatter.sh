#!/bin/bash
# 修復 Hub 檔案的 frontmatter

set -e

echo "🔧 修復 Hub 檔案 frontmatter..."

# Hub 檔案資訊
declare -A hub_info=(
    ["art"]="台灣藝術文化|探索台灣豐富的藝術文化傳統，從傳統工藝到當代創作。"
    ["culture"]="台灣文化|了解台灣多元文化的形成與特色，包括各族群的文化傳統。"
    ["economy"]="台灣經濟|從農業社會到科技島國，台灣經濟發展的轉型歷程。"
    ["food"]="台灣飲食|台灣的飲食文化融合各族群特色，形成獨特的美食體系。"
    ["geography"]="台灣地理|台灣位於亞洲大陸邊緣，面積雖小但地形多樣，從海平面到近4000公尺高山。"
    ["history"]="台灣歷史|從史前時代到現代，台灣歷史的完整脈絡與重要事件。"
    ["lifestyle"]="台灣生活|探索台灣人的日常生活方式與社會制度特色。"
    ["music"]="台灣音樂|從傳統南管北管到流行音樂，台灣音樂的豐富面貌。"
    ["nature"]="台灣自然|台灣雖小卻擁有豐富的生物多樣性與獨特的自然景觀。"
    ["people"]="台灣人物|影響台灣發展的重要人物與其貢獻。"
    ["society"]="台灣社會|台灣社會的民主化進程與多元價值的發展。"
    ["technology"]="台灣科技|從半導體產業到開源社群，台灣在科技發展上的成就。"
)

for hub_file in src/content/zh-TW/*/_{Art,Culture,Economy,Food,Geography,History,Lifestyle,Music,Nature,People,Society,Technology}\ Hub.md; do
    if [ -f "$hub_file" ]; then
        # 提取類別名稱 (例如：art, culture, etc.)
        category=$(echo "$hub_file" | sed 's/.*\/\([a-z]*\)\/_.*Hub\.md/\1/')
        
        if [[ -n "${hub_info[$category]}" ]]; then
            title_desc="${hub_info[$category]}"
            title=$(echo "$title_desc" | cut -d'|' -f1)
            description=$(echo "$title_desc" | cut -d'|' -f2)
            
            echo "🔧 修復 $hub_file"
            
            # 讀取現有內容
            content=$(cat "$hub_file")
            
            # 檢查是否已有正確的 frontmatter
            if ! echo "$content" | head -10 | grep -q "^title:"; then
                # 提取現有的 frontmatter（如果有的話）
                if echo "$content" | head -1 | grep -q "^---"; then
                    # 有 frontmatter，需要更新
                    end_line=$(echo "$content" | tail -n +2 | grep -n "^---" | head -1 | cut -d: -f1)
                    end_line=$((end_line + 1))
                    
                    # 保留現有的額外欄位
                    existing_meta=$(echo "$content" | sed -n "2,${end_line}p" | head -n -1 | grep -v "^title:\|^description:\|^date:\|^tags:\|^author:\|^difficulty:\|^readingTime:\|^featured:")
                    
                    # 構建新的 frontmatter
                    new_frontmatter="---
title: \"$title\"
description: \"$description\"
date: 2026-03-17T00:00:00Z
tags: [\"$(echo $category | tr '[:lower:]' '[:upper:]' | cut -c1)$(echo $category | cut -c2-)\", \"Hub\"]
author: \"taiwan.md 社群\"
difficulty: \"beginner\"
readingTime: 5
featured: false"
                    
                    if [ -n "$existing_meta" ]; then
                        new_frontmatter="$new_frontmatter
$existing_meta"
                    fi
                    
                    new_frontmatter="$new_frontmatter
---"
                    
                    # 重建檔案
                    body=$(echo "$content" | tail -n +$((end_line + 1)))
                    echo -e "$new_frontmatter\n$body" > "$hub_file"
                else
                    # 沒有 frontmatter，添加新的
                    new_frontmatter="---
title: \"$title\"
description: \"$description\"
date: 2026-03-17T00:00:00Z
tags: [\"$(echo $category | tr '[:lower:]' '[:upper:]' | cut -c1)$(echo $category | cut -c2-)\", \"Hub\"]
author: \"taiwan.md 社群\"
difficulty: \"beginner\"
readingTime: 5
featured: false
---
"
                    echo -e "$new_frontmatter$content" > "$hub_file"
                fi
                echo "  ✅ 已修復 $title"
            else
                echo "  ⏭️  已有正確 frontmatter，跳過"
            fi
        fi
    fi
done

echo "✨ Hub 檔案 frontmatter 修復完成！"