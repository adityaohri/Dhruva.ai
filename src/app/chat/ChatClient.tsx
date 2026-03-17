"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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

const INDUSTRY_OPTIONS = [
  "Consulting",
  "Investing / PE / VC",
  "Startups",
  "Big Tech",
  "Fintech",
  "SaaS",
  "Manufacturing",
  "FMCG",
  "Others",
] as const;

const EXPERIENCE_OPTIONS = [
  "Entry Level",
  "0-3 Years of Experience",
  "3+ Years of Experience",
] as const;

const COMMITMENT_OPTIONS = ["Full Time", "Part Time", "Internship"] as const;

const WORK_MODE_OPTIONS = ["Remote", "Hybrid", "In-Office"] as const;

const LOCATION_OPTIONS = [
  "Gurugram",
  "Mumbai",
  "Bengaluru",
  "Kolkata",
  "Chennai",
  "Others",
] as const;

type Message = {
  role: "user" | "assistant";
  content: string;
};

type McqMode =
  | null
  | "function"
  | "industry"
  | "experience"
  | "commitment"
  | "workMode"
  | "location";

export function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm Dhruva. You can ask me anything about your profile, opportunities, or how the platform works.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [mcqMode, setMcqMode] = useState<McqMode>(null);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  // Detect canonical onboarding questions from the assistant and show MCQ box
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") {
      setMcqMode(null);
      return;
    }
    const text = last.content.toLowerCase();
    if (text.includes("what function do you want to work in?")) {
      setMcqMode("function");
      return;
    }
    if (text.includes("which industry do you want to work in?")) {
      setMcqMode("industry");
      return;
    }
    if (text.includes("what's your experience level?")) {
      setMcqMode("experience");
      return;
    }
    if (text.includes("what commitment type are you looking for?")) {
      setMcqMode("commitment");
      return;
    }
    if (text.includes("what work mode do you prefer?")) {
      setMcqMode("workMode");
      return;
    }
    if (text.includes("any preferred locations?")) {
      setMcqMode("location");
      return;
    }
    setMcqMode(null);
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      const userText = text.trim();
      setMessages((prev) => [...prev, { role: "user", content: userText }]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            userMessage: userText,
          }),
        });

        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Something went wrong while talking to Dhruva. Please try again in a moment.",
            },
          ]);
          setIsLoading(false);
          return;
        }

        const data = (await res.json()) as {
          reply: string;
          profileUpdates?: Record<string, unknown>;
        };

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);

        // Persist any structured profile updates to user_profiles
        if (data.profileUpdates && Object.keys(data.profileUpdates).length > 0) {
          try {
            await fetch("/api/profile/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ updates: data.profileUpdates }),
            });
          } catch {
            // Silent fail; chat still works even if profile update fails
          }
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I couldn't reach the server just now. Please check your connection and try again.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMessage(text);
  }, [input, sendMessage]);

  return (
    <div className="flex min-h-screen flex-col bg-[#fdfbf1]">
      <header className="border-b border-[rgba(60,42,106,0.08)] bg-[#fdfbf1] px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="font-serif text-lg font-semibold text-[#3c2a6a]">
            Talk to Dhruva
          </h1>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 py-4">
        <div className="flex w-full max-w-3xl flex-col rounded-2xl border border-[rgba(60,42,106,0.08)] bg-white/80">
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-[#3c2a6a] text-[#fdfbf1]"
                      : "border border-[rgba(60,42,106,0.12)] bg-white text-[#3c2a6a]"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-[rgba(60,42,106,0.1)] bg-white px-4 py-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-[#3c2a6a]" />
                  <span className="text-xs text-[rgba(60,42,106,0.7)]">
                    Dhruva is thinking…
                  </span>
                </div>
              </div>
            )}
          </div>

          {mcqMode ? (
            <div className="border-t border-[rgba(60,42,106,0.08)] bg-[#fdfbf1] px-4 py-3">
              <div className="mx-auto flex max-w-3xl flex-col gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[rgba(60,42,106,0.6)]">
                  Quick selection
                </p>
                <p className="text-sm font-semibold text-[#3c2a6a]">
                  {mcqMode === "function" && "What function do you want to work in?"}
                  {mcqMode === "industry" && "Which industry do you want to work in?"}
                  {mcqMode === "experience" && "What's your experience level?"}
                  {mcqMode === "commitment" &&
                    "What commitment type are you looking for?"}
                  {mcqMode === "workMode" && "What work mode do you prefer?"}
                  {mcqMode === "location" && "Any preferred locations?"}
                </p>

                {mcqMode === "function" && (
                  <div className="flex flex-wrap gap-2">
                    {FUNCTION_OPTIONS.map((opt) => {
                      const selected = selectedFunctions.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setSelectedFunctions((prev) =>
                              prev.includes(opt)
                                ? prev.filter((v) => v !== opt)
                                : [...prev, opt]
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${
                            selected
                              ? "border-[#3c2a6a] bg-[#3c2a6a] text-[#fdfbf1]"
                              : "border-[rgba(60,42,106,0.25)] bg-white text-[#3c2a6a]"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={selectedFunctions.length === 0 || isLoading}
                      onClick={async () => {
                        const answer = `I want to work in: ${selectedFunctions.join(
                          ", "
                        )}.`;
                        setSelectedFunctions([]);
                        setMcqMode(null);
                        await sendMessage(answer);
                      }}
                      className="ml-auto rounded-full bg-[#3c2a6a] px-4 py-1.5 text-xs font-medium text-[#fdfbf1] disabled:opacity-50"
                    >
                      Confirm selection
                    </button>
                  </div>
                )}

                {mcqMode === "industry" && (
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRY_OPTIONS.map((opt) => {
                      const selected = selectedIndustries.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setSelectedIndustries((prev) =>
                              prev.includes(opt)
                                ? prev.filter((v) => v !== opt)
                                : [...prev, opt]
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${
                            selected
                              ? "border-[#3c2a6a] bg-[#3c2a6a] text-[#fdfbf1]"
                              : "border-[rgba(60,42,106,0.25)] bg-white text-[#3c2a6a]"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={selectedIndustries.length === 0 || isLoading}
                      onClick={async () => {
                        const answer = `I'm interested in industries: ${selectedIndustries.join(
                          ", "
                        )}.`;
                        setSelectedIndustries([]);
                        setMcqMode(null);
                        await sendMessage(answer);
                      }}
                      className="ml-auto rounded-full bg-[#3c2a6a] px-4 py-1.5 text-xs font-medium text-[#fdfbf1] disabled:opacity-50"
                    >
                      Confirm selection
                    </button>
                  </div>
                )}

                {mcqMode === "experience" && (
                  <div className="flex flex-wrap gap-2">
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={async () => {
                          setMcqMode(null);
                          await sendMessage(`My experience level is: ${opt}.`);
                        }}
                        className="rounded-full border border-[rgba(60,42,106,0.25)] bg-white px-3 py-1 text-xs text-[#3c2a6a]"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {mcqMode === "commitment" && (
                  <div className="flex flex-wrap gap-2">
                    {COMMITMENT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={async () => {
                          setMcqMode(null);
                          await sendMessage(`I'm looking for: ${opt}.`);
                        }}
                        className="rounded-full border border-[rgba(60,42,106,0.25)] bg-white px-3 py-1 text-xs text-[#3c2a6a]"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {mcqMode === "workMode" && (
                  <div className="flex flex-wrap gap-2">
                    {WORK_MODE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={async () => {
                          setMcqMode(null);
                          await sendMessage(`I prefer: ${opt} work.`);
                        }}
                        className="rounded-full border border-[rgba(60,42,106,0.25)] bg-white px-3 py-1 text-xs text-[#3c2a6a]"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {mcqMode === "location" && (
                  <div className="flex flex-wrap gap-2">
                    {LOCATION_OPTIONS.map((opt) => {
                      const selected = selectedLocations.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setSelectedLocations((prev) =>
                              prev.includes(opt)
                                ? prev.filter((v) => v !== opt)
                                : [...prev, opt]
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${
                            selected
                              ? "border-[#3c2a6a] bg-[#3c2a6a] text-[#fdfbf1]"
                              : "border-[rgba(60,42,106,0.25)] bg-white text-[#3c2a6a]"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={selectedLocations.length === 0 || isLoading}
                      onClick={async () => {
                        const answer = `My preferred locations are: ${selectedLocations.join(
                          ", "
                        )}.`;
                        setSelectedLocations([]);
                        setMcqMode(null);
                        await sendMessage(answer);
                      }}
                      className="ml-auto rounded-full bg-[#3c2a6a] px-4 py-1.5 text-xs font-medium text-[#fdfbf1] disabled:opacity-50"
                    >
                      Confirm selection
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border-t border-[rgba(60,42,106,0.08)] bg-[#fdfbf1] px-4 py-3">
              <div className="flex items-center gap-2">
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
                  placeholder="Ask Dhruva anything…"
                  className="flex-1 rounded-full border border-[rgba(60,42,106,0.15)] bg-white px-4 py-2 text-sm text-[#3c2a6a] placeholder:text-[rgba(60,42,106,0.4)] focus:outline-none focus:ring-2 focus:ring-[#3c2a6a]/20"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="rounded-full bg-[#3c2a6a] px-4 py-2 text-sm font-medium text-[#fdfbf1] disabled:opacity-50 hover:bg-[#4b3786]"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

