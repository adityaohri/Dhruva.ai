'use client';

import { useEffect } from "react";

export function ScrollAnimator() {
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-section]")
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.classList.add("section-visible");
            const children = Array.from(el.children) as HTMLElement[];
            children.forEach((child, idx) => {
              child.style.transitionDelay = `${idx * 0.1}s`;
            });
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );

    sections.forEach((el) => {
      el.classList.add("section-fade");
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}

