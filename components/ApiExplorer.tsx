"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, ArrowsClockwise, BracketsCurly, Check, Copy, Funnel, MagnifyingGlass, Play, Plus, Sparkle, TerminalWindow, X } from "@phosphor-icons/react";
import { apiCatalog, catalogCategories, catalogSources, getCatalogStats } from "@/lib/api-catalog";
import { localizeApiDefinition, localizeCategory, localizeSampleResponse } from "@/lib/api-localization";
import { withBasePath } from "@/lib/runtime-path";
import type { ApiDefinition } from "@/lib/api-schema";
import { LanguageSwitcher, useLocale } from "./LocaleProvider";

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
  requestUrl?: string;
  requestMethod?: string;
  requestParams?: Record<string, string | number | boolean>;
  responseFields?: string[];
  note?: string;
  data?: unknown;
  error?: string;
};

const stats = getCatalogStats();

function oneLine(value: unknown) {
  const text = JSON.stringify(value);
  return text && text.length > 170 ? `${text.slice(0, 170)}…` : text;
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

function responseFieldPaths(value: unknown, prefix = "", depth = 0): string[] {
  if (depth > 4 || !value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.length > 0 ? responseFieldPaths(value[0], `${prefix}[]`, depth + 1) : [];
  return Object.entries(value).slice(0, 48).flatMap(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [path, ...responseFieldPaths(item, path, depth + 1)];
  });
}

function requestUrlWithParams(api: ApiDefinition, params: Record<string, string | number | boolean>) {
  const url = new URL(api.requestExample);
  for (const [name, value] of Object.entries(params)) {
    if (value === "" || value === undefined || value === null) continue;
    if (url.pathname.includes(`{${name}}`)) {
      url.pathname = url.pathname.replace(`{${name}}`, encodeURIComponent(String(value)));
    } else if (url.pathname.includes(`:${name}`)) {
      url.pathname = url.pathname.replace(`:${name}`, encodeURIComponent(String(value)));
    } else {
      url.searchParams.set(name, String(value));
    }
  }
  return url.toString();
}

export function ApiExplorer({ onCompose }: { onCompose: (api: ApiDefinition) => void }) {
  const { locale, t } = useLocale();
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
  const localizedSelected = selected ? localizeApiDefinition(selected, locale) : undefined;
  const params = selected ? (paramDrafts[selected.id] ?? defaults(selected)) : {};
  const activeResult = result?.apiId === selected?.id ? result : null;
  const responseValue = activeResult ? activeResult.data : localizedSelected?.sampleResponse;
  const displayResponse = activeResult && activeResult.data !== undefined ? localizeSampleResponse(activeResult.data, locale) : responseValue;
  const displayResponseFields = responseFieldPaths(displayResponse);
  const requestUrl = activeResult?.requestUrl ?? activeResult?.url ?? (selected ? requestUrlWithParams(selected, params) : "");
  const requestMethod = activeResult?.requestMethod ?? selected?.method ?? "GET";
  const requestParams = activeResult?.requestParams ?? params;
  const topCategories = useMemo(() => [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7), [categoryCounts]);

  const selectApi = (api: ApiDefinition) => {
    setSelectedId(api.id);
    setResult(null);
  };

  const runPreview = async () => {
    if (!selected) return;
    if (!selected.livePreview) {
      setResult({ apiId: selected.id, source: selected.source, previewMode: "catalog", ok: true, status: "sample", requestMethod: selected.method, requestUrl: selected.requestExample, requestParams: params, responseFields: responseFieldPaths(selected.sampleResponse), note: t("sampleContractNote"), data: selected.sampleResponse });
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
      const payload = await response.json() as Partial<PreviewResult>;
      const requestContext = { apiId: selected.id, source: selected.source, previewMode: "live", requestUrl: payload.url ?? requestUrlWithParams(selected, params), requestParams: params };
      setResult(response.ok ? { ...requestContext, ...payload, ok: payload.ok ?? true } as PreviewResult : { ...requestContext, ...payload, ok: false, status: response.status, error: payload.error ?? t("requestFailed") } as PreviewResult);
    } catch (error) {
      setResult({ apiId: selected.id, source: selected.source, previewMode: "live", ok: false, status: 0, error: error instanceof Error ? error.message : t("requestFailed") });
    } finally {
      setRunning(false);
    }
  };

  const copyRequest = async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(requestUrl);
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
        <div className="explorer-nav-meta"><span><b>{stats.total.toLocaleString()}</b> {t("interfaces")}</span><span><b>{stats.live}</b> {t("liveRoutesLabel")}</span><span><b>{stats.categories}</b> {t("categories")}</span></div>
        <LanguageSwitcher />
        <button type="button" className="explorer-compose-nav" onClick={() => selected && onCompose(selected)}><Sparkle size={14} weight="fill" /> {t("openComposer")}</button>
      </header>

      <section className="explorer-hero">
        <div className="explorer-hero-copy">
          <div className="explorer-kicker"><span className="pulse-dot" /> {t("explorerKicker")}</div>
          <h1>{t("heroTitleBefore")} <em>{t("heroTitleEmphasis")}</em> {t("heroTitleAfter")}</h1>
          <p>{t("heroDescription")}</p>
          <div className="explorer-hero-actions"><label className="hero-search"><MagnifyingGlass size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchCatalog")} aria-label={t("searchCompleteCatalog")} /></label><button type="button" className={`hero-live-toggle ${liveOnly ? "active" : ""}`} onClick={() => setLiveOnly((value) => !value)}><ArrowsClockwise size={14} /> {liveOnly ? t("showingLiveRoutes") : t("showLiveRoutes")}</button></div>
        </div>
        <div className="coverage-card" aria-label="Catalog coverage chart">
          <div className="coverage-header"><span>{t("coverageByCategory")}</span><b>{stats.total.toLocaleString()}</b></div>
          <div className="coverage-bars">{topCategories.map(([name, count]) => <div className="coverage-row" key={name}><span title={name}>{name}</span><div><i style={{ width: `${Math.max(8, (count / topCategories[0][1]) * 100)}%` }} /></div><b>{count}</b></div>)}</div>
          <small>{t("coverageNote")}</small>
        </div>
      </section>

      <section className="explorer-workspace">
        <aside className="explorer-filters" aria-label={t("catalogFilters")}>
          <div className="filter-heading"><div><span>{t("directory")}</span><strong>{t("chooseSourceShort")}</strong></div><Funnel size={15} /></div>
          <div className="source-switcher">{catalogSources.map((item) => <button type="button" key={item.id} className={source === item.id ? "active" : ""} onClick={() => setSource(item.id as SourceFilter)}>{item.id === "all" ? t("allSources") : item.id === "60s" ? t("liveRoutes") : t("publicApis")}<b>{item.id === "all" ? stats.total : item.id === "60s" ? stats.live : stats.directory}</b></button>)}</div>
          <label className="filter-select-label">{t("category")}<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">{t("allCategories", { count: stats.categories })}</option>{catalogCategories.map((item) => <option value={item} key={item}>{localizeCategory(item, locale)} · {categoryCounts.get(item)}</option>)}</select></label>
          <button type="button" className={`live-filter ${liveOnly ? "active" : ""}`} onClick={() => setLiveOnly((value) => !value)}><span className="live-mark" /> {t("onlyLive")} <b>{stats.live}</b></button>
          {(query || source !== "all" || category !== "all" || liveOnly) && <button type="button" className="reset-filters" onClick={resetFilters}><X size={13} /> {t("resetFilters")}</button>}
          <div className="filter-note"><TerminalWindow size={14} /><p><strong>{t("resultFirst")}</strong> {t("resultFirstNote")}</p></div>
          <div className="filter-links"><a href="https://github.com/public-apis/public-apis" target="_blank" rel="noreferrer">public-apis source <ArrowUpRight size={12} /></a><a href="https://github.com/vikiboss/60s" target="_blank" rel="noreferrer">60s source <ArrowUpRight size={12} /></a></div>
        </aside>

        <section className="catalog-results" aria-label={t("apiResults")}>
          <header className="results-header"><div><span>{t("completeInterfaceList")}</span><strong>{filtered.length.toLocaleString()} <small>of {stats.total.toLocaleString()}</small></strong></div><div className="results-hint"><span className="legend live" /> {t("livePreview")} <span className="legend sample" /> {t("catalogSample")}</div></header>
          <div className="api-card-list">{filtered.map((api) => { const localized = localizeApiDefinition(api, locale); return <button type="button" className={`api-card ${selected?.id === api.id ? "selected" : ""}`} key={api.id} onClick={() => selectApi(api)}><span className={`api-card-method ${api.method === "POST" ? "post" : api.method === "ALL" ? "all" : ""}`}>{api.method}</span><span className={`api-card-tone ${categoryTone(api.category)}`} /><span className="api-card-main"><strong>{localized.name}</strong><small>{api.provider} · {localized.category}</small><code>{api.path}</code></span><span className="api-card-response"><small>{api.livePreview ? t("liveResult") : t("catalogResult")}</small><span>{localized.responsePreview}</span><code>{oneLine(localized.sampleResponse) ?? t("noSampleResponse")}</code></span><span className="api-card-arrow">{selected?.id === api.id ? "●" : "↗"}</span></button>; })}</div>
          {!filtered.length && <div className="catalog-empty"><strong>{t("noInterfaces")}</strong><p>{t("tryFilter")}</p><button type="button" onClick={resetFilters}>{t("reset")}</button></div>}
        </section>

        {selected && <aside className="result-inspector" aria-label={t("selectedApiResult")}>
          <header className="result-inspector-header"><div><span className={`inspector-source ${selected.source === "60s" ? "live-source" : "directory-source"}`}>{selected.source === "60s" ? t("liveSource") : t("directorySource")}</span><h2>{localizedSelected?.name}</h2><code>{selected.method} {selected.path}</code></div><button type="button" className="inspector-close" onClick={() => setSelectedId("")} aria-label={t("clearSelection")}><X size={15} /></button></header>

          <section className="inspector-overview">
            <div className="inspector-section-title"><span>{t("interfaceOverview")}</span><small>{localizedSelected?.sourceLabel}</small></div>
            <p className="inspector-description">{localizedSelected?.description}</p>
            <div className="inspector-meta"><span>{localizedSelected?.category}</span><span>{localizedSelected?.authLabel}</span><span>{selected.https === true ? t("https") : selected.https === false ? t("httpOnly") : t("httpsUnknown")}</span></div>
          </section>

          <section className="contract-section request-contract">
            <div className="inspector-section-title"><span>{t("requestContract")}</span><small>{requestMethod}</small></div>
            <div className="request-url"><small>{t("requestUrl")}</small><code>{requestUrl}</code></div>
            <div className="request-params-header"><span>{t("requestParams")}</span><small>{t("parameters", { count: selected.params.length })}</small></div>
            {selected.params.length > 0 ? <div className="request-fields">{localizedSelected?.params.map((param) => <label key={param.name}>{param.label}<input value={String(params[param.name] ?? "")} onChange={(event) => { setResult(null); setParamDrafts((current) => ({ ...current, [selected.id]: { ...params, [param.name]: param.type === "number" ? Number(event.target.value) : event.target.value } })); }} placeholder={param.defaultValue === undefined ? t("optional") : String(param.defaultValue)} /><small><code>{param.name}</code> · {param.description || param.label} · {param.required ? t("required") : t("optional")}</small></label>)}</div> : <p className="contract-empty">{t("noDeclaredInputs")}</p>}
            <details className="request-payload"><summary>{t("requestPayload")}</summary><pre>{pretty(requestParams)}</pre></details>
          </section>

          <div className="inspector-actions"><button type="button" className="run-preview" onClick={runPreview} disabled={running}>{running ? <ArrowsClockwise className="spin" size={14} /> : <Play size={14} weight="fill" />}{selected.livePreview ? t("runLive") : t("showContract")}</button><button type="button" className="copy-request" onClick={copyRequest}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? t("copied") : t("copyRequest")}</button></div>

          <section className="contract-section response-contract">
            <div className="inspector-section-title"><span>{t("responseContract")}</span><small>{activeResult ? activeResult.status === "sample" ? t("catalogSample") : `${activeResult.status} · ${activeResult.elapsedMs ?? 0}ms` : selected.livePreview ? t("sampleShapeNotFetched") : t("directoryMetadata")}</small></div>
            <p className={`response-callout ${activeResult?.ok === false ? "error" : ""}`}>{activeResult?.error ?? activeResult?.note ?? (selected.livePreview ? t("liveCallNote") : t("sampleContractNote"))}</p>
            <div className="response-meta"><span><b>{t("status")}</b>{activeResult ? activeResult.status : "sample"}</span><span><b>{t("elapsed")}</b>{activeResult?.elapsedMs ? `${activeResult.elapsedMs}ms` : "—"}</span><span><b>{t("contentType")}</b>{activeResult?.contentType ?? "catalog/json"}</span></div>
            <div className="response-fields"><div className="inspector-section-title"><span>{t("responseFields")}</span><small>{displayResponseFields.length}</small></div>{displayResponseFields.length > 0 ? <div className="response-field-list">{displayResponseFields.map((field) => <code key={field}>{field}</code>)}</div> : <p className="contract-empty">{t("noResponseFields")}</p>}</div>
            <div className="result-json"><div className="raw-response-label">{t("rawResponse")}</div><pre>{pretty(activeResult?.error ? { error: activeResult.error } : displayResponse)}</pre></div>
          </section>

          <div className="result-footer"><a href={selected.sourceUrl} target="_blank" rel="noreferrer">{t("openSourceDocs")} <ArrowUpRight size={12} /></a><button type="button" onClick={() => onCompose(selected)}><Plus size={13} /> {t("composeThisApi")}</button></div>
        </aside>}
      </section>
    </main>
  );
}
