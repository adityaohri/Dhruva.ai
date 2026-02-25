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

type PublicProfile = {
  full_name: string;
  linkedin_url: string | null;
};

interface DiscoverySectionProps {
  parsed: ParsedCV | null;
}

export function DiscoverySection({ parsed }: DiscoverySectionProps) {
  const [targetRole, setTargetRole] = useState("Business Analyst");
  const [targetCompany, setTargetCompany] = useState("McKinsey & Company");
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<any | null>(null);
  const [runningProfiles, setRunningProfiles] = useState(false);
  const [runningGap, setRunningGap] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!parsed) return;

    setError(null);
    setGapAnalysis(null);
    setProfiles([]);
    setRunningProfiles(true);
    setRunningGap(false);

    try {
      // Phase 1: Fiber – get target profiles (names + LinkedIn URLs)
      const fiberResp = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          targetCompany,
          phase: "fiber",
        }),
      });

      if (!fiberResp.ok) {
        const body = await fiberResp.json().catch(() => ({}));
        throw new Error(
          body.error || `Discovery API (Fiber) failed with ${fiberResp.status}`
        );
      }

      const fiberData = (await fiberResp.json()) as {
        profiles: PublicProfile[];
      };
      setProfiles(fiberData.profiles || []);
      setRunningProfiles(false);

      // Phase 2: OpenAI gap analysis
      setRunningGap(true);

      const gapResp = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          targetCompany,
          phase: "gap",
        }),
      });

      if (!gapResp.ok) {
        const body = await gapResp.json().catch(() => ({}));
        throw new Error(
          body.error || `Discovery API (gap) failed with ${gapResp.status}`
        );
      }

      const gapData = (await gapResp.json()) as {
        gapAnalysis: any;
        profiles?: PublicProfile[];
      };

      if (gapData.profiles && gapData.profiles.length) {
        setProfiles(gapData.profiles);
      }
      setGapAnalysis(gapData.gapAnalysis || null);
    } catch (e: any) {
      setError(e?.message || "Discovery failed");
    } finally {
      setRunningProfiles(false);
      setRunningGap(false);
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
          disabled={runningProfiles || runningGap || !parsed}
          className="mt-1 rounded-full bg-[#3C2A6A] px-5 py-2 text-xs font-medium text-[#FDFBF1] shadow-none transition-transform hover:-translate-y-0.5 hover:bg-[#4a347f] disabled:opacity-60"
        >
          {runningProfiles || runningGap
            ? "Analyzing…"
            : "Run Discovery from extracted CV"}
        </Button>

        {!parsed && (
          <p className="text-sm text-muted-foreground">
            Upload and analyze a CV above to enable discovery.
          </p>
        )}

        {error && <p className="text-xs text-red-700">{error}</p>}

        {(profiles.length > 0 || gapAnalysis) && (
          <div className="mt-8 grid gap-5 md:grid-cols-2 animate-in fade-in-50 slide-in-from-bottom-2">
            {/* Left: target profiles list */}
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-none">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-[#3C2A6A]">
                Target profiles (Fiber)
              </h3>
              {runningProfiles && (
                <p className="text-xs text-slate-600">
                  Fetching real-world profiles for this role and company…
                </p>
              )}
              {!runningProfiles && profiles.length === 0 && (
                <p className="text-xs text-slate-500">
                  No matching profiles were found yet. Try a different role or company.
                </p>
              )}
              {profiles.length > 0 && (
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-slate-800">
                  {profiles.map((p) => (
                    <li key={p.linkedin_url ?? p.full_name}>
                      <span className="font-medium">{p.full_name}</span>
                      {p.linkedin_url && (
                        <>
                          {" "}
                          —{" "}
                          <a
                            href={p.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#3C2A6A] underline underline-offset-2"
                          >
                            LinkedIn
                          </a>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Right: gap analysis */}
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-[#FDFBF1] p-5 shadow-none">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-[#3C2A6A]">
                Your gap analysis
              </h3>

              {runningGap && (
                <p className="text-xs text-slate-600">
                  Analyzing your profile against target trajectories…
                </p>
              )}

              {!runningGap && !gapAnalysis && (
                <p className="text-xs text-slate-500">
                  Run discovery to see a structured gap analysis here.
                </p>
              )}

              {!runningGap && gapAnalysis && (
                <div className="space-y-3 text-xs text-slate-800">
                  {/* GPA */}
                  {gapAnalysis.gpa && (
                    <section>
                      <p className="font-medium text-slate-700">GPA</p>
                      <p className="mt-1">{gapAnalysis.gpa.assessment}</p>
                      {Array.isArray(gapAnalysis.gpa.recommendations) &&
                        gapAnalysis.gpa.recommendations.length > 0 && (
                          <ul className="mt-1 list-disc list-inside">
                            {gapAnalysis.gpa.recommendations.map(
                              (r: string) => (
                                <li key={r}>{r}</li>
                              )
                            )}
                          </ul>
                        )}
                    </section>
                  )}

                  {/* Experience / Internships */}
                  {gapAnalysis.experience && (
                    <section>
                      <p className="font-medium text-slate-700">
                        Experience / Internships
                      </p>
                      <p className="mt-1">
                        {gapAnalysis.experience.assessment}
                      </p>
                      {Array.isArray(gapAnalysis.experience.recommendations) &&
                        gapAnalysis.experience.recommendations.length > 0 && (
                          <ul className="mt-1 list-disc list-inside">
                            {gapAnalysis.experience.recommendations.map(
                              (r: string) => (
                                <li key={r}>{r}</li>
                              )
                            )}
                          </ul>
                        )}
                    </section>
                  )}

                  {/* Leadership */}
                  {gapAnalysis.leadership && (
                    <section>
                      <p className="font-medium text-slate-700">Leadership</p>
                      <p className="mt-1">
                        {gapAnalysis.leadership.assessment}
                      </p>
                      {Array.isArray(gapAnalysis.leadership.recommendations) &&
                        gapAnalysis.leadership.recommendations.length > 0 && (
                          <ul className="mt-1 list-disc list-inside">
                            {gapAnalysis.leadership.recommendations.map(
                              (r: string) => (
                                <li key={r}>{r}</li>
                              )
                            )}
                          </ul>
                        )}
                    </section>
                  )}

                  {/* Projects */}
                  {gapAnalysis.projects && (
                    <section>
                      <p className="font-medium text-slate-700">Projects</p>
                      <p className="mt-1">
                        {gapAnalysis.projects.assessment}
                      </p>
                      {Array.isArray(gapAnalysis.projects.recommendations) &&
                        gapAnalysis.projects.recommendations.length > 0 && (
                          <ul className="mt-1 list-disc list-inside">
                            {gapAnalysis.projects.recommendations.map(
                              (r: string) => (
                                <li key={r}>{r}</li>
                              )
                            )}
                          </ul>
                        )}
                    </section>
                  )}

                  {/* Personal Impact */}
                  {gapAnalysis.personalImpact && (
                    <section>
                      <p className="font-medium text-slate-700">
                        Personal Impact
                      </p>
                      <p className="mt-1">
                        {gapAnalysis.personalImpact.assessment}
                      </p>
                      {Array.isArray(
                        gapAnalysis.personalImpact.recommendations
                      ) &&
                        gapAnalysis.personalImpact.recommendations.length >
                          0 && (
                          <ul className="mt-1 list-disc list-inside">
                            {gapAnalysis.personalImpact.recommendations.map(
                              (r: string) => (
                                <li key={r}>{r}</li>
                              )
                            )}
                          </ul>
                        )}
                    </section>
                  )}

                  {/* Skills */}
                  {gapAnalysis.skills && (
                    <section>
                      <p className="font-medium text-slate-700">Skills</p>
                      <p className="mt-1">{gapAnalysis.skills.summary}</p>
                      <div className="mt-2 space-y-1">
                        {Array.isArray(
                          gapAnalysis.skills.missingTechnical
                        ) &&
                          gapAnalysis.skills.missingTechnical.length > 0 && (
                            <p>
                              <span className="font-medium">
                                Missing technical:
                              </span>{" "}
                              {gapAnalysis.skills.missingTechnical.join(", ")}
                            </p>
                          )}
                        {Array.isArray(gapAnalysis.skills.missingSoft) &&
                          gapAnalysis.skills.missingSoft.length > 0 && (
                            <p>
                              <span className="font-medium">
                                Missing soft skills:
                              </span>{" "}
                              {gapAnalysis.skills.missingSoft.join(", ")}
                            </p>
                          )}
                      </div>
                    </section>
                  )}

                  {/* Bonus pointers */}
                  {Array.isArray(gapAnalysis.bonusPointers) &&
                    gapAnalysis.bonusPointers.length > 0 && (
                      <section>
                        <p className="font-medium text-slate-700">
                          Bonus pointers
                        </p>
                        <ul className="mt-1 list-disc list-inside">
                          {gapAnalysis.bonusPointers.map((r: string) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      </section>
                    )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

