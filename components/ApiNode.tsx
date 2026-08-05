"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BracketsCurly, Key, LinkSimple } from "@phosphor-icons/react";
import type { ApiNode as ApiNodeModel } from "@/lib/api-schema";
import { getApiDefinition } from "@/lib/api-catalog";

export function ApiNode({ data, selected }: NodeProps) {
  const typedData = data as ApiNodeModel["data"];
  const definition = getApiDefinition(typedData.apiId);
  return (
    <div className={`api-node ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div className="api-node-header">
        <div><BracketsCurly size={13} weight="duotone" /><span className="api-node-method">{typedData.method}</span><small>{definition?.provider ?? typedData.apiId}</small></div>
        {definition?.auth !== "none" ? <Key size={12} color="var(--amber)" aria-label="Requires credentials" /> : null}
      </div>
      <div className="api-node-body">
        <strong>{typedData.label}</strong>
        <p>{typedData.subtitle}</p>
        <span className="api-node-path">{typedData.path}</span>
        <div className="api-node-footer"><span>{definition?.category ?? "API source"}</span><span><LinkSimple size={10} /> {Object.keys(typedData.params).length} inputs</span></div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
