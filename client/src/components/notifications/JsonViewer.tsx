"use client";

import React from "react";

type Primitive = string | number | boolean | null | undefined;

const isPrimitive = (v: unknown): v is Primitive => v === null || (typeof v !== "object");

const JsonValue: React.FC<{ value: unknown }> = ({ value }) => {
    if (isPrimitive(value)) {
        if (value === null) return <span className="text-muted-foreground">null</span>;
        if (typeof value === "boolean") return <span className="text-amber-600">{String(value)}</span>;
        if (typeof value === "number") return <span className="text-sky-600">{String(value)}</span>;
        return <span className="text-green-700">{String(value)}</span>;
    }

    if (Array.isArray(value)) {
        return (
            <div className="ml-3">
                {value.length === 0 ? <em className="text-muted-foreground">[]</em> : (
                    value.map((v, i) => (
                        <div key={i} className="flex gap-2">
                            <span className="text-muted-foreground">[{i}]</span>
                            <JsonValue value={v} />
                        </div>
                    ))
                )}
            </div>
        );
    }

    // object
    return (
        <div className="ml-3">
            {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <div key={k} className="flex gap-2 items-start">
                    <span className="font-medium text-sm text-muted-foreground">{k}:</span>
                    <div className="flex-1"><JsonValue value={v} /></div>
                </div>
            ))}
        </div>
    );
};

const JsonViewer: React.FC<{ data: unknown }> = ({ data }) => {
    // si es string que contiene JSON, parsearlo
    let parsed: unknown = data;
    if (typeof data === "string") {
        try {
            parsed = JSON.parse(data);
        } catch {
            parsed = data;
        }
    }

    return (
        <div className="rounded border bg-card p-3 text-sm">
            <JsonValue value={parsed} />
        </div>
    );
};

export default JsonViewer;
