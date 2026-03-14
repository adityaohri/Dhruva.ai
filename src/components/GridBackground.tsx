'use client';

import { useEffect, useRef, useState } from "react";

const CELL_SIZE = 44;

export function GridBackground() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ cols: 0, rows: 0 });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const update = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setDimensions({
        cols: Math.ceil(w / CELL_SIZE) + 1,
        rows: Math.ceil(h / CELL_SIZE) + 1,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cellCount = dimensions.cols * dimensions.rows;

  return (
    <div ref={wrapperRef} className="hero-grid-wrapper">
      <div className="hero-grid-base" />
      <div className="hero-grid-overlay" />
      <div
        className="hero-grid-cells"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${dimensions.cols}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${dimensions.rows}, ${CELL_SIZE}px)`,
        }}
      >
        {cellCount > 0 &&
          Array.from({ length: cellCount }, (_, i) => (
            <div
              key={i}
              className="hero-grid-cell"
              aria-hidden
            />
          ))}
      </div>
    </div>
  );
}

