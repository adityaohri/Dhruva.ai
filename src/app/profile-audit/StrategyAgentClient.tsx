"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  toolCta?: "opportunity-discovery" | "outreach-copilot";
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

function safeArr(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string")
    return v
      .split(/[\n,|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

function tasksFromGapAnalysis(gapAnalysis: any): StrategyTask[] {
  const parsed = gapAnalysis && typeof gapAnalysis === "object" ? gapAnalysis : null;
  if (!parsed) return [];

  const actions = safeArr(parsed.concreteActions).slice(0, 12);
  const tasks: StrategyTask[] = actions.map((a, idx) => {
    const lower = a.toLowerCase();
    let toolCta: StrategyTask["toolCta"] | undefined = undefined;
    if (/(apply|intern|opening|shortlist|job)/i.test(lower)) toolCta = "opportunity-discovery";
    if (/(reach out|outreach|network|referral|alumni|dm|cold)/i.test(lower)) toolCta = "outreach-copilot";
    return {
      id: `ga-${idx + 1}`,
      title: a.length > 70 ? `${a.slice(0, 70).trim()}…` : a,
      description: a,
      toolCta,
    };
  });

  // If no concreteActions are present, fall back to skill gaps.
  if (tasks.length === 0 && parsed.skillGaps) {
    const tech = safeArr(parsed.skillGaps.missingTechnical).slice(0, 8);
    return tech.map((t, idx) => ({
      id: `sg-${idx + 1}`,
      title: `Close skill gap: ${t}`,
      description: `Build evidence for "${t}" with a project or measurable output aligned to your target role.`,
    }));
  }

  return tasks;
}

export function StrategyAgentClient() {
  const [audit, setAudit] = useState<StoredAudit | null>(null);

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
    } catch {
      setAudit(null);
    }
  }, []);

  const tasks = useMemo(() => tasksFromGapAnalysis(audit?.gapAnalysis), [audit]);

  if (!audit) {
    return (
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
    );
  }

  const company = audit.targetCompany?.trim();
  const role = audit.targetRole?.trim();

  return (
    <div className="flex flex-col gap-4">
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

        {tasks.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-[rgba(60,42,106,0.12)] bg-[#fdfbf6] px-4 py-3 text-sm text-[rgba(60,42,106,0.85)]">
            We couldn&apos;t find concrete actions in the gap analysis payload yet. Run another audit,
            or enable concrete actions in the gap-analysis response.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-[rgba(60,42,106,0.1)] bg-[#fdfbf6] p-4"
              >
                <p className="font-serif text-base font-semibold text-[#3c2a6a]">
                  {t.title}
                </p>
                <p className="mt-1 text-sm text-[rgba(60,42,106,0.75)]">
                  {t.description}
                </p>
                {t.toolCta && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.toolCta === "opportunity-discovery" ? (
                      <Link
                        href={`/opportunity?role=${encodeURIComponent(role || "")}&company=${encodeURIComponent(
                          company || ""
                        )}&industry=${encodeURIComponent(audit.targetIndustry || "")}`}
                        className="rounded-full bg-[#3c2a6a] px-4 py-2 text-[11px] font-medium text-[#fdfbf1]"
                      >
                        Launch Discovery
                      </Link>
                    ) : (
                      <Link
                        href={`/outreach?company=${encodeURIComponent(company || "")}`}
                        className="rounded-full bg-[#3c2a6a] px-4 py-2 text-[11px] font-medium text-[#fdfbf1]"
                      >
                        Draft with Copilot
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

