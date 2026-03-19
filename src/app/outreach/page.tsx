"use client";

import { FormEvent, KeyboardEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import CompanyTable, { CompanyRow } from "@/components/outreach/CompanyTable";
import { createClient } from "@/lib/supabase/client";

interface Message {
  role: "assistant" | "user";
  content: string | ReactNode;
}

interface ApiResponse {
  content?: string;
  error?: string;
}

function parseCompanies(raw: string): CompanyRow[] | null {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return null;

    const validRows: CompanyRow[] = parsed
      .map((item) => {
        if (typeof item !== "object" || item === null) return null;
        const record = item as Record<string, unknown>;
        const name = typeof record.name === "string" ? record.name : "";
        const industry = typeof record.industry === "string" ? record.industry : "";
        const hq = typeof record.hq === "string" ? record.hq : "";
        return { name, industry, hq };
      })
      .filter((row): row is CompanyRow => row !== null);

    return validRows.length > 0 ? validRows : null;
  } catch {
    return null;
  }
}

function TypingIndicator() {
  const dotBase: React.CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "rgba(30,27,75,0.75)",
    animationName: "pulseDot",
    animationDuration: "1s",
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in-out",
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={{ ...dotBase, animationDelay: "0s" }} />
      <span style={{ ...dotBase, animationDelay: "0.2s" }} />
      <span style={{ ...dotBase, animationDelay: "0.4s" }} />
      <style jsx>{`
        @keyframes pulseDot {
          0%,
          100% {
            opacity: 0.25;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default function OutreachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const boot = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "there";
      const greeting =
        `Hello ${firstName}! This is where we create opportunities — reach out to companies that ` +
        `don't have a job opening yet, because you're going to create that opening. Go ahead and ` +
        `drop the list of companies you want to reach out to!`;
      setMessages([{ role: "assistant", content: greeting }]);
    };
    void boot();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const submitMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/outreach-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: trimmed, step: "enrich_companies" }),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      const content = data.content ?? "";
      const parsedCompanies = parseCompanies(content);
      if (parsedCompanies) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: <CompanyTable companies={parsedCompanies} />,
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content }]);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submitMessage();
  };

  const onTextAreaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitMessage();
    }
  };

  return (
    <main style={{ background: "#F5F3EA", minHeight: "100vh", padding: "24px" }}>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          background: "transparent",
          borderRadius: 16,
          border: "none",
          boxShadow: "none",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "20px 20px 12px" }}>
          <p
            className="font-medium"
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              fontSize: "0.75rem",
              color: "rgba(30,27,75,0.5)",
            }}
          >
            Outreach Copilot
          </p>
          <h1
            className="font-serif"
            style={{
              color: "#6B5FE4",
              fontSize: "1.9rem",
              lineHeight: 1.2,
              marginTop: 6,
              fontWeight: 600,
            }}
          >
            Create hidden opportunities
          </h1>
        </div>

        <div style={{ padding: "8px 20px 16px", display: "grid", gap: 12 }}>
          {messages.map((message, idx) => {
            const isUser = message.role === "user";
            return (
              <div key={idx} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "90%",
                    padding: "12px 14px",
                    color: isUser ? "#FFFFFF" : "#1E1B4B",
                    background: isUser ? "#1E1B4B" : "#FFFFFF",
                    border: isUser ? "none" : "1px solid rgba(30,27,75,0.1)",
                    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    fontSize: "0.95rem",
                    lineHeight: 1.55,
                  }}
                >
                  {message.content}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div
                style={{
                  maxWidth: "90%",
                  padding: "12px 14px",
                  color: "#1E1B4B",
                  background: "#FFFFFF",
                  border: "1px solid rgba(30,27,75,0.1)",
                  borderRadius: "16px 16px 16px 4px",
                }}
              >
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={onSubmit}
          style={{
            borderTop: "1px solid rgba(30,27,75,0.08)",
            padding: "14px 16px",
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
            background: "#FFFFFF",
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onTextAreaKeyDown}
            rows={3}
            placeholder="Type company names, one per line or comma-separated…"
            style={{
              flex: 1,
              resize: "vertical",
              background: "#FFFFFF",
              border: "1px solid rgba(30,27,75,0.15)",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: "0.95rem",
              color: "#1E1B4B",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!canSend}
            style={{
              background: canSend ? "#1E1B4B" : "rgba(30,27,75,0.45)",
              color: "#FFFFFF",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: "0.9rem",
              border: "none",
              cursor: canSend ? "pointer" : "not-allowed",
            }}
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}

