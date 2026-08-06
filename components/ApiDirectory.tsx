"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, BracketsCurly, FolderSimple, MagnifyingGlass, Plus, Sparkle } from "@phosphor-icons/react";
import { apiCatalog, catalogCategories } from "@/lib/api-catalog";
import { type ApiCategory } from "@/lib/api-schema";
import { useVibeApiStore } from "@/lib/store";

export function ApiDirectory() {
  const addApiNode = useVibeApiStore((state) => state.addApiNode);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ApiCategory | "all">("all");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return apiCatalog.filter((api) => {
      const matchesCategory = category === "all" || api.category === category;
      const matchesQuery = !normalized || [api.name, api.provider, api.description, api.path, ...api.tags].join(" ").toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <aside className="api-directory" aria-label="API directory">
      <div className="directory-brand">
        <div className="brand-mark" aria-hidden="true"><BracketsCurly size={19} weight="bold" /></div>
        <div><strong>Vibe API</strong><span>COMPOSE / PREVIEW / SHIP</span></div>
      </div>
      <div className="directory-intro">
        <h2>API directory</h2>
        <p>Choose a source, configure its inputs, then connect it to a reusable output.</p>
      </div>
      <label className="catalog-search">
        <MagnifyingGlass size={15} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search APIs, providers, tags" aria-label="Search APIs" />
      </label>
      <div className="category-filter" aria-label="API categories">
        <button type="button" className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>All</button>
        {catalogCategories.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <div className="directory-count"><span>Sources</span><span>{filtered.length} / {apiCatalog.length}</span></div>
      <nav className="api-list">
        {filtered.map((api) => (
          <button type="button" key={api.id} onClick={() => addApiNode(api)} title={`Add ${api.name} to canvas`}>
            <span className={`api-type ${api.method === "POST" ? "post" : ""}`}>{api.method}</span>
            <span><strong>{api.name}</strong><small>{api.provider} · {api.path}</small></span>
            <Plus className="api-add" size={16} weight="bold" aria-hidden="true" />
          </button>
        ))}
      </nav>
      <div className="directory-footer">
        <small><Sparkle size={12} weight="fill" /> AI can add and configure these same catalog sources.</small>
        <a href="https://github.com/public-apis/public-apis" target="_blank" rel="noreferrer">Browse public-apis research <ArrowUpRight size={11} /></a>
        <a href="https://github.com/vikiboss/60s" target="_blank" rel="noreferrer">Open 60s source collection <ArrowUpRight size={11} /></a>
        <span><FolderSimple size={12} /> Local-first draft. Export when ready.</span>
      </div>
    </aside>
  );
}
