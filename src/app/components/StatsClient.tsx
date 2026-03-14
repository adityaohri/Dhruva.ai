'use client';

import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    let frameId: number;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(target * progress);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration, active]);

  return value;
}

export function StatsClient() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const v1 = useCountUp(7.9, 2000, visible);
  const v2 = useCountUp(50, 1800, visible);
  const v3 = useCountUp(60, 1600, visible);

  return (
    <div
      ref={containerRef}
      className="mt-6 flex flex-col items-center gap-10 sm:flex-row sm:justify-center sm:gap-20"
    >
      <div className="flex flex-col items-center text-center">
        <span className="font-serif text-4xl sm:text-5xl font-bold text-[#3c2a6a]">
          {v1.toFixed(1)}M
        </span>
        <p className="mt-2 max-w-[180px] text-sm text-[rgba(60,42,106,0.6)]">
          individuals in the near-term addressable market
        </p>
      </div>
      <div className="flex flex-col items-center text-center">
        <span className="font-serif text-4xl sm:text-5xl font-bold text-[#3c2a6a]">
          {Math.round(v2)}%
        </span>
        <p className="mt-2 max-w-[180px] text-sm text-[rgba(60,42,106,0.6)]">
          of placed graduates are underemployed (Economic Survey)
        </p>
      </div>
      <div className="flex flex-col items-center text-center">
        <span className="font-serif text-4xl sm:text-5xl font-bold text-[#3c2a6a]">
          {Math.round(v3)}%
        </span>
        <p className="mt-2 max-w-[180px] text-sm text-[rgba(60,42,106,0.6)]">
          average placement hit rate across 35+ Tier 1 &amp; 2 colleges surveyed
        </p>
      </div>
    </div>
  );
}

