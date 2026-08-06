"use client";

import { useMemo, useState } from "react";
import { ArrowClockwise, Check, Copy, FileCode, WarningCircle } from "@phosphor-icons/react";
import { fromWorkflowCode, toOpenApi, toWorkflowCode } from "@/lib/codegen";
import { selectActiveWorkflow, useVibeApiStore } from "@/lib/store";
import { useLocale } from "./LocaleProvider";

export function SchemaPanel() {
  const { t } = useLocale();
  const workflow = useVibeApiStore(selectActiveWorkflow);
  const replaceActive = useVibeApiStore((state) => state.replaceActive);
  const generated = useMemo(() => toWorkflowCode(workflow), [workflow]);
  const [draftState, setDraftState] = useState<{ id: string; source: string } | null>(null);
  const [errorState, setErrorState] = useState<{ id: string; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const draft = draftState?.id === workflow.id ? draftState.source : null;
  const error = errorState?.id === workflow.id ? errorState.message : "";
  const source = draft ?? generated;
  const apply = () => {
    try { replaceActive(fromWorkflowCode(source, workflow)); setDraftState(null); setErrorState(null); }
    catch (reason) { setErrorState({ id: workflow.id, message: reason instanceof Error ? reason.message : (t("schemaApplyError")) }); }
  };
  const copy = async () => { await navigator.clipboard.writeText(source); setCopied(true); window.setTimeout(() => setCopied(false), 1200); };
  return (
    <section className="schema-workbench">
      <div className="schema-editor">
        <header className="schema-header"><div><strong>{t("workflowSchema")}</strong><span>{t("sourceOfTruth")}</span></div><div><button type="button" onClick={() => { setDraftState(null); setErrorState(null); }}><ArrowClockwise size={13} /> {t("reset")}</button><button type="button" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? t("copied") : t("copy")}</button></div></header>
        <textarea value={source} onChange={(event) => setDraftState({ id: workflow.id, source: event.target.value })} spellCheck={false} aria-label={t("workflowSchema")} />
        <footer className="schema-footer"><small className={error ? "error" : ""}>{error || t("schemaReady")}</small><button type="button" className="primary-action" onClick={apply}><FileCode size={13} /> {t("applyCanvas")}</button></footer>
      </div>
      <div className="schema-summary"><header className="schema-summary-header"><div><strong>{t("generatedContract")}</strong><span>{t("openapiShape")}</span></div><WarningCircle size={15} color="var(--accent)" /></header><div className="schema-summary-content"><pre>{JSON.stringify(toOpenApi(workflow), null, 2)}</pre></div></div>
    </section>
  );
}
