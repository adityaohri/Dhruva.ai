"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowUp, Paperclip } from "lucide-react";
import { INDUSTRY_KEYWORDS, type IndustryName } from "@/lib/industryKeywords";

const FIRST_MESSAGE =
  "Hi! I'm Dhruva. I'm going to ask you a few questions to personalise your experience. Let's start — please upload your CV (PDF works best).";

type Message = {
  role: "user" | "assistant";
  content: string;
  profileTable?: Record<string, unknown>;
};

const PROFILE_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  university: "University",
  gpa: "GPA",
  skills: "Skills",
  internships: "Internships",
  leadership_positions: "Leadership",
  projects: "Projects",
  entrepreneurship: "Entrepreneurship",
  personal_impact: "Personal impact",
  target_functions: "Target functions",
  target_industries: "Target industries",
  experience_level: "Experience level",
  commitment_type: "Commitment",
  work_mode: "Work mode",
  preferred_locations: "Preferred locations",
  aspirations_notes: "Aspirations notes",
  focus_sections: "Focus sections",
  profile_timeframe_weeks: "Timeframe (weeks)",
  action_preferences: "Action preferences",
  notification_whatsapp: "Notify via WhatsApp",
  notification_email: "Notify via Email",
  notification_message: "Notify via Message",
  notify_signals: "Notify: Signals",
  notify_opportunities: "Notify: Opportunities",
  notify_hidden_jobs: "Notify: Hidden jobs",
  preferred_signals: "Preferred signals",
  writing_style: "Writing style",
  custom_writing_sample: "Custom writing sample",
  whatsapp_linked: "WhatsApp linked",
  email_linked: "Email linked",
};

function formatTableValue(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.map(String).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const SECTION_LABELS = {
  profile: ["name", "university", "gpa", "skills", "internships", "leadership_positions", "projects", "entrepreneurship", "personal_impact"],
  aspirations: ["target_functions", "target_industries", "experience_level", "commitment_type", "work_mode", "preferred_locations", "aspirations_notes"],
  benchmarking: ["focus_sections", "profile_timeframe_weeks", "action_preferences"],
  discovery: ["notification_whatsapp", "notification_email", "notification_message", "notify_signals", "notify_opportunities", "notify_hidden_jobs", "preferred_signals"],
  outreach: ["writing_style", "custom_writing_sample", "whatsapp_linked", "email_linked"],
} as const;

const SECTION_KEYS = ["profile", "aspirations", "benchmarking", "discovery", "outreach"] as const;
const TOTAL_SECTIONS = SECTION_KEYS.length;

const FUNCTION_OPTIONS = [
  "Founder's Office / Strategy",
  "Engineering & Product",
  "Marketing & Growth",
  "Finance & Investing",
  "Consulting & Advisory",
  "Design",
  "Operations & Supply Chain",
  "HR",
  "Others",
] as const;

const INDUSTRY_OPTIONS = Object.keys(INDUSTRY_KEYWORDS) as IndustryName[];

const EXPERIENCE_OPTIONS = [
  "Entry Level",
  "0-3 YoE",
  "3+ YoE",
] as const;

const COMMITMENT_OPTIONS = [
  "Full Time",
  "Part Time",
  "Internship",
] as const;

const WORK_MODE_OPTIONS = [
  "Remote",
  "Hybrid",
  "In-Office",
] as const;

const LOCATION_OPTIONS = [
  "Gurugram",
  "Mumbai",
  "Bengaluru",
  "Kolkata",
  "Chennai",
  "Others",
] as const;

function getSectionsCompleted(profile: Record<string, unknown>): number {
  let count = 0;
  for (const section of SECTION_KEYS) {
    const keys = SECTION_LABELS[section];
    const hasAny = keys.some((k) => {
      const v = profile[k];
      return v != null && String(v).trim() !== "";
    });
    if (hasAny) count++;
  }
  return count;
}

export function OnboardingChat({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: FIRST_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const saveProfile = useCallback(
    async (fullProfile: Record<string, unknown>) => {
      const { error } = await supabase.from("user_profiles").upsert(
        {
          user_id: userId,
          ...fullProfile,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) console.error("[OnboardingChat] saveProfile:", error);
    },
    [userId, supabase]
  );

  const sendMessage = useCallback(
    async (
      text: string,
      options?: { displayContent?: string }
    ) => {
      if (!text || isLoading) return;

      const displayContent = options?.displayContent ?? text;
      setMessages((prev) => [...prev, { role: "user", content: displayContent }]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/onboard-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            userMessage: text,
            profile,
            userId,
          }),
        });

        if (!res.ok) {
          await res.json().catch(() => ({}));
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Something went wrong. Please try again." },
          ]);
          setIsLoading(false);
          return;
        }

        const data = (await res.json()) as {
          reply: string;
          profileUpdates: Record<string, unknown>;
          isComplete: boolean;
        };

        const updates = data.profileUpdates ?? {};
        const profileKeys = SECTION_LABELS.profile;
        const hasProfileTable =
          Object.keys(updates).some((k) => profileKeys.includes(k as (typeof profileKeys)[number]));
        const assistantContent = hasProfileTable
          ? "I've extracted your profile from your CV. Please confirm or edit below."
          : data.reply;

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: assistantContent,
            ...(hasProfileTable && { profileTable: updates }),
          },
        ]);
        if (Object.keys(updates).length > 0) {
          const nextProfile = { ...profile, ...updates };
          setProfile(nextProfile);
          await saveProfile(nextProfile);
        }

        if (data.isComplete) {
          await supabase
            .from("user_profiles")
            .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
            .eq("user_id", userId);
          setTimeout(() => router.push("/dashboard"), 1500);
        }
      } catch (e) {
        console.error(e);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Something went wrong. Please try again." },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, profile, userId, router, saveProfile, supabase]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMessage(text);
  }, [input, sendMessage]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      event.target.value = "";

      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isTxt = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");

      if (isPdf) {
        const formData = new FormData();
        formData.append("pdf", file, file.name);
        try {
          const res = await fetch("/api/onboard-extract-cv", {
            method: "POST",
            body: formData,
          });
          const data = (await res.json()) as { text?: string; error?: string };
          if (res.ok && data.text) {
            await sendMessage(
              `I've uploaded my CV. Please extract my profile details from this content and use them for the rest of the onboarding:\n\n---\n${data.text}\n---`,
              { displayContent: "I've uploaded my CV." }
            );
            return;
          }
          await sendMessage(
            `I tried to upload my CV (${file.name}) but it couldn't be read: ${data.error ?? "unknown error"}. I'll paste my details instead.`
          );
        } catch (e) {
          console.error(e);
          await sendMessage(
            "My CV upload failed. I'll paste my key details instead."
          );
        }
        return;
      }

      if (isTxt) {
        try {
          const raw = await file.text();
          const text = raw?.trim();
          if (text) {
            await sendMessage(
              `I've uploaded my CV/resume as text. Please extract my profile from this content:\n\n---\n${text}\n---`,
              { displayContent: "I've uploaded my CV (text)." }
            );
            return;
          }
        } catch {
          // fall through to generic message
        }
      }

      await sendMessage(
        `I uploaded ${file.name}. For best results, please use a PDF or paste your CV details here.`
      );
    },
    [sendMessage]
  );

  const sectionsCompleted = getSectionsCompleted(profile);
  const sectionsLeft = Math.max(0, TOTAL_SECTIONS - sectionsCompleted);
  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const showFunctionChoices =
    !!latestAssistant &&
    /what function do you want to work in\?/i.test(latestAssistant.content);
  const showIndustryPrompt =
    !!latestAssistant &&
    /which industry.*work(ing)? in\?/i.test(latestAssistant.content);
  const showExperienceChoices =
    !!latestAssistant &&
    /experience level\?\s*\(entry level, 0-3 yoe, 3\+ yoe\)/i.test(latestAssistant.content);
  const showCommitmentChoices =
    !!latestAssistant &&
    /commitment type\?\s*\(full time, part time, internship\)/i.test(latestAssistant.content);
  const showWorkModeChoices =
    !!latestAssistant &&
    /work mode\?\s*\(remote, hybrid, in-office\)/i.test(latestAssistant.content);
  const showLocationChoices =
    !!latestAssistant &&
    /preferred locations\?\s*\(gurugram, mumbai, bengaluru, kolkata, chennai, others\)/i.test(
      latestAssistant.content
    );

  return (
    <div className="flex min-h-[100vh] flex-col bg-[#fdfbf1] overflow-hidden">
      <header className="flex shrink-0 flex-col border-b border-[rgba(60,42,106,0.08)] bg-[#fdfbf1]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="font-serif text-lg font-semibold text-[#3c2a6a]">
            dhruva.ai
          </Link>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-xs sm:text-sm text-[rgba(60,42,106,0.6)] hover:underline text-right"
          >
            Skip for now (you can do this later, but onboarding helps us customise everything for you)
          </button>
        </div>
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[rgba(60,42,106,0.6)]">
              {sectionsLeft === 0 ? "All set!" : `${sectionsLeft} section${sectionsLeft === 1 ? "" : "s"} left`}
            </span>
            <span className="text-xs tabular-nums text-[#3c2a6a]">
              {sectionsCompleted}/{TOTAL_SECTIONS}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(60,42,106,0.1)]">
            <div
              className="h-full rounded-full bg-[#3c2a6a] transition-all duration-300 ease-out"
              style={{ width: `${(sectionsCompleted / TOTAL_SECTIONS) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {messages.map((m, i) => {
          const isLastProfileTableMessage =
            m.role === "assistant" &&
            m.profileTable &&
            Object.keys(m.profileTable).length > 0 &&
            !messages.slice(i + 1).some((x) => x.role === "assistant" && x.profileTable);
          return (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === "assistant"
                    ? "border border-[rgba(60,42,106,0.1)] bg-white text-[#3c2a6a]"
                    : "bg-[#3c2a6a] text-[#fdfbf1]"
                }`}
              >
                {m.content}
                {m.role === "assistant" && m.profileTable && Object.keys(m.profileTable).length > 0 && (
                  <>
                    <div className="mt-3 overflow-hidden rounded-lg border border-[rgba(60,42,106,0.12)] bg-[#fdfbf6] px-3 py-2">
                      <table className="w-full text-left text-sm">
                        <tbody>
                          {Object.keys(m.profileTable).map((key) => {
                            const currentValue = profile[key] ?? m.profileTable![key];
                            const displayValue = formatTableValue(currentValue);
                            return (
                              <tr
                                key={key}
                                className="border-b border-[rgba(60,42,106,0.08)] last:border-b-0"
                              >
                                <td className="py-2 pr-3 font-medium text-[rgba(60,42,106,0.7)] align-top">
                                  {PROFILE_FIELD_LABELS[key] ?? key.replace(/_/g, " ")}
                                </td>
                                <td className="py-2 text-[#3c2a6a]">
                                  <textarea
                                    value={displayValue}
                                    onChange={(e) =>
                                      setProfile((prev) => ({ ...prev, [key]: e.target.value }))
                                    }
                                    rows={1}
                                    className="w-full min-h-[2.25rem] rounded border border-[rgba(60,42,106,0.2)] bg-white px-2 py-1 text-[#3c2a6a] text-sm leading-snug placeholder:text-[rgba(60,42,106,0.4)] focus:border-[#3c2a6a] focus:outline-none focus:ring-1 focus:ring-[#3c2a6a]/30 resize-y"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {isLastProfileTableMessage && (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="text-xs text-[rgba(60,42,106,0.7)]">
                          You can edit any field above before confirming.
                        </span>
                        <div className="ml-auto flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-full border border-[#3c2a6a]/30 px-4 py-2 text-xs font-medium text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                          >
                            Edit details
                          </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await saveProfile(profile);
                            await sendMessage(
                              "I've confirmed my profile. Please guide me to the next steps."
                            );
                          }}
                          disabled={isLoading}
                          className="rounded-full bg-[#3c2a6a] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a347f] disabled:opacity-50"
                        >
                          Confirm & continue
                        </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {showFunctionChoices && (
          <div className="flex justify-start">
            <div className="flex flex-wrap gap-2">
              {FUNCTION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    sendMessage(
                      opt === "Others"
                        ? "I want to work in some other function."
                        : opt
                    )
                  }
                  className="rounded-full border border-[rgba(60,42,106,0.25)] bg-white px-3 py-1.5 text-xs font-medium text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
        {showIndustryPrompt && (
          <div className="flex justify-start">
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_OPTIONS.map((opt) => {
                const active = selectedIndustries.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setSelectedIndustries((prev) =>
                        prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      active
                        ? "border-[#3c2a6a] bg-[#3c2a6a] text-white"
                        : "border-[rgba(60,42,106,0.25)] bg-white text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
              {selectedIndustries.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    const label = selectedIndustries.join(", ");
                    await sendMessage(
                      `I'd like to work in these industries: ${label}.`
                    );
                    setSelectedIndustries([]);
                  }}
                  className="rounded-full bg-[#3c2a6a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4a347f]"
                >
                  Confirm industries
                </button>
              )}
            </div>
          </div>
        )}
        {showExperienceChoices && (
          <div className="flex justify-start">
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => sendMessage(opt)}
                  className="rounded-full border border-[rgba(60,42,106,0.25)] bg-white px-3 py-1.5 text-xs font-medium text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
        {showCommitmentChoices && (
          <div className="flex justify-start">
            <div className="flex flex-wrap gap-2">
              {COMMITMENT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => sendMessage(opt)}
                  className="rounded-full border border-[rgba(60,42,106,0.25)] bg-white px-3 py-1.5 text-xs font-medium text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
        {showWorkModeChoices && (
          <div className="flex justify-start">
            <div className="flex flex-wrap gap-2">
              {WORK_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => sendMessage(opt)}
                  className="rounded-full border border-[rgba(60,42,106,0.25)] bg-white px-3 py-1.5 text-xs font-medium text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
        {showLocationChoices && (
          <div className="flex justify-start">
            <div className="flex flex-wrap gap-2">
              {LOCATION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    sendMessage(
                      opt === "Others" ? "I'd like to type my preferred locations." : opt
                    )
                  }
                  className="rounded-full border border-[rgba(60,42,106,0.25)] bg-white px-3 py-1.5 text-xs font-medium text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl border border-[rgba(60,42,106,0.1)] bg-white px-4 py-3">
              <span className="animate-bounce [animation-delay:0ms]">.</span>
              <span className="animate-bounce [animation-delay:150ms]">.</span>
              <span className="animate-bounce [animation-delay:300ms]">.</span>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[rgba(60,42,106,0.08)] bg-[#fdfbf1] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <div className="flex items-center">
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#3c2a6a] hover:bg-[rgba(60,42,106,0.08)]"
              aria-label="Upload file"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.rtf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your answer..."
            className="flex-1 rounded-full border border-[rgba(60,42,106,0.15)] bg-white px-4 py-2.5 text-sm text-[#3c2a6a] placeholder:text-[rgba(60,42,106,0.4)] focus:outline-none focus:ring-2 focus:ring-[#3c2a6a]/20"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3c2a6a] text-[#fdfbf1] disabled:opacity-50 hover:enabled:bg-[#4a347f]"
            aria-label="Send"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
