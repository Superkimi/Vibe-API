#!/usr/bin/env python3
"""Generate the checked-in Vibe API catalog from the two upstream projects.

The source repositories are intentionally not vendored into the product. The
generated catalog keeps the UI deterministic while preserving source links and
the upstream route inventory used for review.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path
from urllib.parse import urlparse


def slugify(value: str, fallback: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    normalized = re.sub(r"[^A-Za-z0-9]+", "-", normalized).strip("-").lower()
    return normalized or fallback


def markdown_link(value: str) -> tuple[str, str]:
    match = re.search(r"^\[([^\]]+)\]\(([^)]+)\)", value.strip())
    if not match:
        return value.strip().strip("`"), "https://github.com/public-apis/public-apis"
    return match.group(1).strip(), match.group(2).strip()


def safe_url(value: str) -> tuple[str, str]:
    try:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError
        return f"{parsed.scheme}://{parsed.netloc}", parsed.path or "/"
    except ValueError:
        return "https://github.com/public-apis/public-apis", "/"


def auth_mode(value: str) -> str:
    normalized = value.lower()
    if "apikey" in normalized or "api key" in normalized:
        return "apiKey"
    if "oauth" in normalized:
        return "oauth"
    if normalized in {"no", "none"}:
        return "none"
    return "unknown"


def availability(value: str) -> bool | None:
    if value.lower() == "yes":
        return True
    if value.lower() == "no":
        return False
    return None


def public_apis_entries(readme: Path) -> list[dict]:
    entries: list[dict] = []
    category = "Uncategorized"
    used: dict[str, int] = {}
    for line in readme.read_text(encoding="utf-8").splitlines():
        heading = re.match(r"^### (.+)$", line)
        if heading:
            category = heading.group(1).strip().replace("!", "")
        if not re.match(r"^\| \[", line) or "---" in line:
            continue
        parts = [part.strip() for part in line.strip().strip("|").split("|")]
        if len(parts) < 2:
            continue
        name, source_url = markdown_link(parts[0])
        description = re.sub(r"\s+", " ", parts[1]).strip()
        # The APILayer sponsor table has only a Postman/Documentation link in
        # its third column; it is not the auth/HTTPS/CORS schema used by the
        # main directory tables.
        has_directory_columns = len(parts) >= 5
        auth = parts[2] if has_directory_columns else "Unknown"
        https = parts[3] if has_directory_columns else "Unknown"
        cors = parts[4] if has_directory_columns else "Unknown"
        slug = slugify(name, f"api-{len(entries) + 1}")
        used[slug] = used.get(slug, 0) + 1
        if used[slug] > 1:
            slug = f"{slug}-{used[slug]}"
        base_url, path = safe_url(source_url)
        entry = {
            "id": f"public-apis-{slug}",
            "name": name,
            "provider": "public-apis",
            "source": "public-apis",
            "sourceLabel": "public-apis directory",
            "category": category,
            "description": description or "Public API listed in the public-apis directory.",
            "method": "GET",
            "baseUrl": base_url,
            "path": path,
            "auth": auth_mode(auth),
            "authLabel": auth or "Unknown",
            "params": [],
            "tags": ["public-apis", slugify(category, "other")[:28]],
            "sourceUrl": source_url,
            "requestExample": source_url,
            "previewMode": "catalog",
            "https": availability(https),
            "cors": cors,
            "sampleResponse": {
                "source": "public-apis",
                "api": name,
                "preview": "Directory metadata; open the provider documentation for its live endpoint contract.",
                "description": description,
                "auth": auth or "Unknown",
                "https": https,
                "cors": cors,
            },
            "responsePreview": "Directory metadata · live response varies by provider",
            "livePreview": False,
        }
        entries.append(entry)
    return entries


ROUTE_LABELS = {
    "60s": "Daily 60s News",
    "60s/rss": "Daily News RSS",
    "weather/realtime": "Weather Realtime",
    "weather/forecast": "Weather Forecast",
    "exchange-rate": "Exchange Rates",
    "gold-price": "Gold Price",
    "fuel-price": "Fuel Price",
    "ip": "IP Geolocation",
    "whois": "WHOIS Lookup",
    "hacker-news/new": "Hacker News · New",
    "hacker-news/top": "Hacker News · Top",
    "hacker-news/best": "Hacker News · Best",
    "ai-news": "AI News",
    "it-news": "IT News",
    "it-news/rank": "IT News Ranking",
    "today-in-history": "Today in History",
    "ncm-rank/list": "NetEase Music Ranking",
    "ncm-rank/:id": "NetEase Music Ranking Detail",
    "ncm-rank": "NetEase Music Ranking · Legacy",
    "maoyan/all/movie": "Maoyan Movie List",
    "maoyan/realtime/movie": "Maoyan Movie Realtime",
    "maoyan/realtime/tv": "Maoyan TV Realtime",
    "maoyan/realtime/web": "Maoyan Web Realtime",
    "douban/weekly/movie": "Douban Weekly Movies",
    "douban/weekly/tv_chinese": "Douban Chinese TV Weekly",
    "douban/weekly/tv_global": "Douban Global TV Weekly",
    "douban/weekly/show_chinese": "Douban Chinese Shows Weekly",
    "douban/weekly/show_global": "Douban Global Shows Weekly",
    "color/random": "Random Color",
    "color/palette": "Color Palette",
    "color": "Color · Legacy",
    "qrcode": "QR Code",
    "hash": "Hash Generator",
    "password": "Password Generator",
    "fanyi": "Translation",
    "fanyi/langs": "Translation Languages",
    "og": "Open Graph Image",
    "health": "Health Check",
}


def route_category(path: str) -> str:
    root = path.split("/")[0]
    if root in {"60s", "60s-rss", "ai-news", "it-news", "toutiao", "weibo", "zhihu", "baidu", "hacker-news", "rednote", "douyin", "bili", "quark", "today-in-history", "awesome-js"}:
        return "News"
    if root in {"weather"}:
        return "Weather"
    if root in {"exchange-rate", "exchange_rate", "gold-price", "fuel-price"}:
        return "Finance"
    if root in {"ip", "whois", "hash", "qrcode", "password", "fanyi", "color", "og", "health", "chemical"}:
        return "Developer & Utility"
    if root in {"maoyan", "ncm-rank", "douban", "lyric", "changya", "kfc", "epic", "moyu", "baike", "answer", "duanzi", "luck", "dongchedi", "olympics"}:
        return "Entertainment"
    return "60s Collection"


def default_value(name: str) -> str | int:
    values: dict[str, str | int] = {
        "city": "Shanghai",
        "province": "Shanghai",
        "location": "Shanghai",
        "region": "Beijing",
        "currency": "CNY",
        "date": "",
        "id": "3778678",
        "size": 10,
        "limit": 10,
        "type": "day",
        "query": "hello",
        "domain": "example.com",
        "ip": "8.8.8.8",
        "encoding": "json",
    }
    return values.get(name, "")


def route_params(module_text: str, path: str) -> list[dict]:
    names: list[str] = []
    names.extend(re.findall(r"searchParams\.(?:get|has)\(['\"]([^'\"]+)", module_text))
    names.extend(re.findall(r"getParam\(['\"]([^'\"]+)", module_text))
    names.extend(re.findall(r"ctx\.params\??\.([A-Za-z][A-Za-z0-9_]*)", module_text))
    names.extend(re.findall(r":([A-Za-z][A-Za-z0-9_-]*)", path))
    result: list[dict] = []
    for name in dict.fromkeys(names):
        if name in {"force-update", "proxy-host"}:
            continue
        result.append({
            "name": name,
            "label": name.replace("_", " ").replace("-", " ").title(),
            "type": "number" if name in {"size", "limit", "id"} else "string",
            "required": name in {"query", "domain"} or f":{name}" in path,
            "defaultValue": default_value(name),
            "description": "Query or path parameter discovered from the upstream module.",
        })
    return result[:24]


def module_map(router_text: str, source_root: Path) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for match in re.finditer(r"import \{\s*([^}]+)\s*\} from ['\"](\./[^'\"]+)['\"]", router_text):
        identifiers = [item.strip() for item in match.group(1).split(",")]
        module = source_root / match.group(2)[2:]
        candidates = [module]
        if not module.exists():
            candidates.append(module.parent / f"{module.stem}.module.ts")
        for candidate in candidates:
            if candidate.exists():
                for identifier in identifiers:
                    mapping[identifier] = candidate.read_text(encoding="utf-8")
                break
    return mapping


def sixty_entries(source_root: Path) -> list[dict]:
    router = (source_root / "router.ts").read_text(encoding="utf-8")
    modules = module_map(router, source_root)
    entries: list[dict] = []
    used: set[str] = set()
    for line in router.splitlines():
        if line.lstrip().startswith("//"):
            continue
        match = re.search(r"appRouter\.(get|post|all)\(['\"]([^'\"]+)", line)
        if not match:
            continue
        method = match.group(1).upper()
        path = match.group(2).lstrip("/")
        raw_slug = slugify(path, f"route-{len(entries) + 1}")
        slug = raw_slug
        suffix = 2
        while slug in used:
            slug = f"{raw_slug}-{suffix}"
            suffix += 1
        used.add(slug)
        handler = re.search(r"(service[A-Za-z0-9]+|olympicsService|serviceGoldPrice)", line)
        text = modules.get(handler.group(1), "") if handler else ""
        params = route_params(text, path)
        label = ROUTE_LABELS.get(path, " ".join(part.replace("-", " ").replace("_", " ").title() for part in path.split("/")))
        category = route_category(path)
        sample_data: dict
        if path.startswith("weather"):
            sample_data = {"location": {"city": "Shanghai"}, "weather": {"condition": "Cloudy", "temperature": 28, "humidity": 67}, "air_quality": {"aqi": 42, "quality": "Good"}}
        elif path.startswith("60s"):
            sample_data = {"date": "2026-08-06", "news": [{"title": "Daily news item", "link": "https://example.com"}], "tip": "Live preview returns the latest collection."}
        elif "exchange" in path or "gold-price" in path or "fuel-price" in path:
            sample_data = {"base": "CNY", "rates": {"USD": 0.14, "EUR": 0.13}, "updatedAt": "live"}
        elif path == "health":
            sample_data = {"status": "ok"}
        elif path.startswith("color"):
            sample_data = {"color": "#6650A4", "palette": ["#6650A4", "#A995DC", "#F4F1F8"]}
        elif path.startswith("password"):
            sample_data = {"password": "••••••••", "length": 12}
        else:
            sample_data = {"endpoint": f"/v2/{path}", "result": "Live response available", "sample": True}
        query = "&".join(f"{p['name']}={p['defaultValue']}" for p in params if p.get("defaultValue") not in {"", None})
        request_example = f"https://60s.viki.moe/v2/{path}" + (f"?{query}" if query else "")
        stable_ids = {
            "60s": "60s-news",
            "weather/realtime": "60s-weather",
            "weather": "60s-weather-legacy",
            "exchange-rate": "60s-exchange",
        }
        entries.append({
            "id": stable_ids.get(path, f"60s-{slug}"),
            "name": label,
            "provider": "60s API",
            "source": "60s",
            "sourceLabel": "60s open API",
            "category": category,
            "description": f"Live route from the 60s open API collection: /v2/{path}.",
            "method": method,
            "baseUrl": "https://60s.viki.moe",
            "path": f"/v2/{path}",
            "auth": "none",
            "authLabel": "Public endpoint",
            "params": params,
            "tags": ["60s", slugify(category, "collection"), *[part for part in path.split("/") if part]][:8],
            "sourceUrl": "https://github.com/vikiboss/60s",
            "requestExample": request_example,
            "previewMode": "live",
            "https": True,
            "cors": "Yes",
            "sampleResponse": {"code": 200, "message": "success", "data": sample_data},
            "responsePreview": "Live endpoint · click Run live for the current response",
            "livePreview": True,
        })
    return entries


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--public-apis", type=Path, required=True)
    parser.add_argument("--sixty-src", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("lib/catalog-data.generated.ts"))
    args = parser.parse_args()
    entries = public_apis_entries(args.public_apis) + sixty_entries(args.sixty_src)
    payload = json.dumps(entries, ensure_ascii=False, separators=(",", ":"))
    output = "// Generated from public-apis and 60s. Do not hand-edit.\n" + f"export const generatedCatalog = {payload} as const;\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output, encoding="utf-8")
    print(f"generated {len(entries)} entries -> {args.output}")


if __name__ == "__main__":
    main()
