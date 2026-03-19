import os
import re

# Hub 檔案資訊
hub_info = {
    'art': ('台灣藝術文化', '探索台灣豐富的藝術文化傳統，從傳統工藝到當代創作。'),
    'culture': ('台灣文化', '了解台灣多元文化的形成與特色，包括各族群的文化傳統。'),
    'economy': ('台灣經濟', '從農業社會到科技島國，台灣經濟發展的轉型歷程。'),
    'food': ('台灣飲食', '台灣的飲食文化融合各族群特色，形成獨特的美食體系。'),
    'geography': ('台灣地理', '台灣位於亞洲大陸邊緣，面積雖小但地形多樣。'),
    'history': ('台灣歷史', '從史前時代到現代，台灣歷史的完整脈絡與重要事件。'),
    'lifestyle': ('台灣生活', '探索台灣人的日常生活方式與社會制度特色。'),
    'music': ('台灣音樂', '從傳統南管北管到流行音樂，台灣音樂的豐富面貌。'),
    'nature': ('台灣自然', '台灣雖小卻擁有豐富的生物多樣性與獨特的自然景觀。'),
    'people': ('台灣人物', '影響台灣發展的重要人物與其貢獻。'),
    'society': ('台灣社會', '台灣社會的民主化進程與多元價值的發展。'),
    'technology': ('台灣科技', '從半導體產業到開源社群，台灣在科技發展上的成就。')
}

# 處理所有 Hub 檔案
for category, (title, description) in hub_info.items():
    hub_file = f"src/content/zh-TW/{category}/_{category.title()} Hub.md"
    if os.path.exists(hub_file):
        with open(hub_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 檢查是否已有正確的 frontmatter
        if not re.search(r'^title:', content, re.MULTILINE):
            print(f"修復 {hub_file}")
            
            # 移除舊的 frontmatter
            if content.startswith('---'):
                parts = content.split('---', 2)
                if len(parts) >= 3:
                    body = parts[2]
                else:
                    body = content
            else:
                body = content
            
            # 新的 frontmatter
            new_frontmatter = f'''---
title: "{title}"
description: "{description}"
date: 2026-03-17T00:00:00Z
tags: ["{category.title()}", "Hub"]
author: "taiwan.md 社群"
difficulty: "beginner"
readingTime: 5
featured: false
---'''
            
            # 寫入檔案
            with open(hub_file, 'w', encoding='utf-8') as f:
                f.write(new_frontmatter + '\n' + body.lstrip('\n'))

print("✅ Hub 檔案修復完成")
