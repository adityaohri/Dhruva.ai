"use client";

import { useMemo, useState } from "react";
import { DiscoverySection } from "@/app/dashboard/discovery-section";
import { StrategyAgentClient } from "./StrategyAgentClient";

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
        <div className="flex flex-col gap-5">
          <section className="rounded-3xl border border-[rgba(60,42,106,0.18)] bg-white/90 px-5 py-4">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-[rgba(60,42,106,0.7)]">
              HOW TO USE THIS WORKSPACE
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-[rgba(60,42,106,0.8)]">
              <li>
                We use the CV and profile information you shared during the onboarding chat as the
                base for your benchmarking.
              </li>
              <li>Set a target role, company, and industry in the Discovery Engine below.</li>
              <li>
                Study the real profiles and the gap analysis to sharpen your next career move.
              </li>
              <li>
                Use these insights to co-create a concrete plan with Dhruva that moves you closer
                to the roles you&apos;re targeting.
              </li>
            </ol>
          </section>
          <DiscoverySection />
        </div>
      ) : (
        <StrategyAgentClient />
      )}
    </div>
  );
}

