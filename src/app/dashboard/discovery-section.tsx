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
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2">
          Discovery Engine
        </CardTitle>
        <CardDescription>
          Explore success patterns for a target role and see how your CV compares.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="target-role">Target role</Label>
            <Input
              id="target-role"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Business Analyst"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-company">Target company</Label>
            <Input
              id="target-company"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              placeholder="e.g. McKinsey & Company"
            />
          </div>
        </div>

        <Button onClick={handleRun} disabled={running || !parsed}>
          {running ? "Analyzing…" : "Run Discovery from extracted CV"}
        </Button>

        {!parsed && (
          <p className="text-sm text-muted-foreground">
            Upload and analyze a CV above to enable discovery.
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive">
            {error}
          </p>
        )}

        {(pattern || gap) && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border bg-card p-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Success pattern snapshot
              </h3>
              {pattern && (
                <>
                  <p className="text-sm">
                    <span className="font-medium">Common previous roles: </span>
                    {pattern.common_previous_roles.join(", ") || "Not enough data"}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Avg tenure in previous step: </span>
                    {pattern.avg_tenure_in_previous_step.toFixed(1)} years
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Impact keyword density: </span>
                    {(pattern.impact_keyword_density * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Top pattern skills: </span>
                    {pattern.top_skills_delta.join(", ") || "Not enough data"}
                  </p>
                </>
              )}
              {topProfiles.length > 0 && (
                <div className="space-y-1">
                  <p className="font-medium text-sm mt-2">Sample top profiles</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
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
              <div className="space-y-2 rounded-lg border bg-card p-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Your gap analysis
                </h3>
                <p className="text-sm">
                  <span className="font-medium">Missing “golden step” roles: </span>
                  {gap.missing_golden_step_roles.length
                    ? gap.missing_golden_step_roles.join(", ")
                    : "None explicitly missing."}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Impact intensity vs pattern: </span>
                  {gap.impact_gap_ratio >= 1
                    ? "On par or stronger."
                    : `${(gap.impact_gap_ratio * 100).toFixed(0)}% of target profiles' density.`}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Technical skill gaps: </span>
                  {gap.skill_gap.technical.length
                    ? gap.skill_gap.technical.join(", ")
                    : "None detected."}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Soft skill gaps: </span>
                  {gap.skill_gap.soft.length
                    ? gap.skill_gap.soft.join(", ")
                    : "None detected."}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

