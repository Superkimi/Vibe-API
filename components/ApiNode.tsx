"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BracketsCurly, Key, LinkSimple } from "@phosphor-icons/react";
import type { ApiNode as ApiNodeModel } from "@/lib/api-schema";
import { getApiDefinition } from "@/lib/api-catalog";
import { localizeApiDefinition } from "@/lib/api-localization";
import { useLocale } from "./LocaleProvider";

export function ApiNode({ data, selected }: NodeProps) {
  const { locale, t } = useLocale();
  const typedData = data as ApiNodeModel["data"];
  const rawDefinition = getApiDefinition(typedData.apiId);
  const definition = rawDefinition ? localizeApiDefinition(rawDefinition, locale) : undefined;
  return (
    <div className={`api-node ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div className="api-node-header">
        <div><BracketsCurly size={13} weight="duotone" /><span className="api-node-method">{typedData.method}</span><small>{definition?.provider ?? typedData.apiId}</small></div>
        {definition?.auth !== "none" ? <Key size={12} color="var(--amber)" aria-label="Requires credentials" /> : null}
      </div>
      <div className="api-node-body">
        <strong>{rawDefinition?.name === typedData.label ? definition?.name : typedData.label}</strong>
        <p>{rawDefinition?.description === typedData.subtitle ? definition?.description : typedData.subtitle}</p>
        <span className="api-node-path">{typedData.path}</span>
        <div className="api-node-footer"><span>{definition?.category ?? t("apiSource")}</span><span><LinkSimple size={10} /> {t("inputsCount", { count: Object.keys(typedData.params).length })}</span></div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
