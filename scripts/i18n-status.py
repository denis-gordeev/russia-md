#!/usr/bin/env python3
"""Taiwan.md i18n Status — 掃描中英文對照狀態"""
import os, hashlib, json, re, sys
from pathlib import Path

ZH_DIR = Path("knowledge")  # 中文 SSOT 直接在 knowledge/ 根目錄
EN_DIR = Path("knowledge/en")
MAPPING_FILE = Path("scripts/i18n-mapping.json")

CATEGORIES = [
    "History", "Geography", "Culture", "Food", "Art", "Music",
    "Technology", "Nature", "People", "Society", "Economy", "Lifestyle"
]

def content_hash(filepath):
    """Hash the body (after frontmatter) of a markdown file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    parts = content.split('---', 2)
    body = parts[2].strip() if len(parts) >= 3 else content
    return hashlib.md5(body.encode()).hexdigest()[:6]

def get_frontmatter(filepath):
    """Extract frontmatter as dict."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    parts = content.split('---', 2)
    if len(parts) < 3:
        return {}
    fm = {}
    for line in parts[1].strip().split('\n'):
        if ':' in line:
            key, val = line.split(':', 1)
            fm[key.strip()] = val.strip().strip('"').strip("'")
    return fm

def get_title(filepath):
    """Get title from frontmatter."""
    fm = get_frontmatter(filepath)
    return fm.get('title', filepath.stem)

def scan_articles(base_dir, categories):
    """Scan all non-Hub articles."""
    articles = {}
    for cat in categories:
        cat_dir = base_dir / cat
        if not cat_dir.exists():
            continue
        for f in sorted(cat_dir.glob("*.md")):
            if f.name.startswith('_'):
                continue
            rel = f"{cat}/{f.name}"
            articles[rel] = {
                'path': f,
                'hash': content_hash(f),
                'title': get_title(f),
            }
    return articles

def build_mapping(zh_articles, en_articles):
    """Build or load mapping between zh and en articles."""
    mapping = {}
    
    # Load existing mapping
    if MAPPING_FILE.exists():
        with open(MAPPING_FILE, 'r') as f:
            mapping = json.load(f)
    
    # Try to auto-match by category + similar names
    for zh_key in zh_articles:
        if zh_key in mapping:
            continue
        cat = zh_key.split('/')[0]
        zh_title = zh_articles[zh_key]['title']
        
        # Check if any en article has translatedFrom pointing here
        for en_key, en_info in en_articles.items():
            fm = get_frontmatter(en_info['path'])
            if fm.get('translatedFrom', '').replace('zh-TW/', '') == zh_key:
                mapping[zh_key] = en_key
                break
        
        if zh_key not in mapping:
            # Try matching by category
            for en_key in en_articles:
                if en_key.split('/')[0] == cat and en_key not in mapping.values():
                    en_fm = get_frontmatter(en_articles[en_key]['path'])
                    if en_fm.get('chineseTitle', '') == zh_title:
                        mapping[zh_key] = en_key
                        break
    
    return mapping

def main():
    ci_mode = '--ci' in sys.argv
    
    zh_articles = scan_articles(ZH_DIR, CATEGORIES)
    en_articles = scan_articles(EN_DIR, CATEGORIES)
    
    mapping = build_mapping(zh_articles, en_articles)
    
    # Save mapping
    MAPPING_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
    
    up_to_date = []
    outdated = []
    missing = []
    
    for zh_key, zh_info in sorted(zh_articles.items()):
        en_key = mapping.get(zh_key)
        
        if en_key and en_key in en_articles:
            en_info = en_articles[en_key]
            en_fm = get_frontmatter(en_info['path'])
            source_hash = en_fm.get('sourceHash', '')
            
            if source_hash == zh_info['hash']:
                up_to_date.append((zh_key, en_key))
            elif source_hash:
                outdated.append((zh_key, en_key, zh_info['hash'], source_hash))
            else:
                # No sourceHash = legacy translation, treat as potentially outdated
                up_to_date.append((zh_key, en_key))
        else:
            missing.append(zh_key)
    
    # Also list en articles without zh mapping
    orphan_en = [k for k in en_articles if k not in mapping.values()]
    
    # Output
    total = len(zh_articles)
    print(f"📊 Taiwan.md i18n Status Report")
    print(f"{'=' * 45}")
    print(f"  📝 中文文章總數: {total}")
    print(f"  ✅ 已有英文版:   {len(up_to_date)}")
    print(f"  ⚠️  翻譯過期:    {len(outdated)}")
    print(f"  ❌ 缺少英文版:   {len(missing)}")
    print(f"  🔗 英文獨立文章: {len(orphan_en)}")
    print(f"{'=' * 45}")
    
    coverage = (len(up_to_date) + len(outdated)) / total * 100 if total > 0 else 0
    print(f"  📈 翻譯覆蓋率: {coverage:.0f}%")
    print()
    
    if outdated:
        print(f"⚠️  OUTDATED ({len(outdated)} 篇中文已更新，英文需重翻):")
        for zh, en, zh_hash, en_hash in outdated:
            print(f"  {zh}  →  {en}")
            print(f"    zh: {zh_hash} vs en: {en_hash}")
        print()
    
    if missing:
        print(f"❌ MISSING ({len(missing)} 篇缺少英文版):")
        by_cat = {}
        for m in missing:
            cat = m.split('/')[0]
            if cat not in by_cat:
                by_cat[cat] = []
            by_cat[cat].append(m)
        for cat, items in sorted(by_cat.items()):
            print(f"  [{cat}]")
            for item in items:
                title = zh_articles[item]['title']
                print(f"    • {title} ({item})")
        print()
    
    if orphan_en:
        print(f"🔗 英文獨立文章 ({len(orphan_en)} 篇，無對應中文):")
        for e in orphan_en:
            print(f"  • {e}")
        print()
    
    # Summary
    print(f"💡 下一步:")
    if missing:
        print(f"  1. 運行 scripts/translate-missing.py 翻譯 {len(missing)} 篇缺失文章")
    if outdated:
        print(f"  2. 運行 scripts/translate-outdated.py 更新 {len(outdated)} 篇過期翻譯")
    print(f"  3. 映射表已儲存: {MAPPING_FILE}")
    
    if ci_mode and missing:
        miss_pct = len(missing) / total * 100
        if miss_pct > 50:
            print(f"\n⚠️ CI WARNING: {miss_pct:.0f}% articles missing English translation")
            sys.exit(1)

if __name__ == '__main__':
    main()
