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

function buildGreeting(firstName: string): string {
  return (
    `Hello ${firstName}! This is where we create opportunities — reach out to companies that ` +
    `don't have a job opening yet, because you're going to create that opening. Go ahead and ` +
    `drop the list of companies you want to reach out to!`
  );
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
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: buildGreeting("there") },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const boot = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "there";
        setMessages((prev) => {
          if (prev.length === 0) {
            return [{ role: "assistant", content: buildGreeting(firstName) }];
          }
          const [first, ...rest] = prev;
          if (first.role === "assistant" && typeof first.content === "string") {
            return [{ ...first, content: buildGreeting(firstName) }, ...rest];
          }
          return prev;
        });
      } catch {
        // Keep default greeting with "there".
      }
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
      if (parsedCompanies && parsedCompanies.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: <CompanyTable companies={parsedCompanies} />,
          },
        ]);
      } else if (parsedCompanies && parsedCompanies.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I could not detect company names in that message. Please share a list like: Bain, Temasek, Warburg Pincus.",
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

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submitMessage();
    }
  };

  return (
    <main className="flex min-h-[100vh] flex-col bg-[#fdfbf1] overflow-hidden">
      <header className="flex shrink-0 flex-col border-b border-[rgba(60,42,106,0.08)] bg-[#fdfbf1]">
        <div className="px-6 py-5">
          <div className="mx-auto w-full max-w-[760px]">
            <p
              className="font-medium uppercase text-[0.75rem]"
              style={{ letterSpacing: "0.12em", color: "rgba(30,27,75,0.5)" }}
            >
              Outreach Copilot
            </p>
            <h1 className="mt-1 font-serif text-[2rem] font-semibold leading-tight text-[#6B5FE4]">
              Create hidden opportunities
            </h1>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        <div className="mx-auto w-full max-w-[760px] space-y-4">
          {messages.map((message, idx) => {
            const isUser = message.role === "user";
            return (
              <div
                key={idx}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    isUser
                      ? "bg-[#1E1B4B] text-white"
                      : "border border-[rgba(30,27,75,0.1)] bg-white text-[#1E1B4B]"
                  }`}
                  style={{
                    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    lineHeight: 1.55,
                  }}
                >
                  {message.content}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div
                className="max-w-[85%] rounded-2xl border border-[rgba(30,27,75,0.1)] bg-white px-4 py-3 text-[#1E1B4B]"
                style={{ borderRadius: "16px 16px 16px 4px" }}
              >
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-[rgba(60,42,106,0.08)] bg-[#fdfbf1] px-6 py-4">
        <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-2xl items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Type company names, one per line or comma-separated..."
            className="flex-1 rounded-full border border-[rgba(60,42,106,0.15)] bg-white px-4 py-2.5 text-sm text-[#3c2a6a] placeholder:text-[rgba(60,42,106,0.4)] focus:outline-none focus:ring-2 focus:ring-[#3c2a6a]/20"
          />
          <button
            type="submit"
            disabled={!canSend}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3c2a6a] text-sm font-medium text-[#fdfbf1] disabled:opacity-50 hover:enabled:bg-[#4a347f]"
            aria-label="Send"
          >
            →
          </button>
        </form>
      </div>
    </main>
  );
}

