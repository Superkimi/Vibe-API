#!/usr/bin/env python3
"""Pre-translate public catalog descriptions for the client-side locale switcher.

The product never calls a translation service at runtime. This script only
translates the checked-in public catalog metadata and writes a deterministic
lookup table consumed by the explorer.
"""

from __future__ import annotations

import argparse
import json
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


STATIC_TRANSLATIONS = {
    "Music": "音乐",
    "File Sharing and Storage": "文件共享与存储",
    "Weather": "天气",
    "Art": "艺术",
    "Books": "图书",
    "Images": "图片",
    "Icons": "图标",
    "Adoption": "领养",
    "Unknown": "未知",
    "Public API listed in the public-apis directory.": "public-apis 目录收录的公开 API。",
    "Query or path parameter discovered from the upstream module.": "来自上游模块识别出的查询或路径参数。",
    "Directory metadata; open the provider documentation for its live endpoint contract.": "目录元数据；请打开提供方文档查看实时接口契约。",
    "Live route from the 60s open API collection: /v2/{path}.": "来自 60s 开放 API 集合的实时路由：/v2/{path}。",
}


def read_catalog(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"export const generatedCatalog = (.+) as const;", text, re.S)
    if not match:
        raise SystemExit(f"Could not find generatedCatalog in {path}")
    return json.loads(match.group(1))


def translate_remote(value: str) -> str:
    query = urlencode({"client": "gtx", "sl": "en", "tl": "zh-CN", "dt": "t", "q": value})
    request = Request(f"https://translate.googleapis.com/translate_a/single?{query}", headers={"User-Agent": "Vibe-API-catalog-builder/1.0"})
    with urlopen(request, timeout=15) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return "".join(part[0] for part in payload[0] if part and part[0])


def translate_fallback(value: str) -> str:
    query = urlencode({"q": value, "langpair": "en|zh-CN"})
    request = Request(f"https://api.mymemory.translated.net/get?{query}", headers={"User-Agent": "Vibe-API-catalog-builder/1.0"})
    with urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return str(payload.get("responseData", {}).get("translatedText", ""))


def translate(value: str, cache: dict[str, str], lock: threading.Lock) -> str:
    if value in STATIC_TRANSLATIONS:
        return STATIC_TRANSLATIONS[value].replace("{path}", "{path}")
    with lock:
        if value in cache and not cache[value].startswith("接口说明："):
            return cache[value]
    result = ""
    for attempt in range(3):
        try:
            result = translate_remote(value)
            if result:
                break
        except Exception:
            time.sleep(0.6 * (attempt + 1))
    if not result:
        for attempt in range(2):
            try:
                result = translate_fallback(value)
                if result:
                    break
            except Exception:
                time.sleep(0.8 * (attempt + 1))
    if not result:
        result = f"接口说明：{value}"
    if not result.startswith("接口说明："):
        with lock:
            cache[value] = result
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", type=Path, default=Path("lib/catalog-data.generated.ts"))
    parser.add_argument("--output", type=Path, default=Path("lib/catalog-locales.generated.ts"))
    parser.add_argument("--cache", type=Path, default=Path("/private/tmp/vibe-api-description-zh.json"))
    parser.add_argument("--workers", type=int, default=12)
    args = parser.parse_args()

    catalog = read_catalog(args.catalog)
    cache: dict[str, str] = {}
    if args.cache.exists():
        cache.update(json.loads(args.cache.read_text(encoding="utf-8")))
    lock = threading.Lock()
    source_values = sorted({entry["description"] for entry in catalog})
    missing = [value for value in source_values if (value not in cache or cache[value].startswith("接口说明：")) and value not in STATIC_TRANSLATIONS]
    print(f"translating {len(missing)} unique descriptions across {len(catalog)} catalog entries")
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        jobs = {executor.submit(translate, value, cache, lock): value for value in missing}
        for index, job in enumerate(as_completed(jobs), start=1):
            job.result()
            if index % 100 == 0 or index == len(jobs):
                print(f"translated {index}/{len(jobs)}")
    args.cache.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")

    localized = {
        entry["id"]: {
            "description": STATIC_TRANSLATIONS.get(entry["description"], cache.get(entry["description"], f"接口说明：{entry['description']}")),
        }
        for entry in catalog
    }
    payload = json.dumps(localized, ensure_ascii=False, separators=(",", ":"))
    args.output.write_text("// Generated from public catalog descriptions. Do not hand-edit.\n" + f"export const catalogLocalesZh = {payload} as const;\n", encoding="utf-8")
    print(f"wrote {len(localized)} localized entries -> {args.output}")


if __name__ == "__main__":
    main()
