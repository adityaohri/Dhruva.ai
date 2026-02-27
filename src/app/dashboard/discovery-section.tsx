"use client";

import { useMemo, useState } from "react";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
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
  current_title: string | null;
  current_company: string | null;
  linkedin_url: string | null;
};

interface DiscoverySectionProps {
  parsed: ParsedCV | null;
}

export function DiscoverySection({ parsed }: DiscoverySectionProps) {
  const [targetRole, setTargetRole] = useState("Business Analyst");
  const [targetCompany, setTargetCompany] = useState("McKinsey & Company");
  const [targetIndustry, setTargetIndustry] = useState("Management Consulting");
  const [targetProfiles, setTargetProfiles] = useState<PublicProfile[]>([]);
  const [similarProfiles, setSimilarProfiles] = useState<PublicProfile[]>([]);
  const [companiesSearched, setCompaniesSearched] = useState<string[]>([]);
  const [similarCompanies, setSimilarCompanies] = useState<string[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<any | null>(null);
  const [runningProfiles, setRunningProfiles] = useState(false);
  const [runningGap, setRunningGap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);

  const parsedGapAnalysis = useMemo(() => {
    if (!gapAnalysis) return null;
    let result: any = gapAnalysis;

    try {
      if (typeof result === "string") {
        const maybe = JSON.parse(result);
        if (maybe && typeof maybe === "object") {
          result = maybe;
        }
      }
    } catch {
      // ignore
    }

    if (
      result &&
      typeof result.overallSummary === "string" &&
      result.overallSummary.trim().startsWith("{")
    ) {
      try {
        const inner = JSON.parse(result.overallSummary);
        if (inner && typeof inner === "object") {
          result = inner;
        }
      } catch {
        // ignore
      }
    }

    return result;
  }, [gapAnalysis]);

  const anchorRadials = useMemo(() => {
    if (!parsedGapAnalysis?.careerAnchors) return [];
    return (parsedGapAnalysis.careerAnchors as string[]).map(
      (anchor: string, idx: number) => {
        const match = anchor.match(/(\d+)\s*%/);
        const value = match ? Number(match[1]) : 50;
        const label = anchor.replace(match?.[0] ?? "", "").trim();
        return {
          name: label || `Anchor ${idx + 1}`,
          value: isNaN(value) ? 50 : Math.max(0, Math.min(100, value)),
          raw: anchor,
        };
      }
    );
  }, [parsedGapAnalysis?.careerAnchors]);

  const handleRun = async () => {
    if (!parsed) return;

    setError(null);
    setGapAnalysis(null);
    setTargetProfiles([]);
    setSimilarProfiles([]);
    setCompaniesSearched([]);
    setSimilarCompanies([]);
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
          targetIndustry,
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
        companiesSearched: string[];
        similarCompanies: string[];
        targetProfiles: PublicProfile[];
        similarProfiles: PublicProfile[];
      };
      setCompaniesSearched(fiberData.companiesSearched || []);
      setSimilarCompanies(fiberData.similarCompanies || []);
      setTargetProfiles(fiberData.targetProfiles || []);
      setSimilarProfiles(fiberData.similarProfiles || []);
      setRunningProfiles(false);

      // Phase 2: OpenAI gap analysis
      setRunningGap(true);

      const gapResp = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          targetCompany,
          targetIndustry,
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
      };

      setGapAnalysis(gapData.gapAnalysis || null);
    } catch (e: any) {
      setError(e?.message || "Discovery failed");
    } finally {
      setRunningProfiles(false);
      setRunningGap(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!gapAnalysis) return;
    setDownloadingReport(true);
    try {
      const res = await fetch("/api/benchmark-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gapAnalysis,
          targetRole,
          targetCompany,
          targetIndustry,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to generate report");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "profile-benchmarking-report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Could not download the report. Please try again.");
    } finally {
      setDownloadingReport(false);
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
        <div className="grid gap-4 sm:grid-cols-3">
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
          <div className="space-y-2">
            <Label
              htmlFor="target-industry"
              className="text-xs uppercase tracking-wide text-slate-600"
            >
              Target industry
            </Label>
            <Input
              id="target-industry"
              value={targetIndustry}
              onChange={(e) => setTargetIndustry(e.target.value)}
              placeholder="e.g. Management consulting"
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

        {(targetProfiles.length > 0 ||
          similarProfiles.length > 0 ||
          parsedGapAnalysis) && (
          <div className="mt-8 grid gap-5 md:grid-cols-2 animate-in fade-in-50 slide-in-from-bottom-2">
            {/* Left: target profiles list */}
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-none">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-[#3C2A6A]">
                Target profiles
              </h3>
              <div className="mt-1 space-y-1 text-[10px] text-slate-600">
                {companiesSearched.length > 0 && (
                  <p>
                    <span className="font-semibold text-[#3C2A6A]">
                      Companies searched:
                    </span>{" "}
                    {companiesSearched.join(", ")}
                  </p>
                )}
                {similarCompanies.length > 0 && (
                  <p>
                    <span className="font-semibold text-[#3C2A6A]">
                      Similar companies:
                    </span>{" "}
                    {similarCompanies.join(", ")}
                  </p>
                )}
              </div>
              {runningProfiles && (
                <p className="text-xs text-slate-600">
                  Fetching real-world profiles for this role and company…
                </p>
              )}
              {!runningProfiles &&
                targetProfiles.length === 0 &&
                similarProfiles.length === 0 && (
                <p className="text-xs text-slate-500">
                  No matching profiles were found yet. Try a different role or company.
                </p>
              )}
              {targetProfiles.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-[11px] font-medium text-slate-700">
                    From target company
                  </p>
                  <ul className="space-y-1 text-xs text-slate-800">
                    {targetProfiles.map((p) => {
                      const roleLine =
                        p.current_title ||
                        p.current_company
                          ? `${p.current_title ?? "Unknown role"}${
                              p.current_company ? ` at ${p.current_company}` : ""
                            }`
                          : null;
                      return (
                        <li key={(p.linkedin_url ?? p.full_name) + "-target"}>
                          <span className="font-medium">{p.full_name}</span>
                          {roleLine && (
                            <span className="text-slate-600">
                              {" "}
                              — {roleLine}
                            </span>
                          )}
                          {p.linkedin_url && (
                            <a
                              href={p.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-sm text-[#0A66C2]"
                              aria-label="Open LinkedIn profile"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="h-3 w-3 fill-current"
                              >
                                <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.29 8.09h4.42V24H.29zM8.47 8.09h4.24v2.16h.06c.59-1.12 2.03-2.3 4.17-2.3 4.46 0 5.28 2.93 5.28 6.74V24h-4.42v-7.32c0-1.75-.03-4-2.44-4-2.44 0-2.81 1.9-2.81 3.87V24H8.47z" />
                              </svg>
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {similarProfiles.length > 0 && (
                <div className="mt-4 space-y-1">
                  <p className="text-[11px] font-medium text-slate-700">
                    From similar companies
                  </p>
                  <ul className="space-y-1 text-xs text-slate-800">
                    {similarProfiles.map((p) => {
                      const roleLine =
                        p.current_title ||
                        p.current_company
                          ? `${p.current_title ?? "Unknown role"}${
                              p.current_company ? ` at ${p.current_company}` : ""
                            }`
                          : null;
                      return (
                        <li key={(p.linkedin_url ?? p.full_name) + "-similar"}>
                          <span className="font-medium">{p.full_name}</span>
                          {roleLine && (
                            <span className="text-slate-600">
                              {" "}
                              — {roleLine}
                            </span>
                          )}
                          {p.linkedin_url && (
                            <a
                              href={p.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-sm text-[#0A66C2]"
                              aria-label="Open LinkedIn profile"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="h-3 w-3 fill-current"
                              >
                                <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.29 8.09h4.42V24H.29zM8.47 8.09h4.24v2.16h.06c.59-1.12 2.03-2.3 4.17-2.3 4.46 0 5.28 2.93 5.28 6.74V24h-4.42v-7.32c0-1.75-.03-4-2.44-4-2.44 0-2.81 1.9-2.81 3.87V24H8.47z" />
                              </svg>
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Right: gap analysis */}
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-[#FDFBF1] p-5 shadow-none">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-[#3C2A6A]">
                Your gap analysis
              </h3>
              <div className="mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-[#3C2A6A]/30 bg-white/70 px-3 py-1 text-[11px] text-[#3C2A6A]"
                  onClick={handleDownloadReport}
                  disabled={!gapAnalysis || runningGap || downloadingReport}
                >
                  {downloadingReport
                    ? "Preparing PDF…"
                    : "Download benchmarking report (PDF)"}
                </Button>
              </div>

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

              {!runningGap && parsedGapAnalysis && (
                <div className="space-y-5 text-xs text-slate-800">
                  {/* Executive summary */}
                  {parsedGapAnalysis.overallSummary && (
                    <section className="space-y-1">
                      <p className="font-serif text-sm font-semibold text-[#3C2A6A]">
                        Executive summary
                      </p>
                      {(() => {
                        const raw = String(
                          parsedGapAnalysis.overallSummary ?? ""
                        ).trim();
                        const maxChars = 700;
                        const isLong = raw.length > maxChars;
                        const visible =
                          !isLong || showFullSummary
                            ? raw
                            : raw.slice(0, maxChars) + "…";
                        return (
                          <>
                            <p className="mt-1 leading-relaxed text-slate-800">
                              {visible}
                            </p>
                            {isLong && (
                              <button
                                type="button"
                                onClick={() =>
                                  setShowFullSummary((prev) => !prev)
                                }
                                className="mt-1 text-[11px] font-medium text-[#3C2A6A] hover:underline"
                              >
                                {showFullSummary ? "Show less" : "Read more"}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </section>
                  )}

                  {/* Trajectory fit with horizontal scale */}
                  {parsedGapAnalysis.trajectoryFit && (
                    <section className="space-y-1">
                      <p className="font-medium text-slate-700">
                        Trajectory fit
                      </p>
                      {(() => {
                        const text = String(
                          parsedGapAnalysis.trajectoryFit ?? ""
                        ).toLowerCase();
                        let score = 60;
                        if (text.includes("high")) score = 85;
                        else if (text.includes("moderate")) score = 60;
                        else if (text.includes("low")) score = 30;

                        return (
                          <>
                            <div className="mt-1 flex items-center gap-3">
                              <div className="h-1.5 flex-1 rounded-full bg-slate-200/80">
                                <div
                                  className="h-1.5 rounded-full bg-[#3C2A6A]"
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-600">
                                {score}% fit
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-700">
                              {parsedGapAnalysis.trajectoryFit}
                            </p>
                          </>
                        );
                      })()}
                    </section>
                  )}

                  {/* Career anchors as radial cards */}
                  {anchorRadials.length > 0 && (
                    <section className="space-y-3">
                      <p className="font-medium text-slate-700">
                        Career anchors
                      </p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {anchorRadials.map((anchor) => (
                          <div
                            key={anchor.raw}
                            className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm"
                          >
                            <RadialBarChart
                              width={80}
                              height={80}
                              innerRadius="70%"
                              outerRadius="100%"
                              data={[anchor]}
                              startAngle={90}
                              endAngle={-270}
                            >
                              <PolarAngleAxis
                                type="number"
                                domain={[0, 100]}
                                dataKey="value"
                                tick={false}
                              />
                              <RadialBar
                                dataKey="value"
                                cornerRadius={999}
                                fill="#3C2A6A"
                                background
                              />
                            </RadialBarChart>
                            <p className="mt-1 text-[11px] font-semibold text-[#3C2A6A]">
                              {anchor.value}%
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-700 text-center">
                              {anchor.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Skill gaps */}
                  {parsedGapAnalysis.skillGaps && (
                    <section className="space-y-2">
                      <p className="font-medium text-slate-700">
                        Skill gaps{" "}
                        <span className="text-[10px] font-normal text-slate-500">
                          (technical pills open suggested resources)
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(
                          parsedGapAnalysis.skillGaps.missingTechnical
                        ) &&
                          parsedGapAnalysis.skillGaps.missingTechnical.map(
                            (s: { name: string; resourceUrl?: string }) => (
                              <a
                                key={s.name}
                                href={s.resourceUrl || "#"}
                                target={s.resourceUrl ? "_blank" : undefined}
                                rel={s.resourceUrl ? "noreferrer" : undefined}
                                className="rounded-full border border-[#3C2A6A]/25 bg-white/60 px-3 py-1 text-[11px] text-[#3C2A6A] hover:bg-[#3C2A6A]/5"
                              >
                                {s.name}
                              </a>
                            )
                          )}
                        {Array.isArray(
                          parsedGapAnalysis.skillGaps.missingSoft
                        ) &&
                          parsedGapAnalysis.skillGaps.missingSoft.map(
                            (s: string) => (
                              <span
                                key={s}
                                className="rounded-full border border-[#3C2A6A]/15 bg-[#3C2A6A]/5 px-3 py-1 text-[11px] text-[#3C2A6A]"
                              >
                                {s}
                              </span>
                            )
                          )}
                      </div>
                    </section>
                  )}

                  {/* Concrete actions checklist */}
                  {Array.isArray(parsedGapAnalysis.concreteActions) &&
                    parsedGapAnalysis.concreteActions.length > 0 && (
                      <section className="space-y-2">
                        <p className="font-medium text-slate-700">
                          Concrete actions
                        </p>
                        <ul className="mt-1 space-y-1">
                          {parsedGapAnalysis.concreteActions.map((r: string) => (
                            <li
                              key={r}
                              className="flex items-start gap-2 text-[11px]"
                            >
                              <span className="mt-[3px] inline-block h-3 w-3 rounded-[4px] border border-[#3C2A6A]/40 bg-white" />
                              <span className="flex-1">{r}</span>
                            </li>
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

