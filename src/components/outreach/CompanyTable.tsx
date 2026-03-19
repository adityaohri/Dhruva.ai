"use client";

import { useMemo, useState } from "react";

export interface CompanyRow {
  name: string;
  industry: string;
  hq: string;
}

type EditableField = "industry" | "hq";

type EditingCell = {
  rowIndex: number;
  field: EditableField;
} | null;

interface CompanyTableProps {
  companies: CompanyRow[];
}

function emptyCompany(): CompanyRow {
  return {
    name: "",
    industry: "",
    hq: "",
  };
}

export default function CompanyTable({ companies }: CompanyTableProps) {
  const [rows, setRows] = useState<CompanyRow[]>(companies);
  const [editing, setEditing] = useState<EditingCell>(null);
  const [continueMessage, setContinueMessage] = useState("");

  const count = useMemo(() => rows.length, [rows.length]);

  const onCellClick = (rowIndex: number, field: EditableField) => {
    setEditing({ rowIndex, field });
  };

  const onFieldChange = (rowIndex: number, field: EditableField, value: string) => {
    setRows((prev) =>
      prev.map((row, idx) => (idx === rowIndex ? { ...row, [field]: value } : row))
    );
  };

  const removeRow = (rowIndex: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
    setEditing(null);
  };

  const addRow = () => {
    setRows((prev) => [...prev, emptyCompany()]);
  };

  const onContinue = () => {
    // TODO: Phase 2 hook — pass final rows to contact-hunting step.
    console.log("[OutreachCopilot] Final companies:", rows);
    setContinueMessage(
      "Great — we'll find the right people to contact at each of these companies next."
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#1E1B4B]">
        Got it — here are the {count} companies I found. You can edit any details before we move
        to the next step.
      </p>

      <div
        className="overflow-hidden rounded-xl border"
        style={{
          background: "#FFFFFF",
          borderColor: "rgba(30,27,75,0.08)",
        }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr
              style={{
                background: "#F5F3EA",
              }}
            >
              {["Company", "Industry", "HQ", ""].map((h) => (
                <th
                  key={h || "actions"}
                  className="px-4 py-2 text-left text-[0.75rem] font-semibold uppercase"
                  style={{
                    color: "rgba(30,27,75,0.6)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={`${row.name}-${rowIndex}`}
                style={{
                  borderBottom: "1px solid rgba(30,27,75,0.06)",
                }}
              >
                <td className="px-4 py-3 text-[0.95rem] text-[#1E1B4B]">
                  {row.name || "New Company"}
                </td>

                {(["industry", "hq"] as EditableField[]).map((field) => (
                  <td
                    key={field}
                    className="cursor-text px-4 py-3 text-[0.95rem] text-[#1E1B4B]"
                    onClick={() => onCellClick(rowIndex, field)}
                  >
                    {editing?.rowIndex === rowIndex && editing.field === field ? (
                      <input
                        autoFocus
                        value={row[field]}
                        onChange={(e) => onFieldChange(rowIndex, field, e.target.value)}
                        onBlur={() => setEditing(null)}
                        className="w-full border-0 border-b bg-transparent p-0 text-[0.95rem] text-[#1E1B4B] outline-none"
                        style={{
                          borderBottomColor: "#6B5FE4",
                        }}
                      />
                    ) : (
                      <span>{row[field] || "Click to edit"}</span>
                    )}
                  </td>
                ))}

                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => removeRow(rowIndex)}
                    className="text-base transition-colors"
                    style={{ color: "rgba(30,27,75,0.3)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#E54B4B")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(30,27,75,0.3)")}
                    aria-label="Remove row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="button"
          onClick={addRow}
          className="px-4 py-2 text-[0.875rem]"
          style={{
            color: "#6B5FE4",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          + Add company
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg px-5 py-2 text-[0.9rem] text-white transition-colors"
          style={{
            background: "#1E1B4B",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#2D2A6E")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1E1B4B")}
        >
          Continue →
        </button>
      </div>

      {continueMessage && (
        <p className="text-sm text-[#1E1B4B]" style={{ opacity: 0.8 }}>
          {continueMessage}
        </p>
      )}
    </div>
  );
}

