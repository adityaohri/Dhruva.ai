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
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { type ParsedCV } from "@/app/actions/cv-parser";

type PublicProfile = {
  full_name: string;
  current_title: string | null;
  current_company: string | null;
  linkedin_url: string | null;
};

interface DiscoverySectionProps {
  parsed?: ParsedCV | null;
}

export function DiscoverySection({ parsed }: DiscoverySectionProps) {
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [targetProfiles, setTargetProfiles] = useState<PublicProfile[]>([]);
  const [similarProfiles, setSimilarProfiles] = useState<PublicProfile[]>([]);
  const [moreBenchmarkProfiles, setMoreBenchmarkProfiles] = useState<PublicProfile[]>([]);
  const [totalMatchedProfiles, setTotalMatchedProfiles] = useState(0);
  const [companiesSearched, setCompaniesSearched] = useState<string[]>([]);
  const [similarCompanies, setSimilarCompanies] = useState<string[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<any | null>(null);
  const [runningProfiles, setRunningProfiles] = useState(false);
  const [runningGap, setRunningGap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showFullTrajectory, setShowFullTrajectory] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileConfirmed, setProfileConfirmed] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<{
    name?: string | null;
    university?: string | null;
    gpa?: string | null;
    skills?: string[] | null;
    internships?: string[] | null;
    leadership_positions?: string | null;
    projects?: string | null;
    entrepreneurship?: string | null;
    personal_impact?: string | null;
  } | null>(null);

  // Helper to aggressively normalise any JSON-like string into a structured object.
  const parsedGapAnalysis = useMemo(() => {
    if (!gapAnalysis) return null;

    const stripFences = (text: string) =>
      text.replace(/```json/gi, "").replace(/```/g, "").trim();

    const tryParse = (value: unknown): any => {
      let current: any = value;

      for (let i = 0; i < 3; i++) {
        if (typeof current === "string") {
          let cleaned = stripFences(current);
          if (cleaned.includes("overallSummary")) {
            const firstBrace = cleaned.indexOf("{");
            const lastBrace = cleaned.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              const inner = cleaned.slice(firstBrace, lastBrace + 1);
              try {
                current = JSON.parse(inner);
                continue;
              } catch {
                // fall through
              }
            }
          }
        }

        if (
          current &&
          typeof current === "object" &&
          typeof (current as any).overallSummary === "string"
        ) {
          let inner = stripFences((current as any).overallSummary);
          if (inner.includes("overallSummary")) {
            const firstBrace = inner.indexOf("{");
            const lastBrace = inner.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              const innerObj = inner.slice(firstBrace, lastBrace + 1);
              try {
                current = JSON.parse(innerObj);
                continue;
              } catch {
                // fall through
              }
            }
          }
        }

        break;
      }

      if (current && typeof current === "object") return current;
      return null;
    };

    return tryParse(gapAnalysis);
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

  const handleRetrieveProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    setProfileConfirmed(false);
    setProfileSuccess(null);
    try {
      const supabase = createSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setProfileError("Please log in again to retrieve your profile.");
        setProfileLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          "full_name, current_university, gpa, skills, internships, leadership_positions, projects, entrepreneurship, personal_impact"
        )
        .eq("id", user.id)
        .maybeSingle();
      if (error || !data) {
        setProfileError("We couldn't find a saved profile for your account.");
        setProfileLoading(false);
        return;
      }
      const row = data as any;
      setProfileDraft({
        name: row.full_name ?? "",
        university: row.current_university ?? "",
        gpa: row.gpa ?? "",
        skills: Array.isArray(row.skills)
          ? row.skills
          : typeof row.skills === "string"
          ? row.skills
              .split(/[,|]/)
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [],
        internships: Array.isArray(row.internships)
          ? row.internships
          : typeof row.internships === "string"
          ? row.internships
              .split(/[,|]/)
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [],
        leadership_positions: row.leadership_positions ?? "",
        projects: row.projects ?? "",
        entrepreneurship: row.entrepreneurship ?? "",
        personal_impact: row.personal_impact ?? "",
      });
    } catch (e) {
      setProfileError(
        e instanceof Error ? e.message : "Failed to retrieve your profile."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handleConfirmProfile = async () => {
    if (!profileDraft) return;
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const supabase = createSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setProfileError("Please log in again to confirm your profile.");
        setProfileLoading(false);
        return;
      }
      const { error } = await supabase
        .from("user_profiles")
        .update({
          name: profileDraft.name ?? null,
          university: profileDraft.university ?? null,
          gpa: profileDraft.gpa ?? null,
          skills: profileDraft.skills ?? null,
          internships: profileDraft.internships ?? null,
        })
        .eq("id", user.id);
      if (error) {
        setProfileError("Could not save your profile. Please try again.");
        setProfileLoading(false);
        return;
      }
      setProfileConfirmed(true);
      setProfileSuccess("Profile confirmed and saved. You can now run discovery.");
    } catch (e) {
      setProfileError(
        e instanceof Error ? e.message : "Failed to save your profile."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRun = async () => {
    setError(null);
    setGapAnalysis(null);
    setTargetProfiles([]);
    setSimilarProfiles([]);
    setMoreBenchmarkProfiles([]);
    setTotalMatchedProfiles(0);
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
          minProfiles: 15,
          phase: "fiber",
        }),
      });

      if (!fiberResp.ok) {
        const body = await fiberResp.json().catch(() => ({}));
        const status = fiberResp.status;
        const msg =
          body.error ||
          (status === 504
            ? "Discovery API failed with 504 (timeout). Try again or use a different role/company."
            : `Discovery API failed with ${status}`);
        throw new Error(msg);
      }

      const fiberData = (await fiberResp.json()) as {
        companiesSearched: string[];
        similarCompanies: string[];
        targetProfiles: PublicProfile[];
        similarProfiles: PublicProfile[];
        moreBenchmarkProfiles?: PublicProfile[];
        totalMatchedProfiles?: number;
      };
      setCompaniesSearched(fiberData.companiesSearched || []);
      setSimilarCompanies(fiberData.similarCompanies || []);
      setTargetProfiles(fiberData.targetProfiles || []);
      setSimilarProfiles(fiberData.similarProfiles || []);
      setMoreBenchmarkProfiles(fiberData.moreBenchmarkProfiles || []);
      setTotalMatchedProfiles(
        typeof fiberData.totalMatchedProfiles === "number"
          ? fiberData.totalMatchedProfiles
          : (fiberData.targetProfiles?.length || 0) +
              (fiberData.similarProfiles?.length || 0)
      );
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
          minProfiles: 15,
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

      const nextGap = gapData.gapAnalysis || null;
      setGapAnalysis(nextGap);

      // Persist the latest audit output so Strategy Agent can activate
      // only after an audit has been run.
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "dhruva_last_profile_audit",
            JSON.stringify({
              targetRole,
              targetCompany,
              targetIndustry,
              targetProfiles: fiberData.targetProfiles || [],
              similarProfiles: fiberData.similarProfiles || [],
              companiesSearched: fiberData.companiesSearched || [],
              similarCompanies: fiberData.similarCompanies || [],
              gapAnalysis: nextGap,
              auditedAt: new Date().toISOString(),
            })
          );
        }
      } catch {
        // ignore storage errors
      }
    } catch (e: any) {
      setError(e?.message || "Discovery failed");
    } finally {
      setRunningProfiles(false);
      setRunningGap(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!gapAnalysis && !parsedGapAnalysis) return;
    setDownloadingReport(true);
    try {
      const res = await fetch("/api/benchmark-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Prefer the fully parsed/normalised analysis so the PDF
          // layout matches the on-screen cards instead of dumping any
          // raw JSON strings that may exist in the original payload.
          gapAnalysis: parsedGapAnalysis ?? gapAnalysis,
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
        <section className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(60,42,106,0.7)]">
                Retrieve profile
              </p>
              <p className="mt-1 text-xs text-[rgba(60,42,106,0.75)]">
                Pull the profile we built from your onboarding chat, and make any quick
                edits before running discovery.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleRetrieveProfile}
              disabled={profileLoading}
              className="rounded-full bg-[#3C2A6A] px-4 py-1.5 text-[11px] font-medium text-[#FDFBF1] hover:bg-[#4a347f] disabled:opacity-60"
            >
              {profileLoading ? "Retrieving…" : "Retrieve profile"}
            </Button>
          </div>
          {profileError && (
            <p className="mt-2 text-[11px] text-red-700">{profileError}</p>
          )}
          {profileSuccess && (
            <p className="mt-2 text-[11px] text-emerald-700">
              {profileSuccess}
            </p>
          )}
          {profileDraft && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-[#FDFBF1] p-3 text-[11px] text-[#3C2A6A]">
              <table className="w-full border-collapse text-left">
                <tbody>
                  <tr>
                    <th className="w-32 py-1 pr-2 align-top font-semibold">
                      Name
                    </th>
                    <td className="py-1">
                      <Input
                        value={profileDraft.name ?? ""}
                        onChange={(e) =>
                          setProfileDraft((prev) =>
                            prev ? { ...prev, name: e.target.value } : prev
                          )
                        }
                        className="h-7 rounded-full border border-[#3C2A6A]/20 bg-white text-[11px]"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className="w-32 py-1 pr-2 align-top font-semibold">
                      University
                    </th>
                    <td className="py-1">
                      <Input
                        value={profileDraft.university ?? ""}
                        onChange={(e) =>
                          setProfileDraft((prev) =>
                            prev ? { ...prev, university: e.target.value } : prev
                          )
                        }
                        className="h-7 rounded-full border border-[#3C2A6A]/20 bg-white text-[11px]"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className="w-32 py-1 pr-2 align-top font-semibold">GPA</th>
                    <td className="py-1">
                      <Input
                        value={profileDraft.gpa ?? ""}
                        onChange={(e) =>
                          setProfileDraft((prev) =>
                            prev ? { ...prev, gpa: e.target.value } : prev
                          )
                        }
                        className="h-7 rounded-full border border-[#3C2A6A]/20 bg-white text-[11px]"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className="w-32 py-1 pr-2 align-top font-semibold">
                      Skills
                    </th>
                    <td className="py-1">
                      <Input
                        value={(profileDraft.skills ?? []).join(", ")}
                        onChange={(e) => {
                          const parts = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          setProfileDraft((prev) =>
                            prev ? { ...prev, skills: parts } : prev
                          );
                        }}
                        className="h-7 rounded-full border border-[#3C2A6A]/20 bg-white text-[11px]"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className="w-32 py-1 pr-2 align-top font-semibold">
                      Internships
                    </th>
                    <td className="py-1">
                      <Input
                        value={(profileDraft.internships ?? []).join(", ")}
                        onChange={(e) => {
                          const parts = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          setProfileDraft((prev) =>
                            prev ? { ...prev, internships: parts } : prev
                          );
                        }}
                        className="h-7 rounded-full border border-[#3C2A6A]/20 bg-white text-[11px]"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmProfile}
                  disabled={profileLoading}
                  className="rounded-full bg-[#3C2A6A] px-4 py-1.5 text-[11px] font-medium text-[#FDFBF1] hover:bg-[#4a347f] disabled:opacity-60"
                >
                  {profileLoading ? "Saving…" : "Confirm profile for discovery"}
                </Button>
              </div>
            </div>
          )}
        </section>
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
              placeholder="e.g. Management Consulting"
              className="h-9 rounded-full border border-[#3C2A6A]/15 bg-[#FDFBF1] text-sm focus-visible:ring-[#3C2A6A]"
            />
          </div>
        </div>

        <Button
          onClick={handleRun}
          disabled={
            runningProfiles ||
            runningGap ||
            !profileConfirmed ||
            (!targetIndustry?.trim() && !targetRole?.trim() && !targetCompany?.trim())
          }
          className="mt-1 rounded-full bg-[#3C2A6A] px-5 py-2 text-xs font-medium text-[#FDFBF1] shadow-none transition-transform hover:-translate-y-0.5 hover:bg-[#4a347f] disabled:opacity-60"
        >
          {runningProfiles || runningGap
            ? "Analyzing…"
            : "Run Discovery from extracted CV"}
        </Button>

        {error && <p className="text-xs text-red-700">{error}</p>}

        {(targetProfiles.length > 0 ||
          similarProfiles.length > 0 ||
          moreBenchmarkProfiles.length > 0 ||
          parsedGapAnalysis) && (
          <div className="mt-8 grid gap-5 md:grid-cols-2 animate-in fade-in-50 slide-in-from-bottom-2">
            {/* Left: target profiles list */}
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-none">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-[#3C2A6A]">
                Target profiles
              </h3>
              <div className="mt-1 space-y-1 text-[10px] text-slate-600">
                {totalMatchedProfiles > 0 && (
                  <p>
                    <span className="font-semibold text-[#3C2A6A]">
                      Total matched profiles:
                    </span>{" "}
                    {totalMatchedProfiles}
                  </p>
                )}
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
              {moreBenchmarkProfiles.length > 0 && (
                <div className="mt-4 space-y-1">
                  <p className="text-[11px] font-medium text-slate-700">
                    More benchmark profiles (cache)
                  </p>
                  <ul className="space-y-1 text-xs text-slate-800">
                    {moreBenchmarkProfiles.map((p) => {
                      const roleLine =
                        p.current_title || p.current_company
                          ? `${p.current_title ?? "Unknown role"}${
                              p.current_company ? ` at ${p.current_company}` : ""
                            }`
                          : null;
                      return (
                        <li key={(p.linkedin_url ?? p.full_name) + "-more"}>
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
                        let raw = String(
                          parsedGapAnalysis.overallSummary ?? ""
                        ).trim();

                        // Last-resort normalisation: if the "overallSummary"
                        // itself contains a full JSON object (with keys like
                        // overallSummary/trajectoryFit), peel that inner
                        // object and use its own overallSummary string so the
                        // UI never shows raw JSON blobs.
                        if (raw.startsWith("{") && raw.includes("overallSummary")) {
                          // First, try strict JSON parsing.
                          try {
                            const inner = JSON.parse(raw);
                            if (
                              inner &&
                              typeof inner === "object" &&
                              typeof (inner as any).overallSummary === "string"
                            ) {
                              raw = (inner as any).overallSummary.trim();
                            }
                          } catch {
                            // If it's not valid JSON, fall back to a
                            // best-effort regex that plucks the
                            // "overallSummary" value from a JSON-like
                            // blob. This keeps the UI readable even if
                            // the model response is slightly malformed.
                            const match = raw.match(
                              /"overallSummary"\s*:\s*"([\s\S]*?)",\s*"(trajectoryFit|careerAnchors|skillGaps|concreteActions)"/
                            );
                            if (match?.[1]) {
                              const unescaped = match[1]
                                .replace(/\\"/g, '"')
                                .replace(/\\n/g, " ")
                                .replace(/\s+/g, " ")
                                .trim();
                              if (unescaped) {
                                raw = unescaped;
                              }
                            }
                          }
                        }

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
                        const rawText = String(
                          parsedGapAnalysis.trajectoryFit ?? ""
                        ).trim();
                        const textLower = rawText.toLowerCase();
                        let score = 60;
                        if (textLower.includes("high")) score = 85;
                        else if (textLower.includes("moderate")) score = 60;
                        else if (textLower.includes("low")) score = 30;

                        const maxChars = 500;
                        const isLong = rawText.length > maxChars;
                        const visible =
                          !isLong || showFullTrajectory
                            ? rawText
                            : rawText.slice(0, maxChars) + "…";

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
                            <p className="mt-1 text-[11px] text-slate-700 leading-relaxed">
                              {visible}
                            </p>
                            {isLong && (
                              <button
                                type="button"
                                onClick={() =>
                                  setShowFullTrajectory((prev) => !prev)
                                }
                                className="mt-1 text-[11px] font-medium text-[#3C2A6A] hover:underline"
                              >
                                {showFullTrajectory ? "Show less" : "Read more"}
                              </button>
                            )}
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
                              <button
                                key={s.name}
                                type="button"
                                onClick={() => {
                                  if (s.resourceUrl) {
                                    window.open(
                                      s.resourceUrl,
                                      "_blank",
                                      "noopener,noreferrer"
                                    );
                                  }
                                }}
                                className="rounded-full border border-[#3C2A6A]/25 bg-white/60 px-3 py-1 text-[11px] text-[#3C2A6A] hover:bg-[#3C2A6A]/5"
                              >
                                {s.name}
                              </button>
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

