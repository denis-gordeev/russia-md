#!/usr/bin/env python3
"""
terminology-clean.py
Taiwan.md YAML 詞庫清理工具

功能：
1. 清理 display.china 欄位中含有 / 或括號說明的 messy entries
2. 跳過 N/A、（無直接對應）等特殊值
3. 跳過 china == taiwan 的情況
4. 不重新格式化 YAML，只做最小 in-place 替換

使用方式：
  python3 scripts/tools/terminology-clean.py [--dry-run]
"""

import re
import sys
from pathlib import Path

BASE_DIR = Path("/Users/cheyuwu/taiwan-md")
TERMINOLOGY_DIR = BASE_DIR / "data" / "terminology"

DRY_RUN = "--dry-run" in sys.argv

# 不修改的特殊值
SKIP_PATTERNS = [
    r'^N/A',
    r'^（無直接對應）',
    r'^（無對應）',
]


def should_skip(china_val: str) -> bool:
    """是否跳過此值（特殊說明、NA等）"""
    v = china_val.strip()
    for pat in SKIP_PATTERNS:
        if re.match(pat, v):
            return True
    return False


def clean_china_value(china_val: str) -> str | None:
    """
    清理 china 值，回傳清理後的值。
    如果無需修改，回傳 None。

    規則：
    1. 去掉括號說明（簡）、（中國）、（舊）等
    2. 如果含 /，取第一個變體
    3. 最後 strip 空白
    """
    original = china_val.strip()

    # 如果是特殊跳過值
    if should_skip(original):
        return None

    result = original

    # Step 1: 去掉括號說明
    # 匹配各種括號（全形/半形）中的說明文字
    # 例：微波炉（簡）→ 微波炉
    # 例：高速公路（中國）→ 高速公路
    # 例：歌仔戲（閩南語戲曲）→ 歌仔戲（保留這個因為它是地名/正式名稱的說明？）
    # 但根據需求，括號說明都去掉
    result = re.sub(r'（[^）]*）', '', result)  # 全形括號
    result = re.sub(r'\([^)]*\)', '', result)   # 半形括號
    result = result.strip()

    # Step 2: 如果含有 /，取第一個變體
    # 支援帶空格的 " / " 和不帶空格的 "/"
    if '/' in result:
        parts = re.split(r'\s*/\s*', result)
        result = parts[0].strip()

    # Step 3: 清理可能殘留的空白
    result = result.strip()

    # 如果結果為空，說明原本就是括號說明，跳過
    if not result:
        return None

    # 如果跟原始值一樣，不需要修改
    if result == original:
        return None

    return result


def get_taiwan_value(content: str) -> str | None:
    """從 YAML 內容取出 taiwan 值"""
    m = re.search(r'^\s*taiwan:\s*["\']?(.+?)["\']?\s*$', content, re.MULTILINE)
    if m:
        val = m.group(1).strip().strip('"\'')
        return val
    return None


def process_file(yaml_path: Path) -> dict | None:
    """
    處理單個 YAML 檔案
    回傳：
    - None 如果不需要修改
    - dict 如果需要修改：{'original': ..., 'cleaned': ..., 'path': ...}
    """
    content = yaml_path.read_text(encoding='utf-8')

    # 找 display.china 行
    # 支援格式：
    #   china: 值
    #   china: "值"
    #   china: '值'
    china_match = re.search(
        r'^(\s*china:\s*)(["\']?)(.+?)(["\']?)\s*$',
        content,
        re.MULTILINE
    )
    if not china_match:
        return None

    indent_and_key = china_match.group(1)  # e.g. "  china: "
    quote_open = china_match.group(2)      # e.g. '"' or ''
    china_val = china_match.group(3)       # the value
    quote_close = china_match.group(4)     # e.g. '"' or ''

    # 如果是引號包住的值，要先處理引號
    # 但正則可能把引號吃進 group(3)，需要再清理
    # 如果 quote_open 非空，quote_close 應該也非空
    if quote_open and china_val.endswith(quote_close) and quote_close:
        china_val = china_val[:-len(quote_close)]

    china_val = china_val.strip()

    if should_skip(china_val):
        return None

    cleaned = clean_china_value(china_val)
    if cleaned is None:
        return None

    # 規則4：如果 cleaned 後跟 taiwan 值相同，不修改
    taiwan_val = get_taiwan_value(content)
    if taiwan_val and cleaned == taiwan_val:
        return None

    return {
        'path': yaml_path,
        'original': china_val,
        'cleaned': cleaned,
        'content': content,
        'match': china_match,
        'indent_and_key': indent_and_key,
    }


def apply_fix(info: dict) -> None:
    """將清理後的值寫回 YAML 檔案（最小修改）"""
    content = info['content']
    china_match = info['match']
    cleaned = info['cleaned']
    indent_and_key = info['indent_and_key']

    # 重建這一行
    # 如果清理後的值含有特殊字符（/ : #等），加引號
    needs_quote = any(c in cleaned for c in ['/', ':', '#', '"', "'"])
    if needs_quote:
        new_line = f'{indent_and_key}"{cleaned}"'
    else:
        new_line = f'{indent_and_key}{cleaned}'

    # 取得原始整行（包含行尾）
    original_full_line = china_match.group(0)

    # 替換
    new_content = content.replace(original_full_line, new_line, 1)

    info['path'].write_text(new_content, encoding='utf-8')


def main():
    yaml_files = sorted(TERMINOLOGY_DIR.glob('*.yaml'))
    print(f"掃描 {len(yaml_files)} 個 YAML 檔案...\n")

    changes = []
    errors = []

    for yaml_path in yaml_files:
        try:
            result = process_file(yaml_path)
            if result:
                changes.append(result)
        except Exception as e:
            errors.append((yaml_path.name, str(e)))

    print(f"{'[DRY RUN] ' if DRY_RUN else ''}找到 {len(changes)} 個需要修改的 china 值：\n")

    for info in changes:
        print(f"  {info['path'].name}")
        print(f"    原始: {info['original']}")
        print(f"    清理: {info['cleaned']}")
        print()

    if errors:
        print(f"\n⚠️  {len(errors)} 個錯誤：")
        for fname, err in errors:
            print(f"  {fname}: {err}")

    if not DRY_RUN and changes:
        print(f"\n正在寫入 {len(changes)} 個修改...")
        written = 0
        for info in changes:
            try:
                apply_fix(info)
                written += 1
            except Exception as e:
                print(f"  ❌ {info['path'].name}: {e}")
        print(f"✅ 完成！修改了 {written} 個檔案")
    elif DRY_RUN:
        print("\n（Dry run 模式，未寫入任何修改）")
    else:
        print("沒有需要修改的項目。")


if __name__ == '__main__':
    main()
