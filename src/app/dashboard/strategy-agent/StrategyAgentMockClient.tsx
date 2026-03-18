"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

type StrategyTask = {
  id: string;
  gapArea: "Work-Ex" | "Acads" | "Leadership" | "Other";
  stageLabel: string;
  title: string;
  description: string;
  difficulty: "Easy" | "Hard";
  impact: "High" | "Low";
  estimatedHours: number;
  toolCta?: "opportunity-discovery" | "outreach-copilot";
};

type ScheduledBlock = {
  id: string;
  taskId: string;
  date: string; // YYYY-MM-DD
  hours: number;
};

function fmtDayLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const parts = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).formatToParts(d);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${weekday}, ${month} ${day}`;
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function gapColor(area: StrategyTask["gapArea"]) {
  if (area === "Work-Ex") return "#430D4B";
  if (area === "Acads") return "#7B357E";
  if (area === "Leadership") return "#C674B2";
  return "#3C2A6A";
}

export function StrategyAgentMockClient(props?: { embedded?: boolean }) {
  const embedded = props?.embedded ?? false;
  const [view, setView] = useState<"chat" | "calendar">("chat");
  const [messages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Mock Strategy Agent — this is dummy data so you can preview layout. When you’re ready, we’ll wire it to your Gap Analysis + benchmark profiles.",
    },
    {
      role: "assistant",
      content:
        "First: what is the total timeframe (e.g., 3 weeks, 2 months) you have before your target application deadline?",
    },
    { role: "user", content: "6 weeks." },
    {
      role: "assistant",
      content: "How many hours per week can you realistically dedicate?",
    },
    { role: "user", content: "8 hours/week." },
    {
      role: "assistant",
      content:
        "Based on your Gap Analysis (Acads, Work-Ex, Leadership), what should we prioritize first?",
    },
    { role: "user", content: "Work-Ex, then Leadership." },
  ]);

  const tasks = useMemo<StrategyTask[]>(
    () => [
      {
        id: "t1",
        gapArea: "Work-Ex",
        stageLabel: "WE — Stage 1",
        title: "Shortlist 10 target internships",
        description:
          "Use your target functions + industries to pick 10 roles you’d genuinely apply to this week.",
        difficulty: "Easy",
        impact: "High",
        estimatedHours: 2,
        toolCta: "opportunity-discovery",
      },
      {
        id: "t2",
        gapArea: "Acads",
        stageLabel: "AC — Stage 1",
        title: "Fix 1 weak academic signal",
        description:
          "Pick one measurable academic improvement aligned to the role (course project or certification).",
        difficulty: "Hard",
        impact: "High",
        estimatedHours: 6,
      },
      {
        id: "t3",
        gapArea: "Leadership",
        stageLabel: "LD — Stage 1",
        title: "Draft 3 outreach messages",
        description:
          "Write 3 variants: alum, recruiter, hiring manager. Keep it short and specific.",
        difficulty: "Easy",
        impact: "High",
        estimatedHours: 2,
        toolCta: "outreach-copilot",
      },
      {
        id: "t4",
        gapArea: "Leadership",
        stageLabel: "LD — Stage 2",
        title: "Run 10 outreach attempts",
        description:
          "Send 10 messages over 3 days; track replies + iterate without overthinking.",
        difficulty: "Hard",
        impact: "High",
        estimatedHours: 4,
      },
      {
        id: "t5",
        gapArea: "Other",
        stageLabel: "OP — Stage 1",
        title: "Update resume bullets (top 3)",
        description:
          "Rewrite your top 3 bullets to be metric-first, outcome-first, and role-aligned.",
        difficulty: "Easy",
        impact: "High",
        estimatedHours: 2,
      },
    ],
    []
  );

  const startDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [schedule, setSchedule] = useState<ScheduledBlock[]>(() => [
    { id: "s1", taskId: "t1", date: addDays(startDate, 0), hours: 2 },
    { id: "s2", taskId: "t5", date: addDays(startDate, 1), hours: 2 },
    { id: "s3", taskId: "t3", date: addDays(startDate, 2), hours: 2 },
    { id: "s4", taskId: "t2", date: addDays(startDate, 3), hours: 3 },
    { id: "s5", taskId: "t2", date: addDays(startDate, 5), hours: 3 },
    { id: "s6", taskId: "t4", date: addDays(startDate, 6), hours: 2 },
    { id: "s7", taskId: "t4", date: addDays(startDate, 8), hours: 2 },
  ]);

  const days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(startDate, i)),
    [startDate]
  );

  const taskById = useMemo(() => {
    const m = new Map<string, StrategyTask>();
    tasks.forEach((t) => m.set(t.id, t));
    return m;
  }, [tasks]);

  const blocksByDay = useMemo(() => {
    const m = new Map<string, ScheduledBlock[]>();
    for (const d of days) m.set(d, []);
    for (const b of schedule) {
      if (!m.has(b.date)) continue;
      m.get(b.date)!.push(b);
    }
    return m;
  }, [days, schedule]);

  const totalHoursForDay = (iso: string) =>
    (blocksByDay.get(iso) ?? []).reduce((sum, b) => sum + (b.hours || 0), 0);

  const onDragStart = (blockId: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", blockId);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDropDay = (dayIso: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const blockId = e.dataTransfer.getData("text/plain");
    if (!blockId) return;
    setSchedule((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, date: dayIso } : b))
    );
  };
  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div className={embedded ? "" : "min-h-screen bg-[#fdfbf1]"}>
      {!embedded && (
        <header className="sticky top-0 z-10 border-b border-[rgba(60,42,106,0.08)] bg-[#fdfbf1]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="font-serif text-lg font-semibold text-[#3c2a6a]"
              >
                dhruva.ai
              </Link>
              <span className="rounded-full border border-[rgba(60,42,106,0.18)] bg-white px-3 py-1 text-[11px] font-medium text-[rgba(60,42,106,0.75)]">
                Strategy Agent · Mock UI
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView("chat")}
                className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                  view === "chat"
                    ? "bg-[#3c2a6a] text-[#fdfbf1]"
                    : "border border-[rgba(60,42,106,0.18)] bg-white text-[#3c2a6a]"
                }`}
              >
                Chat + Roadmap
              </button>
              <button
                type="button"
                onClick={() => setView("calendar")}
                className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                  view === "calendar"
                    ? "bg-[#3c2a6a] text-[#fdfbf1]"
                    : "border border-[rgba(60,42,106,0.18)] bg-white text-[#3c2a6a]"
                }`}
              >
                Calendar View
              </button>
            </div>
          </div>
        </header>
      )}

      {view === "chat" ? (
        <div className={`${embedded ? "" : "px-4 py-6"}`}>
          <div className={`grid gap-4 ${embedded ? "" : "mx-auto max-w-6xl md:grid-cols-2"}`}>
            <section className="flex min-h-[60vh] flex-col rounded-3xl border border-[rgba(60,42,106,0.15)] bg-white">
              <div className="border-b border-[rgba(60,42,106,0.08)] px-5 py-4">
                <p className="text-[11px] font-semibold tracking-[0.22em] text-[rgba(60,42,106,0.7)]">
                  CONVERSATION
                </p>
                <p className="mt-1 text-xs text-[rgba(60,42,106,0.75)]">
                  Dummy messages. No API calls. Just layout.
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-3 overflow-auto px-5 py-4">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${
                        m.role === "user"
                          ? "bg-[#3c2a6a] text-[#fdfbf1]"
                          : "border border-[rgba(60,42,106,0.1)] bg-[#fdfbf6] text-[#3c2a6a]"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[rgba(60,42,106,0.08)] px-5 py-4">
                <div className="flex items-center gap-2">
                  <input
                    disabled
                    placeholder="Mock input (disabled)"
                    className="w-full rounded-full border border-[rgba(60,42,106,0.18)] bg-white px-4 py-3 text-sm text-[#3c2a6a] placeholder:text-[rgba(60,42,106,0.45)]"
                  />
                  <button
                    type="button"
                    disabled
                    className="rounded-full bg-[#3c2a6a] px-5 py-3 text-xs font-medium text-[#fdfbf1] opacity-60"
                  >
                    Send
                  </button>
                </div>
              </div>
            </section>

            <section className="flex min-h-[60vh] flex-col rounded-3xl border border-[rgba(60,42,106,0.15)] bg-white">
              <div className="border-b border-[rgba(60,42,106,0.08)] px-5 py-4">
                <p className="text-[11px] font-semibold tracking-[0.22em] text-[rgba(60,42,106,0.7)]">
                  WEEKLY ROADMAP (DUMMY)
                </p>
                <p className="mt-1 text-xs text-[rgba(60,42,106,0.75)]">
                  Tasks show Difficulty, Impact, Effort, Stage, and optional tool CTAs.
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-3 overflow-auto px-5 py-4">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-[rgba(60,42,106,0.1)] bg-[#fdfbf6] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[#3c2a6a]">
                          {t.stageLabel} · {t.gapArea}
                        </p>
                        <p className="mt-1 font-serif text-lg font-semibold text-[#3c2a6a]">
                          {t.title}
                        </p>
                        <p className="mt-1 text-sm text-[rgba(60,42,106,0.75)]">
                          {t.description}
                        </p>
                      </div>
                      <div
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ background: gapColor(t.gapArea) }}
                        title={t.gapArea}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[rgba(60,42,106,0.18)] bg-white px-3 py-1 text-[11px] text-[rgba(60,42,106,0.8)]">
                        Difficulty: {t.difficulty}
                      </span>
                      <span className="rounded-full border border-[rgba(60,42,106,0.18)] bg-white px-3 py-1 text-[11px] text-[rgba(60,42,106,0.8)]">
                        Impact: {t.impact}
                      </span>
                      <span className="rounded-full border border-[rgba(60,42,106,0.18)] bg-white px-3 py-1 text-[11px] text-[rgba(60,42,106,0.8)]">
                        Effort: {t.estimatedHours}h
                      </span>
                      {t.toolCta === "opportunity-discovery" && (
                        <button
                          type="button"
                          className="ml-auto rounded-full bg-[#3c2a6a] px-4 py-1.5 text-[11px] font-medium text-[#fdfbf1]"
                        >
                          Launch Discovery
                        </button>
                      )}
                      {t.toolCta === "outreach-copilot" && (
                        <button
                          type="button"
                          className="ml-auto rounded-full bg-[#3c2a6a] px-4 py-1.5 text-[11px] font-medium text-[#fdfbf1]"
                        >
                          Draft with Copilot
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[rgba(60,42,106,0.08)] px-5 py-4">
                <button
                  type="button"
                  onClick={() => setView("calendar")}
                  className="w-full rounded-2xl border-2 border-[#3c2a6a] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#3c2a6a] transition hover:bg-[#3c2a6a] hover:text-white"
                >
                  Confirm plan and preview calendar
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className={`${embedded ? "" : "px-4 py-6"}`}>
          <div className={`${embedded ? "" : "mx-auto max-w-6xl"}`}>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.22em] text-[rgba(60,42,106,0.7)]">
                  CALENDAR (DUMMY · DRAG & DROP)
                </p>
                <p className="mt-1 text-sm text-[rgba(60,42,106,0.75)]">
                  Drag blocks between days to preview interaction. No backend calls.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-[rgba(60,42,106,0.18)] bg-white px-4 py-2 text-xs font-medium text-[#3c2a6a]"
              >
                Sync to Calendar (mock)
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {days.map((d) => (
                <div
                  key={d}
                  onDrop={onDropDay(d)}
                  onDragOver={allowDrop}
                  className="relative rounded-2xl border border-[rgba(60,42,106,0.12)] bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[#3c2a6a]">
                        {fmtDayLabel(d)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[rgba(60,42,106,0.65)]">
                        Total effort: {totalHoursForDay(d)}h
                      </p>
                    </div>
                    <span className="rounded-full bg-[rgba(60,42,106,0.06)] px-2 py-1 text-[10px] font-medium text-[rgba(60,42,106,0.7)]">
                      {d}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    {(blocksByDay.get(d) ?? []).map((b) => {
                      const t = taskById.get(b.taskId);
                      if (!t) return null;
                      const bg = gapColor(t.gapArea);
                      return (
                        <div
                          key={b.id}
                          draggable
                          onDragStart={onDragStart(b.id)}
                          className="cursor-grab rounded-xl px-3 py-2 text-white shadow-sm active:cursor-grabbing"
                          style={{ background: bg }}
                          title="Drag me"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold opacity-95">
                              {t.stageLabel}
                            </span>
                            <span className="text-[10px] font-medium opacity-90">
                              {b.hours}h
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] font-semibold leading-snug">
                            {t.title}
                          </p>
                          <p className="mt-0.5 text-[11px] opacity-90">
                            {t.gapArea}
                          </p>
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
        </div>
      )}
    </div>
  );
}

