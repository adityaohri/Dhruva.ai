"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

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

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

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
            messages: messages,
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

        // If Claude returned structured profile updates, persist them to user_profiles
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
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
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
        </div>
      </main>
    </div>
  );
}

