"use client";

import { useState } from "react";
import { type ParsedCV } from "@/app/actions/cv-parser";
import { CvUploadSection } from "./cv-upload-section";
import { DiscoverySection } from "./discovery-section";

export function CvAndDiscoverySection() {
  const [parsed, setParsed] = useState<ParsedCV | null>(null);

  return (
    <div className="space-y-8">
      <CvUploadSection onParsedChange={setParsed} />
      <DiscoverySection parsed={parsed} />
    </div>
  );
}

