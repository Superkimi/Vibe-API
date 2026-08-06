"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, ArrowsClockwise, BracketsCurly, Check, Copy, Funnel, MagnifyingGlass, Play, Plus, Sparkle, TerminalWindow, X } from "@phosphor-icons/react";
import { apiCatalog, catalogCategories, catalogSources, getCatalogStats } from "@/lib/api-catalog";
import { withBasePath } from "@/lib/runtime-path";
import type { ApiDefinition } from "@/lib/api-schema";

type SourceFilter = "all" | "60s" | "public-apis";
type PreviewResult = {
  apiId: string;
  source: string;
  previewMode: string;
  ok: boolean;
  status: number | "sample";
  contentType?: string;
  elapsedMs?: number;
  url?: string;
  data?: unknown;
  error?: string;
};

const stats = getCatalogStats();

function oneLine(value: unknown) {
  const text = JSON.stringify(value);
  return text && text.length > 170 ? `${text.slice(0, 170)}…` : text || "No sample response";
}

function pretty(value: unknown) {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function defaults(api: ApiDefinition) {
  return Object.fromEntries(api.params.map((param) => [param.name, param.defaultValue ?? ""]));
}

function categoryTone(category: string) {
  if (/weather/i.test(category)) return "cyan";
  if (/finance|currency|cryptocurrency/i.test(category)) return "amber";
  if (/news|social|video/i.test(category)) return "rose";
  if (/developer|development|security/i.test(category)) return "slate";
  return "lilac";
}

export function ApiExplorer({ onCompose }: { onCompose: (api: ApiDefinition) => void }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [category, setCategory] = useState("all");
  const [liveOnly, setLiveOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(apiCatalog[0]?.id ?? "");
  const [paramDrafts, setParamDrafts] = useState<Record<string, Record<string, string | number | boolean>>>({});
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const api of apiCatalog) counts.set(api.category, (counts.get(api.category) ?? 0) + 1);
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return apiCatalog.filter((api) => {
      const matchesSource = source === "all" || api.source === source;
      const matchesCategory = category === "all" || api.category === category;
      const matchesLive = !liveOnly || api.livePreview;
      const searchable = [api.name, api.provider, api.description, api.path, api.source, api.category, ...api.tags].join(" ").toLowerCase();
      return matchesSource && matchesCategory && matchesLive && (!normalized || searchable.includes(normalized));
    });
  }, [category, liveOnly, query, source]);

  const selected = selectedId ? (filtered.find((api) => api.id === selectedId) ?? apiCatalog.find((api) => api.id === selectedId) ?? filtered[0]) : undefined;
  const params = selected ? (paramDrafts[selected.id] ?? defaults(selected)) : {};
  const activeResult = result?.apiId === selected?.id ? result : null;
  const topCategories = useMemo(() => [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7), [categoryCounts]);

  const selectApi = (api: ApiDefinition) => {
    setSelectedId(api.id);
    setResult(null);
  };

  const runPreview = async () => {
    if (!selected) return;
    if (!selected.livePreview) {
      setResult({ apiId: selected.id, source: selected.source, previewMode: "catalog", ok: true, status: "sample", data: selected.sampleResponse });
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch(withBasePath("/api/catalog/preview"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiId: selected.id, params }),
      });
      const payload = await response.json() as PreviewResult;
      setResult(response.ok ? payload : { ...payload, ok: false, status: response.status });
    } catch (error) {
      setResult({ apiId: selected.id, source: selected.source, previewMode: "live", ok: false, status: 0, error: error instanceof Error ? error.message : "Request failed" });
    } finally {
      setRunning(false);
    }
  };

  const copyRequest = async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.requestExample);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const resetFilters = () => {
    setQuery("");
    setSource("all");
    setCategory("all");
    setLiveOnly(false);
  };

  return (
    <main className="explorer-page">
      <header className="explorer-nav">
        <div className="directory-brand explorer-brand">
          <div className="brand-mark" aria-hidden="true"><BracketsCurly size={19} weight="bold" /></div>
          <div><strong>Vibe API</strong><span>EXPLORE / INSPECT / COMPOSE</span></div>
        </div>
        <div className="explorer-nav-meta"><span><b>{stats.total.toLocaleString()}</b> interfaces</span><span><b>{stats.live}</b> live routes</span><span><b>{stats.categories}</b> categories</span></div>
        <button type="button" className="explorer-compose-nav" onClick={() => selected && onCompose(selected)}><Sparkle size={14} weight="fill" /> Open composer</button>
      </header>

      <section className="explorer-hero">
        <div className="explorer-hero-copy">
          <div className="explorer-kicker"><span className="pulse-dot" /> API CATALOG / TWO OPEN SOURCES</div>
          <h1>See the response <em>before</em> you assemble it.</h1>
          <p>Browse every entry from public-apis and every published 60s route in one searchable surface. Pick a result, inspect its contract, then compose only when it earns a place.</p>
          <div className="explorer-hero-actions"><label className="hero-search"><MagnifyingGlass size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search 1,716 interfaces, providers, paths…" aria-label="Search the complete API catalog" /></label><button type="button" className={`hero-live-toggle ${liveOnly ? "active" : ""}`} onClick={() => setLiveOnly((value) => !value)}><ArrowsClockwise size={14} /> {liveOnly ? "Showing live routes" : "Show live routes"}</button></div>
        </div>
        <div className="coverage-card" aria-label="Catalog coverage chart">
          <div className="coverage-header"><span>Coverage by category</span><b>{stats.total.toLocaleString()}</b></div>
          <div className="coverage-bars">{topCategories.map(([name, count]) => <div className="coverage-row" key={name}><span title={name}>{name}</span><div><i style={{ width: `${Math.max(8, (count / topCategories[0][1]) * 100)}%` }} /></div><b>{count}</b></div>)}</div>
          <small>All categories remain available in the filter. Bars show the largest groups at a glance.</small>
        </div>
      </section>

      <section className="explorer-workspace">
        <aside className="explorer-filters" aria-label="Catalog filters">
          <div className="filter-heading"><div><span>Directory</span><strong>Choose a source</strong></div><Funnel size={15} /></div>
          <div className="source-switcher">{catalogSources.map((item) => <button type="button" key={item.id} className={source === item.id ? "active" : ""} onClick={() => setSource(item.id as SourceFilter)}>{item.id === "all" ? "All sources" : item.id === "60s" ? "60s routes" : "public-apis"}<b>{item.id === "all" ? stats.total : item.id === "60s" ? stats.live : stats.directory}</b></button>)}</div>
          <label className="filter-select-label">Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All {stats.categories} categories</option>{catalogCategories.map((item) => <option value={item} key={item}>{item} · {categoryCounts.get(item)}</option>)}</select></label>
          <button type="button" className={`live-filter ${liveOnly ? "active" : ""}`} onClick={() => setLiveOnly((value) => !value)}><span className="live-mark" /> Only routes with live preview <b>{stats.live}</b></button>
          {(query || source !== "all" || category !== "all" || liveOnly) && <button type="button" className="reset-filters" onClick={resetFilters}><X size={13} /> Reset filters</button>}
          <div className="filter-note"><TerminalWindow size={14} /><p><strong>Result first.</strong> Every row carries a response preview. 60s routes can be fetched live; public-apis entries stay honest about being a directory of provider contracts.</p></div>
          <div className="filter-links"><a href="https://github.com/public-apis/public-apis" target="_blank" rel="noreferrer">public-apis source <ArrowUpRight size={12} /></a><a href="https://github.com/vikiboss/60s" target="_blank" rel="noreferrer">60s source <ArrowUpRight size={12} /></a></div>
        </aside>

        <section className="catalog-results" aria-label="API results">
          <header className="results-header"><div><span>Complete interface list</span><strong>{filtered.length.toLocaleString()} <small>of {stats.total.toLocaleString()}</small></strong></div><div className="results-hint"><span className="legend live" /> Live preview <span className="legend sample" /> Catalog sample</div></header>
          <div className="api-card-list">{filtered.map((api) => <button type="button" className={`api-card ${selected?.id === api.id ? "selected" : ""}`} key={api.id} onClick={() => selectApi(api)}><span className={`api-card-method ${api.method === "POST" ? "post" : api.method === "ALL" ? "all" : ""}`}>{api.method}</span><span className={`api-card-tone ${categoryTone(api.category)}`} /><span className="api-card-main"><strong>{api.name}</strong><small>{api.provider} · {api.category}</small><code>{api.path}</code></span><span className="api-card-response"><small>{api.livePreview ? "LIVE RESULT" : "CATALOG RESULT"}</small><span>{api.responsePreview}</span><code>{oneLine(api.sampleResponse)}</code></span><span className="api-card-arrow">{selected?.id === api.id ? "●" : "↗"}</span></button>)}</div>
          {!filtered.length && <div className="catalog-empty"><strong>No interfaces match this view.</strong><p>Try a provider, path, category, or source name.</p><button type="button" onClick={resetFilters}>Reset filters</button></div>}
        </section>

        {selected && <aside className="result-inspector" aria-label="Selected API result">
          <header className="result-inspector-header"><div><span className={`inspector-source ${selected.source === "60s" ? "live-source" : "directory-source"}`}>{selected.source === "60s" ? "60s LIVE ROUTE" : "PUBLIC-APIS DIRECTORY"}</span><h2>{selected.name}</h2><code>{selected.method} {selected.path}</code></div><button type="button" className="inspector-close" onClick={() => setSelectedId("")} aria-label="Clear selection"><X size={15} /></button></header>
          <p className="inspector-description">{selected.description}</p>
          <div className="inspector-meta"><span>{selected.category}</span><span>{selected.authLabel}</span><span>{selected.https === true ? "HTTPS" : selected.https === false ? "HTTP only" : "HTTPS unknown"}</span></div>
          {selected.params.length > 0 && <section className="request-fields"><div className="inspector-section-title"><span>Request inputs</span><small>{selected.params.length} parameters</small></div>{selected.params.map((param) => <label key={param.name}>{param.label}<input value={String(params[param.name] ?? "")} onChange={(event) => setParamDrafts((current) => ({ ...current, [selected.id]: { ...params, [param.name]: param.type === "number" ? Number(event.target.value) : event.target.value } }))} placeholder={param.defaultValue === undefined ? "optional" : String(param.defaultValue)} /><small>{param.name}{param.required ? " · required" : " · optional"}</small></label>)}</section>}
          <div className="inspector-actions"><button type="button" className="run-preview" onClick={runPreview} disabled={running}>{running ? <ArrowsClockwise className="spin" size={14} /> : <Play size={14} weight="fill" />}{selected.livePreview ? "Run live" : "Show sample"}</button><button type="button" className="copy-request" onClick={copyRequest}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy request"}</button></div>
          <section className="result-section"><div className="inspector-section-title"><span>Response</span><small>{activeResult ? activeResult.status === "sample" ? "catalog sample" : `${activeResult.status} · ${activeResult.elapsedMs ?? 0}ms` : selected.livePreview ? "sample shape · not fetched" : "directory metadata"}</small></div><div className={`result-json ${activeResult && !activeResult.ok ? "error" : ""}`}><pre>{pretty(activeResult?.error ? { error: activeResult.error } : activeResult?.data ?? selected.sampleResponse)}</pre></div></section>
          <div className="result-footer"><a href={selected.sourceUrl} target="_blank" rel="noreferrer">Open source / docs <ArrowUpRight size={12} /></a><button type="button" onClick={() => onCompose(selected)}><Plus size={13} /> Compose this API</button></div>
        </aside>}
      </section>
    </main>
  );
}
