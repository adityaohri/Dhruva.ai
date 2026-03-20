"use client";

import Link from "next/link";
import { type DragEvent, useEffect, useMemo, useState } from "react";

type PublicProfile = {
  full_name: string;
  current_title: string | null;
  current_company: string | null;
  linkedin_url: string | null;
};

type StrategyTask = {
  id: string;
  title: string;
  description: string;
  gapArea: "Work-Ex" | "Acads" | "Leadership" | "Other";
  stageLabel: string;
  difficulty: "Easy" | "Hard";
  impact: "High" | "Low";
  estimatedHours: number;
  toolCta?: "opportunity-discovery" | "outreach-copilot";
};

type ScheduledBlock = {
  id: string;
  taskId: string;
  date: string;
  hours: number;
};

type StoredAudit = {
  targetRole: string;
  targetCompany: string;
  targetIndustry: string;
  targetProfiles: PublicProfile[];
  similarProfiles: PublicProfile[];
  companiesSearched: string[];
  similarCompanies: string[];
  gapAnalysis: any;
  auditedAt: string;
};

type ChatMessage = { role: "assistant" | "user"; content: string };

type StrategyAnswers = {
  timeline: string;
  bandwidth: string;
  priority: string;
  preferences: string;
  budget: string;
  network: string;
};

function gapColor(area: StrategyTask["gapArea"]) {
  if (area === "Work-Ex") return "#430D4B";
  if (area === "Acads") return "#7B357E";
  if (area === "Leadership") return "#C674B2";
  return "#3C2A6A";
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtDayLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

const DISCOVERY_QUESTIONS: { key: keyof StrategyAnswers; text: string }[] = [
  {
    key: "timeline",
    text: "What timeline are we planning for right now (for this one-week sprint)?",
  },
  {
    key: "bandwidth",
    text: "How many hours can you realistically invest this week?",
  },
  {
    key: "priority",
    text: "Which gap should we prioritize first: Work-Ex, Acads, Leadership, or a mix?",
  },
  {
    key: "preferences",
    text: "Any preferences for how you like to work (solo/group, deep-work slots, weekdays/weekends)?",
  },
  {
    key: "budget",
    text: "Do you have any budget constraints for courses/tools this week?",
  },
  {
    key: "network",
    text: "Do you already know someone in your target company who can help with context or referrals?",
  },
];

export function StrategyAgentClient() {
  const [audit, setAudit] = useState<StoredAudit | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answers, setAnswers] = useState<Partial<StrategyAnswers>>({});
  const [questionIdx, setQuestionIdx] = useState(0);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [planSummary, setPlanSummary] = useState("");
  const [tasks, setTasks] = useState<StrategyTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "calendar">("chat");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduledBlock[]>([]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("dhruva_last_profile_audit");
      if (!raw) {
        setAudit(null);
        return;
      }
      const parsed = JSON.parse(raw) as StoredAudit;
      if (!parsed?.gapAnalysis) {
        setAudit(null);
        return;
      }
      setAudit(parsed);
      setMessages([
        {
          role: "assistant",
          content:
            "Perfect — I’ll build your one-week strategy after a quick discussion so the plan reflects your real constraints.",
        },
        { role: "assistant", content: DISCOVERY_QUESTIONS[0].text },
      ]);
    } catch {
      setAudit(null);
    }
  }, []);

  const company = audit.targetCompany?.trim();
  const role = audit.targetRole?.trim();

  const allQuestionsAnswered = useMemo(
    () => questionIdx >= DISCOVERY_QUESTIONS.length,
    [questionIdx]
  );

  const generatePlan = async (finalAnswers: StrategyAnswers) => {
    if (!audit) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/strategy-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audit: {
            targetRole: audit.targetRole,
            targetCompany: audit.targetCompany,
            targetIndustry: audit.targetIndustry,
            gapAnalysis: audit.gapAnalysis,
          },
          discussion: finalAnswers,
        }),
      });
      const data = (await res.json()) as {
        summary?: string;
        tasks?: StrategyTask[];
        error?: string;
        saved?: boolean;
      };
      if (!res.ok) throw new Error(data.error || "Could not generate plan");

      setPlanSummary(data.summary ?? "");
      const mapped = (data.tasks ?? []).map((t, idx) => ({
        ...t,
        id: `task-${idx + 1}`,
        toolCta: t.toolCta ?? undefined,
      }));
      setTasks(mapped);
      const start = new Date().toISOString().slice(0, 10);
      const nextSchedule: ScheduledBlock[] = mapped.map((t, idx) => ({
        id: `block-${idx + 1}`,
        taskId: t.id,
        date: addDays(start, idx % 7),
        hours: Math.max(1, t.estimatedHours),
      }));
      setSchedule(nextSchedule);
      setSaveMessage(data.saved ? "Plan saved to your strategy workspace." : null);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Great — I now have everything needed. I generated your detailed one-week plan with color-coded priorities.",
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate strategy plan.");
    } finally {
      setIsGenerating(false);
    }
  };

  const onSend = async () => {
    if (!input.trim() || isGenerating || allQuestionsAnswered) return;
    const value = input.trim();
    const current = DISCOVERY_QUESTIONS[questionIdx];
    const nextAnswers = { ...answers, [current.key]: value };

    setMessages((prev) => [...prev, { role: "user", content: value }]);
    setAnswers(nextAnswers);
    setInput("");

    const nextIdx = questionIdx + 1;
    setQuestionIdx(nextIdx);
    if (nextIdx < DISCOVERY_QUESTIONS.length) {
      setMessages((prev) => [...prev, { role: "assistant", content: DISCOVERY_QUESTIONS[nextIdx].text }]);
      return;
    }

    const finalAnswers = nextAnswers as StrategyAnswers;
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "Thanks — generating your actionable one-week plan now. This will tie directly into Discovery and Outreach flows.",
      },
    ]);
    await generatePlan(finalAnswers);
  };

  const onRegenerate = async () => {
    if (isGenerating) return;
    const keys = DISCOVERY_QUESTIONS.map((q) => q.key);
    const complete = keys.every((k) => typeof answers[k] === "string" && String(answers[k]).trim());
    if (!complete) return;
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Regenerating your one-week plan with the same discussion context.",
      },
    ]);
    await generatePlan(answers as StrategyAnswers);
  };

  const startDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startDate, i)), [startDate]);

  const taskById = useMemo(() => {
    const m = new Map<string, StrategyTask>();
    tasks.forEach((t) => m.set(t.id, t));
    return m;
  }, [tasks]);

  const blocksByDay = useMemo(() => {
    const m = new Map<string, ScheduledBlock[]>();
    for (const d of days) m.set(d, []);
    for (const b of schedule) {
      const list = m.get(b.date);
      if (list) list.push(b);
    }
    return m;
  }, [days, schedule]);

  const totalHoursForDay = (iso: string) =>
    (blocksByDay.get(iso) ?? []).reduce((sum, b) => sum + (b.hours || 0), 0);

  const onDragStart = (blockId: string) => (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", blockId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDropDay = (dayIso: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const blockId = e.dataTransfer.getData("text/plain");
    if (!blockId) return;
    setSchedule((prev) => prev.map((b) => (b.id === blockId ? { ...b, date: dayIso } : b)));
  };

  const allowDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div className="flex flex-col gap-4">
      {!audit ? (
        <div className="rounded-3xl border border-[rgba(60,42,106,0.12)] bg-white/70 px-5 py-5">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[rgba(60,42,106,0.7)]">
            HOW TO USE STRATEGY AGENT
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-[rgba(60,42,106,0.8)]">
            <li>Run an audit of your profile through the Discovery Engine.</li>
            <li>Configure your Dhruva chat agent by setting your preferences and goals.</li>
            <li>Get a week-by-week action plan, powered by Dhruva&apos;s features.</li>
            <li>Get a roadmap for your dream role in half the time.</li>
          </ol>

          <div className="mt-4 rounded-2xl border border-[rgba(60,42,106,0.12)] bg-white px-4 py-3 text-sm text-[rgba(60,42,106,0.85)]">
            Strategy Agent unlocks after you run a Profile Audit (gap analysis). Go back to the{" "}
            <span className="font-medium text-[#3c2a6a]">Profile Audit</span> tab and click{" "}
            <span className="font-medium text-[#3c2a6a]">Run Discovery</span>.
          </div>
        </div>
      ) : (
      <section className="rounded-3xl border border-[rgba(60,42,106,0.12)] bg-white/70 px-5 py-5">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-[rgba(60,42,106,0.7)]">
          HOW TO USE STRATEGY AGENT
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-[rgba(60,42,106,0.8)]">
          <li>Run an audit of your profile through the Discovery Engine.</li>
          <li>Configure your Dhruva chat agent by setting your preferences and goals.</li>
          <li>Get a week-by-week action plan, powered by Dhruva&apos;s features.</li>
          <li>Get a roadmap for your dream role in half the time.</li>
        </ol>
      </section>

      <section className="rounded-3xl border border-[rgba(60,42,106,0.12)] bg-white px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#3c2a6a]">Strategy Agent</p>
            <p className="mt-1 text-sm text-[rgba(60,42,106,0.75)]">
              Based on your latest Profile Audit for{" "}
              <span className="font-medium text-[#3c2a6a]">
                {role || "your target role"}
              </span>
              {company ? (
                <>
                  {" "}
                  at <span className="font-medium text-[#3c2a6a]">{company}</span>
                </>
              ) : null}
              .
            </p>
          </div>
          <span className="text-[11px] text-[rgba(60,42,106,0.6)]">
            audited {audit.auditedAt?.slice(0, 16).replace("T", " ") || ""}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("chat")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              view === "chat"
                ? "bg-[#3c2a6a] text-[#fdfbf1]"
                : "border border-[rgba(60,42,106,0.2)] bg-white text-[#3c2a6a]"
            }`}
          >
            Chat + Roadmap
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              view === "calendar"
                ? "bg-[#3c2a6a] text-[#fdfbf1]"
                : "border border-[rgba(60,42,106,0.2)] bg-white text-[#3c2a6a]"
            }`}
          >
            Calendar View
          </button>
        </div>

        {view === "chat" ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex min-h-[420px] flex-col rounded-2xl border border-[rgba(60,42,106,0.1)] bg-[#fdfbf6]">
            <div className="border-b border-[rgba(60,42,106,0.08)] px-4 py-3">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-[rgba(60,42,106,0.7)]">
                STRATEGY CHAT
              </p>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-auto px-4 py-3">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-[#3c2a6a] text-[#fdfbf1]"
                        : "border border-[rgba(60,42,106,0.1)] bg-white text-[#3c2a6a]"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[rgba(60,42,106,0.08)] px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void onSend();
                    }
                  }}
                  disabled={isGenerating || allQuestionsAnswered}
                  placeholder={
                    allQuestionsAnswered
                      ? "Discussion complete — generating/ready."
                      : "Type your answer and press Enter"
                  }
                  className="w-full rounded-full border border-[rgba(60,42,106,0.18)] bg-white px-4 py-2.5 text-sm text-[#3c2a6a] placeholder:text-[rgba(60,42,106,0.45)]"
                />
                <button
                  type="button"
                  onClick={() => void onSend()}
                  disabled={isGenerating || allQuestionsAnswered || !input.trim()}
                  className="rounded-full bg-[#3c2a6a] px-4 py-2 text-xs font-medium text-[#fdfbf1] disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          <div className="flex min-h-[420px] flex-col rounded-2xl border border-[rgba(60,42,106,0.1)] bg-white">
            <div className="border-b border-[rgba(60,42,106,0.08)] px-4 py-3">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-[rgba(60,42,106,0.7)]">
                COLOR-CODED ONE-WEEK PLAN
              </p>
              {planSummary ? (
                <p className="mt-1 text-xs text-[rgba(60,42,106,0.75)]">{planSummary}</p>
              ) : (
                <p className="mt-1 text-xs text-[rgba(60,42,106,0.75)]">
                  Plan appears only after your discussion is complete.
                </p>
              )}
            </div>
            <div className="px-4 py-3">
              <div className="mb-3 flex flex-wrap gap-2">
                {(["Work-Ex", "Acads", "Leadership", "Other"] as const).map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded-full border border-[rgba(60,42,106,0.18)] bg-white px-2 py-1 text-[10px] text-[rgba(60,42,106,0.8)]"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: gapColor(k) }} />
                    {k}
                  </span>
                ))}
              </div>

              {isGenerating ? (
                <div className="rounded-xl border border-[rgba(60,42,106,0.1)] bg-[#fdfbf6] px-3 py-3 text-sm text-[rgba(60,42,106,0.8)]">
                  Generating plan with Claude Sonnet...
                </div>
              ) : tasks.length === 0 ? (
                <div className="rounded-xl border border-[rgba(60,42,106,0.1)] bg-[#fdfbf6] px-3 py-3 text-sm text-[rgba(60,42,106,0.8)]">
                  Complete the chat on the left to generate your action items.
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <div key={t.id} className="rounded-xl border border-[rgba(60,42,106,0.1)] bg-[#fdfbf6] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-[#3c2a6a]">
                            {t.stageLabel} · {t.gapArea}
                          </p>
                          <p className="mt-1 font-serif text-base font-semibold text-[#3c2a6a]">
                            {t.title}
                          </p>
                        </div>
                        <span className="h-3 w-3 rounded-full" style={{ background: gapColor(t.gapArea) }} />
                      </div>
                      <p className="mt-1 text-sm text-[rgba(60,42,106,0.75)]">{t.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[rgba(60,42,106,0.18)] bg-white px-2 py-1 text-[10px] text-[rgba(60,42,106,0.8)]">
                          Difficulty: {t.difficulty}
                        </span>
                        <span className="rounded-full border border-[rgba(60,42,106,0.18)] bg-white px-2 py-1 text-[10px] text-[rgba(60,42,106,0.8)]">
                          Impact: {t.impact}
                        </span>
                        <span className="rounded-full border border-[rgba(60,42,106,0.18)] bg-white px-2 py-1 text-[10px] text-[rgba(60,42,106,0.8)]">
                          Effort: {t.estimatedHours}h
                        </span>
                        {t.toolCta === "opportunity-discovery" && (
                          <Link
                            href={`/opportunity?role=${encodeURIComponent(role || "")}&company=${encodeURIComponent(
                              company || ""
                            )}&industry=${encodeURIComponent(audit.targetIndustry || "")}`}
                            className="ml-auto rounded-full bg-[#3c2a6a] px-3 py-1 text-[10px] font-medium text-[#fdfbf1]"
                          >
                            Launch Discovery
                          </Link>
                        )}
                        {t.toolCta === "outreach-copilot" && (
                          <Link
                            href={`/outreach?company=${encodeURIComponent(company || "")}`}
                            className="ml-auto rounded-full bg-[#3c2a6a] px-3 py-1 text-[10px] font-medium text-[#fdfbf1]"
                          >
                            Draft with Copilot
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              {saveMessage && <p className="mt-2 text-xs text-emerald-700">{saveMessage}</p>}
              {tasks.length > 0 && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void onRegenerate()}
                    disabled={isGenerating}
                    className="rounded-full border border-[rgba(60,42,106,0.2)] bg-white px-3 py-1.5 text-[11px] font-medium text-[#3c2a6a] disabled:opacity-50"
                  >
                    Regenerate plan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        ) : (
          <div className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {days.map((d) => (
                <div
                  key={d}
                  onDrop={onDropDay(d)}
                  onDragOver={allowDrop}
                  className="rounded-2xl border border-[rgba(60,42,106,0.12)] bg-white p-3"
                >
                  <p className="text-xs font-semibold text-[#3c2a6a]">{fmtDayLabel(d)}</p>
                  <p className="mt-0.5 text-[11px] text-[rgba(60,42,106,0.65)]">
                    Total effort: {totalHoursForDay(d)}h
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {(blocksByDay.get(d) ?? []).map((b) => {
                      const t = taskById.get(b.taskId);
                      if (!t) return null;
                      return (
                        <div
                          key={b.id}
                          draggable
                          onDragStart={onDragStart(b.id)}
                          className="cursor-grab rounded-xl px-3 py-2 text-white"
                          style={{ background: gapColor(t.gapArea) }}
                        >
                          <p className="text-[10px] font-semibold opacity-90">{t.stageLabel}</p>
                          <p className="mt-1 text-[12px] font-semibold leading-snug">{t.title}</p>
                          <p className="mt-0.5 text-[11px] opacity-90">{b.hours}h</p>
                        </div>
                      );
                    })}
                    {(blocksByDay.get(d) ?? []).length === 0 && (
                      <div className="rounded-xl border border-dashed border-[rgba(60,42,106,0.18)] bg-[#fdfbf6] px-3 py-3 text-[11px] text-[rgba(60,42,106,0.65)]">
                        Drop tasks here
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      )}
    </div>
  );
}

