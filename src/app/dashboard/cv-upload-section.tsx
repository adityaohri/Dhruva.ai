"use client";

import { useState, useCallback, useEffect } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  parsePdfWithAI,
  saveProfileToSupabase,
  checkOpenAIKey,
  type ParsedCV,
} from "@/app/actions/cv-parser";
import { cn } from "@/lib/utils";

export function CvUploadSection() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCV | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [openAIConfigured, setOpenAIConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    checkOpenAIKey().then(({ configured }) => setOpenAIConfigured(configured));
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      setError(null);
      const f = e.dataTransfer.files?.[0];
      if (f?.type === "application/pdf") {
        setFile(f);
        setParsed(null);
      } else if (f) {
        setError("Please drop a PDF file.");
      }
    },
    []
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const f = e.target.files?.[0];
    if (f?.type === "application/pdf") {
      setFile(f);
      setParsed(null);
    } else if (f) {
      setError("Please select a PDF file.");
    }
  }, []);

  const handleParse = async () => {
    if (!file) return;
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError("PDF is too large (max 5 MB). Use a smaller file to avoid timeouts.");
      return;
    }
    setParsing(true);
    setError(null);
    setParsed(null);
    try {
      const formData = new FormData();
      formData.append("pdf", file, file.name);
      const result = await parsePdfWithAI(formData);
      if (result.success) {
        setParsed(result.data);
        setError(null);
      } else {
        setError(result.error ?? "Analysis failed.");
        setParsed(null);
      }
    } catch (err) {
      const rawMessage =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      const isNetworkFailure =
        rawMessage === "Load failed" ||
        rawMessage.toLowerCase().includes("network") ||
        rawMessage.toLowerCase().includes("connection was lost") ||
        rawMessage.toLowerCase().includes("failed to fetch") ||
        rawMessage.toLowerCase().includes("network connection was lost");
      setError(
        isNetworkFailure
          ? "The request was interrupted or timed out. Try a smaller PDF, check your connection, or try again in a moment. If it persists, check Vercel function logs for timeouts."
          : rawMessage
      );
      setParsed(null);
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    const result = await saveProfileToSupabase(parsed);
    setSaving(false);
    if (result.success) {
      setSaveSuccess(true);
    } else {
      setError(result.error);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsed(null);
    setError(null);
    setSaveSuccess(false);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5" />
          CV Intelligence
        </CardTitle>
        <CardDescription>
          Upload a resume PDF for AI-powered extraction (McKinsey-style analysis).
        </CardDescription>
        {openAIConfigured !== null && (
          <p
            className={cn(
              "text-sm",
              openAIConfigured
                ? "text-green-600 dark:text-green-400"
                : "text-amber-600 dark:text-amber-400"
            )}
          >
            {openAIConfigured
              ? "OpenAI API key: configured"
              : "OpenAI API key: not detected. Add OPENAI_API_KEY to .env.local and restart the dev server (npm run dev)."}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        {/* Drag-and-drop zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "relative flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
            dragActive && "border-primary bg-primary/5",
            !dragActive && "border-muted-foreground/25 bg-muted/20 hover:bg-muted/30"
          )}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleChange}
            className={cn(
              "absolute inset-0 cursor-pointer opacity-0",
              file && "pointer-events-none"
            )}
            id="cv-upload"
          />
          {file ? (
            <div className="relative z-10 flex flex-col items-center gap-2 text-center">
              <FileText className="size-10 text-muted-foreground" />
              <p className="font-medium text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  disabled={parsing}
                >
                  Remove
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleParse}
                  disabled={parsing}
                  aria-busy={parsing}
                >
                  {parsing ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 size-4" />
                      Analyze CV
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="cv-upload"
              className="flex cursor-pointer flex-col items-center gap-2 text-center"
            >
              <Upload className="size-10 text-muted-foreground" />
              <span className="font-medium text-foreground">
                Drop your resume here or click to browse
              </span>
              <span className="text-sm text-muted-foreground">
                PDF only
              </span>
            </label>
          )}
        </div>

        {error && (
          <div
            className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        {saveSuccess && (
          <p className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
            Profile saved successfully.
          </p>
        )}

        {/* Parsed data form */}
        {parsed && (
          <div className="mt-6 space-y-4 rounded-lg border bg-card p-4">
            <h3 className="font-semibold">Extracted profile</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={parsed.name} readOnly className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>University</Label>
                <Input
                  value={parsed.university}
                  readOnly
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>GPA</Label>
                <Input value={parsed.gpa} readOnly className="bg-muted/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                {parsed.skills.length
                  ? parsed.skills.join(", ")
                  : "—"}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Internships</Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                {parsed.internships.length
                  ? parsed.internships.join(" · ")
                  : "—"}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Leadership positions</Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm whitespace-pre-wrap">
                {parsed.leadership_positions ?? "—"}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Projects</Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm whitespace-pre-wrap">
                {parsed.projects ?? "—"}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Others</Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm whitespace-pre-wrap">
                {parsed.others ?? "—"}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Entrepreneurial Leadership</Label>
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {String(parsed.entrepreneurial_leadership)}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Personal Impact</Label>
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {String(parsed.personal_impact)}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save to Profile"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                Upload another
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
