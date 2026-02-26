"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Profile Audit" },
  { href: "/opportunity", label: "Opportunity Intelligence" },
  { href: "/outreach", label: "Outreach Copilot" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 px-4 pt-4">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl bg-white px-5 shadow-sm sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="dhruva-logo-wrap flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
              <img
                src="/dhruva-star.png?v=2"
                alt="dhruva.ai logo"
                className="h-11 w-11 object-contain"
              />
            </div>
            <span className="font-serif text-lg font-semibold tracking-tight text-[#3C2A6A]">
              dhruva.ai
            </span>
          </Link>

          {/* Desktop nav: visible from md up */}
          <div className="hidden items-center gap-5 text-xs font-medium text-slate-700 md:flex md:text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-[#3C2A6A]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile: hamburger button */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </nav>
      </header>

      {/* Mobile drawer overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/20 transition-opacity md:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[min(20rem,85vw)] max-w-sm flex flex-col gap-6 bg-white px-6 py-6 shadow-xl transition-transform duration-200 ease-out md:hidden ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}
        aria-modal="true"
        aria-label="Mobile menu"
      >
        <div className="flex items-center justify-between">
          <span className="font-serif text-lg font-semibold text-[#3C2A6A]">
            Menu
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#3C2A6A]"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
