import { useEffect, useRef, useState } from "react";

type AnimatedCounterProps = {
  target: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
};

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts up from 0 to `target` once the element scrolls into view, then
 * stays put — it never re-triggers on subsequent scrolls. Formats with the
 * French locale (comma decimal separator) at render time; the number stays
 * a plain float during the animation itself.
 */
export function AnimatedCounter({
  target,
  decimals = 0,
  prefix = "",
  suffix = "",
  durationMs = 1300,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setStarted(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [target]);

  useEffect(() => {
    if (!started) return;

    let rafId: number;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      setValue(target * easeOut(progress));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [started, target, durationMs]);

  const formatted = value.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
