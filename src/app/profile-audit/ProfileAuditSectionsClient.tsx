"use client";

import { useMemo, useState } from "react";
import { DiscoverySection } from "@/app/dashboard/discovery-section";
import { StrategyAgentMockClient } from "@/app/dashboard/strategy-agent/StrategyAgentMockClient";

type TabKey = "profile_audit" | "strategy_agent";

export function ProfileAuditSectionsClient() {
  const [tab, setTab] = useState<TabKey>("profile_audit");

  const tabs = useMemo(
    () =>
      [
        { key: "profile_audit" as const, label: "Profile Audit" },
        { key: "strategy_agent" as const, label: "Strategy Agent" },
      ] satisfies { key: TabKey; label: string }[],
    []
  );

  return (
    <div className="flex flex-col gap-5">
      <nav className="flex items-end gap-8 border-b border-[rgba(60,42,106,0.18)] px-1">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                active ? "text-[#3c2a6a]" : "text-[rgba(60,42,106,0.55)]"
              }`}
            >
              {t.label}
              {active && (
                <span className="absolute bottom-[-1px] left-0 h-[3px] w-full rounded-full bg-[#3c2a6a]" />
              )}
            </button>
          );
        })}
      </nav>

      {tab === "profile_audit" ? (
        <DiscoverySection />
      ) : (
        <div className="rounded-3xl border border-[rgba(60,42,106,0.12)] bg-white/70 p-4">
          <StrategyAgentMockClient embedded />
        </div>
      )}
    </div>
  );
}

