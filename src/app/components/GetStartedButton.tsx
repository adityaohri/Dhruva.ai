"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function GetStartedButton({ isAuthed }: { isAuthed: boolean }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      size="lg"
      className="rounded-full bg-[#FDFBF1] px-8 text-sm font-medium text-[#3C2A6A] hover:bg-[#E5E7EB]"
      onClick={() => router.push("/onboard")}
    >
      {isAuthed ? "Go to Profile Audit" : "Get Started"}
    </Button>
  );
}
