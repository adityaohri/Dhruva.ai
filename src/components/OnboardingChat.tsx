"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowUp, Paperclip } from "lucide-react";

const FIRST_MESSAGE =
  "Hi! I'm Dhruva. I'm going to ask you a few questions to personalise your experience. Let's start — please upload your CV or paste your LinkedIn URL, whichever is more comprehensive.";

type Message = { role: "user" | "assistant"; content: string };

export function OnboardingChat({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: FIRST_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown>>({});

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

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
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
        const err = await res.json().catch(() => ({}));
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

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      const updates = data.profileUpdates ?? {};
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
  }, [input, isLoading, messages, profile, userId, router, saveProfile, supabase]);

  return (
    <div className="flex h-screen flex-col bg-[#fdfbf1] overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-[rgba(60,42,106,0.08)] bg-[#fdfbf1] px-4 py-3">
        <Link href="/" className="font-serif text-lg font-semibold text-[#3c2a6a]">
          dhruva.ai
        </Link>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-sm text-[rgba(60,42,106,0.4)] hover:underline"
        >
          Skip for now
        </button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "assistant"
                  ? "border border-[rgba(60,42,106,0.1)] bg-white text-[#3c2a6a]"
                  : "bg-[#3c2a6a] text-[#fdfbf1]"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
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
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#3c2a6a] hover:bg-[rgba(60,42,106,0.08)]"
            aria-label="Upload file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
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
