export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export function smoothstep(start: number, end: number, value: number) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

// Reading holds surround two deliberate screen changes, in either scroll direction.
export function chapterPosition(progress: number) {
  return smoothstep(0.18, 0.38, progress) + smoothstep(0.62, 0.82, progress);
}

export const chapterStops = [0.08, 0.5, 0.92] as const;

export function pinnedProgress(
  top: number,
  height: number,
  stageHeight: number,
  inset: number,
) {
  return clamp((inset - top) / Math.max(1, height - stageHeight));
}

export function damp(current: number, target: number, seconds: number) {
  const next = current + (target - current) * (1 - Math.exp(-14 * seconds));
  return Math.abs(next - target) < 0.0001 ? target : next;
}
