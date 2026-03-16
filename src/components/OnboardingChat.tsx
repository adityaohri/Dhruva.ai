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
  "0-3 Years of Experience",
  "3+ Years of Experience",
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

const BENCHMARKING_FOCUS_OPTIONS = [
  "GPA",
  "Internships",
  "Leadership",
  "Projects",
  "Entrepreneurship",
  "Personal Impact",
  "Others",
] as const;

const ACTION_PREFERENCE_OPTIONS = [
  "Doing courses",
  "Seeking out opportunities",
  "Credentialing",
  "Volunteering",
  "Other",
] as const;

const SIGNAL_OPTIONS = [
  "Jobsurge",
  "Funding",
  "Leadership",
  "Product",
  "Workstream",
  "Virality",
  "Geography",
  "Contract",
  "Headcount",
  "Regulatory",
] as const;

const SIGNAL_DESCRIPTIONS: Record<(typeof SIGNAL_OPTIONS)[number], string> = {
  Jobsurge:
    "We track companies posting multiple roles at once — a surge in job listings is often the clearest sign they're actively building a team.",
  Funding:
    "When a company raises fresh capital, hiring almost always follows. We catch funding announcements before the job posts go live.",
  Leadership:
    "A new CXO or VP joining a company means new priorities and new hires. We track leadership changes so you can get in early.",
  Product:
    "A new product launch means new teams to build and support it. We detect launches before the hiring wave hits.",
  Workstream:
    "When a company announces a new vertical, division, or strategic shift, they need new people to execute it. We catch it early.",
  Virality:
    "Companies gaining sudden public attention often accelerate hiring to keep up with momentum. We track the buzz.",
  Geography:
    "Expanding to a new city means boots on the ground. We spot geographic expansion announcements before the local roles are posted.",
  Contract:
    "Winning a large contract or partnership means delivery capacity needs to grow fast. We flag it the moment it's announced.",
  Headcount:
    "Some companies publicly announce they're growing their team. We surface those signals directly to you.",
  Regulatory:
    "A new licence, approval, or compliance milestone unlocks entire business lines — and the hiring that comes with them.",
};

const NOTIFICATION_MEDIA_OPTIONS = ["WhatsApp", "Email", "Message"] as const;
const NOTIFICATION_TYPE_OPTIONS = ["Signals", "Opportunities", "Hidden Jobs"] as const;

const WRITING_STYLE_OPTIONS = [
  "Normal",
  "Learning",
  "Concise",
  "Formal",
  "Explanatory",
  "Create your own style",
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

function getCurrentSection(profile: Record<string, unknown>): (typeof SECTION_KEYS)[number] {
  for (const section of SECTION_KEYS) {
    const keys = SECTION_LABELS[section];
    const hasAny = keys.some((k) => {
      const v = profile[k];
      return v != null && String(v).trim() !== "";
    });
    if (!hasAny) return section;
  }
  return "outreach";
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
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedBenchmarkingFocus, setSelectedBenchmarkingFocus] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [rankedSignals, setRankedSignals] = useState<string[]>([]);
  const [notificationMatrix, setNotificationMatrix] = useState<
    Record<string, string[]>
  >({});

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
            setInput("");
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
            setInput("");
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
  const currentSection = getCurrentSection(profile);
  const progressPercent = Math.round((sectionsCompleted / TOTAL_SECTIONS) * 100);
  const lastMessage = messages[messages.length - 1];
  const lastIsAssistant = lastMessage?.role === "assistant";
  const showFunctionChoices =
    lastIsAssistant &&
    !!lastMessage &&
    /what function do you want to work in\?/i.test(lastMessage.content);
  const showIndustryPrompt =
    lastIsAssistant &&
    !!lastMessage &&
    /which industry.*work(ing)? in\?/i.test(lastMessage.content);
  const showExperienceChoices =
    lastIsAssistant &&
    !!lastMessage &&
    /experience level\?/i.test(lastMessage.content);
  const showCommitmentChoices =
    lastIsAssistant &&
    !!lastMessage &&
    /commitment/i.test(lastMessage.content);
  const showWorkModeChoices =
    lastIsAssistant &&
    !!lastMessage &&
    /work mode/i.test(lastMessage.content);
  const showLocationChoices =
    lastIsAssistant &&
    !!lastMessage &&
    /(preferred )?locations?|any preferred locations/i.test(lastMessage.content);

  const showBenchmarkingFocusChoices =
    lastIsAssistant &&
    !!lastMessage &&
    /profile sections.*(focus|improv|strengthen)|which (sections|parts).*(focus|improv|strengthen)/i.test(
      lastMessage.content
    );

  const showActionPreferenceChoices =
    lastIsAssistant &&
    !!lastMessage &&
    /(preference|preferred).*(type of )?action|action types/i.test(lastMessage.content);

  const showSignalChoices =
    lastIsAssistant &&
    !!lastMessage &&
    /(which )?signals?( to show| you'd like us to show| you would like us to show)?/i.test(
      lastMessage.content
    );

  const showNotificationMatrix =
    lastIsAssistant &&
    !!lastMessage &&
    /where do you want to get your notifications|notification preferences across whatsapp, email, message/i.test(
      lastMessage.content
    );

  const showWritingStyleChoices =
    lastIsAssistant &&
    !!lastMessage &&
    /(which )?writing style|preferred writing style/i.test(lastMessage.content);

  const showLinkChoices =
    lastIsAssistant &&
    !!lastMessage &&
    /(link).*(whatsapp).*email/i.test(lastMessage.content);

  const mcqQuestion =
    (showFunctionChoices && "What function do you want to work in?") ||
    (showIndustryPrompt && "Which industry do you want to work in?") ||
    (showExperienceChoices && "What’s your experience level?") ||
    (showCommitmentChoices && "What commitment type are you looking for?") ||
    (showWorkModeChoices && "What work mode do you prefer?") ||
    (showLocationChoices && "Any preferred locations?") ||
    (showBenchmarkingFocusChoices &&
      "Which sections of your profile do you want to focus on strengthening?") ||
    (showActionPreferenceChoices && "Do you have a preference for any particular type of action?") ||
    (showNotificationMatrix &&
      "Where do you want to get your notifications? Choose which media to use for each notification type.") ||
    (showSignalChoices && "Which signals would you like us to use for opportunity discovery?") ||
    (showWritingStyleChoices && "Which writing style would you prefer?") ||
    (showLinkChoices && "Would you like us to link your WhatsApp and Email?") ||
    "";

  return (
    <div className="flex min-h-[100vh] flex-col bg-[#fdfbf1] overflow-hidden">
      <header className="flex shrink-0 flex-col border-b border-[rgba(60,42,106,0.08)] bg-[#fdfbf1]">
        <div className="flex items-center justify-between px-3 py-2">
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
            <span className="text-[11px] font-medium text-[rgba(60,42,106,0.7)]">
              {sectionsLeft === 0
                ? "All set — onboarding complete."
                : `Step ${sectionsCompleted + 1} of ${TOTAL_SECTIONS} · ${
                    currentSection === "profile"
                      ? "Profile"
                      : currentSection === "aspirations"
                      ? "Aspirations"
                      : currentSection === "benchmarking"
                      ? "Profile benchmarking"
                      : currentSection === "discovery"
                      ? "Opportunity discovery"
                      : "Outreach copilot"
                  }`}
            </span>
            <span className="text-[11px] tabular-nums text-[#3c2a6a]">
              {progressPercent}% complete
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(60,42,106,0.1)]">
            <div
              className="h-full rounded-full bg-[#3c2a6a] transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex flex-col px-6 py-6 space-y-4"
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
                          className="rounded-lg border-2 border-[#3c2a6a] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#3c2a6a] shadow-sm hover:bg-[#3c2a6a] hover:text-white disabled:opacity-50 transition"
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
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-[rgba(60,42,106,0.1)] bg-white px-4 py-3">
              <div className="relative h-5 w-5">
                <div className="h-5 w-5 rounded-full border border-[#3c2a6a]/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] text-[#3c2a6a]">✶</span>
                </div>
                <div className="pointer-events-none absolute -left-2 top-1/2 h-1 w-4 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#3c2a6a]/0 via-[#3c2a6a]/60 to-[#3c2a6a] animate-[ping_0.9s_ease-out_infinite]" />
              </div>
              <span className="text-xs text-[rgba(60,42,106,0.7)]">
                Dhruva is thinking…
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[rgba(60,42,106,0.08)] bg-[#fdfbf1] px-6 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {(showFunctionChoices ||
            showIndustryPrompt ||
            showExperienceChoices ||
            showCommitmentChoices ||
            showWorkModeChoices ||
            showLocationChoices ||
            showBenchmarkingFocusChoices ||
            showActionPreferenceChoices ||
            showSignalChoices ||
            showWritingStyleChoices ||
            showLinkChoices ||
            showNotificationMatrix) && (
            <div className="rounded-2xl border border-[rgba(60,42,106,0.15)] bg-white px-3 py-2">
              {mcqQuestion && (
                <p className="mb-2 text-xs font-medium text-[#3c2a6a]">
                  {mcqQuestion}
                </p>
              )}
              {showSignalChoices && (
                <p className="mb-2 text-[11px] leading-snug text-[rgba(60,42,106,0.75)]">
                  <span className="font-semibold">Signal Intelligence —</span> We monitor the
                  internet in real time so you hear about a company's hiring intent before they
                  post a single job.
                </p>
              )}
              {showFunctionChoices && (
                <div className="flex flex-col gap-1">
                  {FUNCTION_OPTIONS.map((opt) => {
                    const active = selectedFunctions.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setSelectedFunctions((prev) =>
                            prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs text-left transition ${
                          active
                            ? "border-[#3c2a6a] bg-[#3c2a6a] text-[#fdfbf1] shadow-sm"
                            : "border-[rgba(60,42,106,0.25)] bg-white text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                  {selectedFunctions.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        const label = selectedFunctions.join(", ");
                        await sendMessage(
                          `I'm interested in these functions: ${label}.`
                        );
                        setSelectedFunctions([]);
                      }}
                      className="mt-1 rounded-lg border-2 border-[#3c2a6a] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#3c2a6a] shadow-sm hover:bg-[#3c2a6a] hover:text-white transition"
                    >
                      Confirm functions
                    </button>
                  )}
                </div>
              )}
              {showIndustryPrompt && (
                <div className="flex flex-col gap-1">
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
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs text-left ${
                          active
                            ? "border-[#3c2a6a] bg-[#3c2a6a] text-[#fdfbf1]"
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
                        const others = selectedIndustries.filter((i) => i === "Other");
                        const named = selectedIndustries.filter((i) => i !== "Other");
                        const namedLabel = named.join(", ");

                        if (named.length > 0 && others.length === 0) {
                          await sendMessage(
                            `I'd like to work in these industries: ${namedLabel}.`
                          );
                        } else if (named.length > 0 && others.length > 0) {
                          await sendMessage(
                            `I'd like to work in these industries: ${namedLabel}, and I also have some other industries in mind that I'll type out next.`
                          );
                        } else {
                          await sendMessage(
                            "I'd like to type the industries I'm interested in — they don't fit neatly into your list."
                          );
                        }
                        setSelectedIndustries([]);
                      }}
                      className="mt-1 rounded-lg border-2 border-[#3c2a6a] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#3c2a6a] shadow-sm hover:bg-[#3c2a6a] hover:text-white transition"
                    >
                      Confirm industries
                    </button>
                  )}
                </div>
              )}
              {showExperienceChoices && (
                <div className="flex flex-col gap-1">
                  {EXPERIENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => sendMessage(opt)}
                      className="flex w-full items-center justify-between rounded-xl border border-[rgba(60,42,106,0.25)] bg-white px-3 py-2 text-xs text-left text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {showCommitmentChoices && (
                <div className="flex flex-col gap-1">
                  {COMMITMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => sendMessage(opt)}
                      className="flex w-full items-center justify-between rounded-xl border border-[rgba(60,42,106,0.25)] bg-white px-3 py-2 text-xs text-left text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {showWorkModeChoices && (
                <div className="flex flex-col gap-1">
                  {WORK_MODE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => sendMessage(opt)}
                      className="flex w-full items-center justify-between rounded-xl border border-[rgba(60,42,106,0.25)] bg-white px-3 py-2 text-xs text-left text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {showLocationChoices && (
                <div className="flex flex-col gap-1">
                  {LOCATION_OPTIONS.map((opt) => {
                    const active = selectedLocations.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setSelectedLocations((prev) =>
                            prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs text-left ${
                          active
                            ? "border-[#3c2a6a] bg-[#3c2a6a] text-[#fdfbf1]"
                            : "border-[rgba(60,42,106,0.25)] bg-white text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                  {selectedLocations.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        const label = selectedLocations.join(", ");
                        await sendMessage(
                          `My preferred locations are: ${label}.`
                        );
                        setSelectedLocations([]);
                      }}
                      className="mt-1 rounded-lg border-2 border-[#3c2a6a] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#3c2a6a] shadow-sm hover:bg-[#3c2a6a] hover:text-white transition"
                    >
                      Confirm locations
                    </button>
                  )}
                </div>
              )}
              {showBenchmarkingFocusChoices && (
                <div className="flex flex-col gap-1">
                  {BENCHMARKING_FOCUS_OPTIONS.map((opt) => {
                    const active = selectedBenchmarkingFocus.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setSelectedBenchmarkingFocus((prev) =>
                            prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs text-left ${
                          active
                            ? "border-[#3c2a6a] bg-[#3c2a6a] text-[#fdfbf1]"
                            : "border-[rgba(60,42,106,0.25)] bg-white text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                  {selectedBenchmarkingFocus.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        const label = selectedBenchmarkingFocus.join(", ");
                        await sendMessage(
                          `For benchmarking, I'd like to focus on these sections: ${label}.`
                        );
                        setSelectedBenchmarkingFocus([]);
                      }}
                      className="mt-1 rounded-lg border-2 border-[#3c2a6a] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#3c2a6a] shadow-sm hover:bg-[#3c2a6a] hover:text-white transition"
                    >
                      Confirm focus areas
                    </button>
                  )}
                </div>
              )}
              {showActionPreferenceChoices && (
                <div className="flex flex-col gap-1">
                  {ACTION_PREFERENCE_OPTIONS.map((opt) => {
                    const active = selectedActions.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setSelectedActions((prev) =>
                            prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs text-left ${
                          active
                            ? "border-[#3c2a6a] bg-[#3c2a6a] text-[#fdfbf1]"
                            : "border-[rgba(60,42,106,0.25)] bg-white text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                  {selectedActions.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        const label = selectedActions.join(", ");
                        await sendMessage(
                          `When it comes to actions, I prefer: ${label}.`
                        );
                        setSelectedActions([]);
                      }}
                      className="mt-1 rounded-lg border-2 border-[#3c2a6a] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#3c2a6a] shadow-sm hover:bg-[#3c2a6a] hover:text-white transition"
                    >
                      Confirm action preferences
                    </button>
                  )}
                </div>
              )}
              {showSignalChoices && (
                <div className="flex flex-col gap-1">
                  {SIGNAL_OPTIONS.map((opt) => {
                    const index = rankedSignals.indexOf(opt);
                    const active = index !== -1;
                    const label = active ? `${index + 1}. ${opt}` : opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setRankedSignals((prev) =>
                            prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs text-left ${
                          active
                            ? "border-[#3c2a6a] bg-[#3c2a6a] text-[#fdfbf1]"
                            : "border-[rgba(60,42,106,0.25)] bg-white text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                        }`}
                        title={SIGNAL_DESCRIPTIONS[opt]}
                      >
                        {label}
                      </button>
                    );
                  })}
                  {rankedSignals.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        const ordered = rankedSignals
                          .map((s, idx) => `${idx + 1}. ${s}`)
                          .join(" | ");
                        await sendMessage(
                          `Here is how I'd rank the signals from highest to lowest priority: ${ordered}.`
                        );
                        setRankedSignals([]);
                      }}
                      className="mt-1 rounded-lg border-2 border-[#3c2a6a] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#3c2a6a] shadow-sm hover:bg-[#3c2a6a] hover:text-white transition"
                    >
                      Confirm signal ranking
                    </button>
                  )}
                </div>
              )}
              {showNotificationMatrix && (
                <div className="flex flex-col gap-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-[#3c2a6a]">
                      <thead>
                        <tr>
                          <th className="px-2 py-1 text-left"></th>
                          {NOTIFICATION_MEDIA_OPTIONS.map((media) => (
                            <th key={media} className="px-2 py-1 text-center font-medium">
                              {media}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {NOTIFICATION_TYPE_OPTIONS.map((notif) => (
                          <tr key={notif} className="border-t border-[rgba(60,42,106,0.1)]">
                            <td className="px-2 py-1 font-medium">{notif}</td>
                            {NOTIFICATION_MEDIA_OPTIONS.map((media) => {
                              const current = notificationMatrix[notif] ?? [];
                              const active = current.includes(media);
                              return (
                                <td key={media} className="px-2 py-1 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setNotificationMatrix((prev) => {
                                        const existing = prev[notif] ?? [];
                                        const nextForNotif = existing.includes(media)
                                          ? existing.filter((m) => m !== media)
                                          : [...existing, media];
                                        return { ...prev, [notif]: nextForNotif };
                                      })
                                    }
                                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[10px] ${
                                      active
                                        ? "border-[#3c2a6a] bg-[#3c2a6a] text-[#fdfbf1]"
                                        : "border-[rgba(60,42,106,0.25)] bg-white text-[#3c2a6a]"
                                    }`}
                                  >
                                    {active ? "✓" : ""}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {Object.values(notificationMatrix).some((arr) => (arr ?? []).length > 0) && (
                    <button
                      type="button"
                      onClick={async () => {
                        const parts = NOTIFICATION_TYPE_OPTIONS.map((notif) => {
                          const media = notificationMatrix[notif] ?? [];
                          if (!media.length) return null;
                          const label = media.join(" and ");
                          return `${notif} via ${label}`;
                        }).filter(Boolean) as string[];
                        const summary =
                          parts.length > 0
                            ? parts.join("; ")
                            : "No notifications selected.";
                        await sendMessage(
                          `For notifications, I'd like: ${summary}.`
                        );
                        setNotificationMatrix({});
                      }}
                      className="mt-1 self-start rounded-lg border-2 border-[#3c2a6a] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#3c2a6a] shadow-sm hover:bg-[#3c2a6a] hover:text-white transition"
                    >
                      Confirm notification settings
                    </button>
                  )}
                </div>
              )}
              {showWritingStyleChoices && (
                <div className="flex flex-col gap-1">
                  {WRITING_STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        sendMessage(
                          opt === "Create your own style"
                            ? "I'd like to create my own writing style. I'll share a sample next."
                            : `I'd prefer the "${opt}" writing style.`
                        )
                      }
                      className="flex w-full items-center justify-between rounded-xl border border-[rgba(60,42,106,0.25)] bg-white px-3 py-2 text-xs text-left text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {showLinkChoices && (
                <div className="flex flex-col gap-1">
                  {["Yes", "No"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        sendMessage(
                          opt === "Yes"
                            ? "Yes, I'd like you to link my WhatsApp and Email."
                            : "No, I don't want to link WhatsApp and Email right now."
                        )
                      }
                      className="flex w-full items-center justify-between rounded-xl border border-[rgba(60,42,106,0.25)] bg-white px-3 py-2 text-xs text-left text-[#3c2a6a] hover:bg-[#3c2a6a]/5"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!(showFunctionChoices ||
            showIndustryPrompt ||
            showExperienceChoices ||
            showCommitmentChoices ||
            showWorkModeChoices ||
            showLocationChoices ||
            showBenchmarkingFocusChoices ||
            showActionPreferenceChoices ||
            showSignalChoices ||
            showWritingStyleChoices ||
            showLinkChoices ||
            showNotificationMatrix) && (
            <div className="flex items-center gap-2">
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
          )}
        </div>
      </div>
    </div>
  );
}
