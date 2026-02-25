"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type ParsedCV } from "@/app/actions/cv-parser";

type SuccessPattern = {
  common_previous_roles: string[];
  top_skills_delta: string[];
  avg_tenure_in_previous_step: number;
  impact_keyword_density: number;
};

type GapResult = {
  missing_golden_step_roles: string[];
  impact_gap_ratio: number;
  skill_gap: {
    technical: string[];
    soft: string[];
  };
};

const MOCK_PATTERN: SuccessPattern = {
  common_previous_roles: [
    "Investment Banking Analyst",
    "Strategy Analyst",
    "Senior Business Analyst",
  ],
  top_skills_delta: [
    "financial modeling",
    "sql",
    "excel",
    "powerpoint",
    "market research",
    "stakeholder management",
    "presentation skills",
  ],
  avg_tenure_in_previous_step: 2.1,
  impact_keyword_density: 0.12,
};

const TECH_KEYWORDS = ["python", "r", "sql", "excel", "power bi", "tableau", "javascript", "java"];
const SOFT_KEYWORDS = [
  "leadership",
  "communication",
  "teamwork",
  "stakeholder management",
  "presentation",
  "client",
];

function computeImpactDensity(text: string): number {
  if (!text.trim()) return 0;
  const tokens = text.replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (!tokens.length) return 0;
  const impactful = tokens.filter(
    (t) => /[0-9]/.test(t) || t.includes("%") || t.includes("$"),
  );
  return impactful.length / tokens.length;
}

function analyzeGap(cv: string, pattern: SuccessPattern): GapResult {
  const lower = cv.toLowerCase();

  const missingRoles = pattern.common_previous_roles.filter(
    (r) => !lower.includes(r.toLowerCase()),
  );

  const userImpact = computeImpactDensity(cv);
  const impactGap =
    pattern.impact_keyword_density > 0
      ? userImpact / pattern.impact_keyword_density
      : 1;

  const patternSkills = pattern.top_skills_delta.map((s) => s.toLowerCase());
  const missingSkills = patternSkills.filter((s) => !lower.includes(s));

  const technical: string[] = [];
  const soft: string[] = [];

  for (const s of missingSkills) {
    if (TECH_KEYWORDS.some((k) => s.includes(k))) {
      technical.push(s);
    } else if (SOFT_KEYWORDS.some((k) => s.includes(k))) {
      soft.push(s);
    }
  }

  if (!technical.length) technical.push(...missingSkills.slice(0, 5));

  return {
    missing_golden_step_roles: missingRoles,
    impact_gap_ratio: impactGap,
    skill_gap: {
      technical: technical.slice(0, 5),
      soft: soft.slice(0, 5),
    },
  };
}

interface DiscoverySectionProps {
  parsed: ParsedCV | null;
}

export function DiscoverySection({ parsed }: DiscoverySectionProps) {
  const [targetRole, setTargetRole] = useState("Business Analyst");
  const [targetCompany, setTargetCompany] = useState("McKinsey & Company");
  const [pattern, setPattern] = useState<SuccessPattern | null>(null);
  const [topProfiles, setTopProfiles] = useState<
    { full_name: string; current_occupation: string; golden_step?: string }[]
  >([]);
  const [gap, setGap] = useState<GapResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!parsed) return;

    const syntheticCvText = [
      parsed.name,
      parsed.university,
      parsed.gpa,
      parsed.skills.join(" "),
      parsed.internships.join(" "),
      parsed.leadership_positions ?? "",
      parsed.projects ?? "",
      parsed.others ?? "",
      String(parsed.entrepreneurial_leadership ?? ""),
      String(parsed.personal_impact ?? ""),
    ]
      .filter(Boolean)
      .join(" \n ");

    setRunning(true);
    setError(null);
    setGap(null);

    try {
      const resp = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          targetCompany,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `Discovery API failed with ${resp.status}`);
      }

      const data = (await resp.json()) as {
        profiles: {
          full_name: string;
          current_occupation: string;
          experience_history: { title: string; company: string }[];
        }[];
        pattern: SuccessPattern;
      };

      setPattern(data.pattern);
      setTopProfiles(
        data.profiles.slice(0, 5).map((p) => ({
          full_name: p.full_name,
          current_occupation: p.current_occupation,
          golden_step: p.experience_history?.[1]
            ? `${p.experience_history[1].company} – ${p.experience_history[1].title}`
            : undefined,
        }))
      );

      const result = analyzeGap(syntheticCvText, data.pattern);
      setGap(result);
    } catch (e: any) {
      setError(e?.message || "Discovery failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="overflow-hidden border-none bg-transparent shadow-none">
      <CardHeader className="bg-transparent pb-4">
        <CardTitle className="flex items-center gap-2 font-serif text-xl font-semibold text-[#3C2A6A]">
          Discovery Engine
        </CardTitle>
        <CardDescription className="text-sm text-slate-700">
          Run a pattern scan on real profiles for your target path, then compare it to
          your extracted CV.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="target-role"
              className="text-xs uppercase tracking-wide text-slate-600"
            >
              Target role
            </Label>
            <Input
              id="target-role"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Business Analyst"
              className="h-9 rounded-full border border-[#3C2A6A]/15 bg-[#FDFBF1] text-sm focus-visible:ring-[#3C2A6A]"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="target-company"
              className="text-xs uppercase tracking-wide text-slate-600"
            >
              Target company
            </Label>
            <Input
              id="target-company"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              placeholder="e.g. McKinsey & Company"
              className="h-9 rounded-full border border-[#3C2A6A]/15 bg-[#FDFBF1] text-sm focus-visible:ring-[#3C2A6A]"
            />
          </div>
        </div>

        <Button
          onClick={handleRun}
          disabled={running || !parsed}
          className="mt-1 rounded-full bg-[#3C2A6A] px-5 py-2 text-xs font-medium text-[#FDFBF1] shadow-none transition-transform hover:-translate-y-0.5 hover:bg-[#4a347f] disabled:opacity-60"
        >
          {running ? "Analyzing…" : "Run Discovery from extracted CV"}
        </Button>

        {!parsed && (
          <p className="text-sm text-muted-foreground">
            Upload and analyze a CV above to enable discovery.
          </p>
        )}

        {error && (
          <p className="text-xs text-red-700">
            {error}
          </p>
        )}

        {(pattern || gap) && (
          <div className="mt-8 grid gap-5 md:grid-cols-2 animate-in fade-in-50 slide-in-from-bottom-2">
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-none">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-[#3C2A6A]">
                Success pattern snapshot
              </h3>
              {pattern && (
                <>
                  <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Avg time in prior step
                      </p>
                      <p className="font-medium text-[#3C2A6A]">
                        {pattern.avg_tenure_in_previous_step.toFixed(1)} yrs
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Impact density
                      </p>
                      <p className="font-medium text-[#3C2A6A]">
                        {(pattern.impact_keyword_density * 100).toFixed(1)}%
                      </p>
                      <div className="h-1.5 w-full rounded-full bg-[#3C2A6A]/10">
                        <div
                          className="h-1.5 rounded-full bg-[#3C2A6A]"
                          style={{
                            width: `${Math.min(
                              100,
                              pattern.impact_keyword_density * 160
                            ).toFixed(0)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Sample size
                      </p>
                      <p className="font-medium text-[#3C2A6A]">
                        {topProfiles.length || "~"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-medium text-slate-600">
                      Common previous roles
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pattern.common_previous_roles.length
                        ? pattern.common_previous_roles.map((role) => (
                            <span
                              key={role}
                              className="rounded-full bg-[#3C2A6A]/5 px-3 py-1 text-[11px] font-medium text-[#3C2A6A]"
                            >
                              {role}
                            </span>
                          ))
                        : "Not enough data"}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-medium text-slate-600">
                      Pattern skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pattern.top_skills_delta.slice(0, 10).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-[#3C2A6A]/15 bg-[#3C2A6A]/3 px-3 py-1 text-[11px] text-[#3C2A6A]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {topProfiles.length > 0 && (
                <div className="space-y-1">
                  <p className="mt-3 text-[11px] font-medium text-slate-600">
                    Sample top profiles
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-800">
                    {topProfiles.map((p) => (
                      <li key={p.full_name}>
                        <span className="font-medium">{p.full_name}</span>{" "}
                        — {p.current_occupation}
                        {p.golden_step && (
                          <span className="text-muted-foreground">
                            {" "}
                            (previous: {p.golden_step})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {gap && (
              <div className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-none">
                <h3 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-[#3C2A6A]">
                  Your gap analysis
                </h3>
                <p className="text-xs">
                  <span className="font-medium text-slate-700">
                    Missing “golden step” roles:
                  </span>{" "}
                  {gap.missing_golden_step_roles.length
                    ? gap.missing_golden_step_roles.join(", ")
                    : "None explicitly missing."}
                </p>
                <p className="text-xs">
                  <span className="font-medium text-slate-700">
                    Impact intensity vs pattern:
                  </span>{" "}
                  {gap.impact_gap_ratio >= 1
                    ? "On par or stronger."
                    : `${(gap.impact_gap_ratio * 100).toFixed(0)}% of target profiles' density.`}
                </p>
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-medium text-slate-600">
                    Technical skill gaps
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                  {gap.skill_gap.technical.length
                      ? gap.skill_gap.technical.map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-[#3C2A6A]/20 bg-transparent px-3 py-1 text-[11px] text-[#3C2A6A]"
                          >
                            {s}
                          </span>
                        ))
                      : "None detected."}
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-medium text-slate-600">
                    Soft skill gaps
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                  {gap.skill_gap.soft.length
                      ? gap.skill_gap.soft.map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-[#3C2A6A]/20 bg-[#3C2A6A]/5 px-3 py-1 text-[11px] text-[#3C2A6A]"
                          >
                            {s}
                          </span>
                        ))
                      : "None detected."}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

