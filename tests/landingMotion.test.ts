import { describe, expect, test } from "bun:test";
import {
  chapterPosition,
  chapterStops,
  damp,
  pinnedProgress,
} from "../src/components/landing/motion";

describe("Landing motion", () => {
  test("chapter buttons land in stable reading holds", () => {
    chapterStops.forEach((stop, index) =>
      expect(chapterPosition(stop)).toBe(index),
    );
  });
  test("transitions are continuous, reversible and bounded", () => {
    let previous = 0;
    for (let i = -10; i <= 110; i++) {
      const position = chapterPosition(i / 100);
      expect(position).toBeGreaterThanOrEqual(previous);
      expect(position - previous).toBeLessThan(0.08);
      expect(position).toBeLessThanOrEqual(2);
      expect(position + chapterPosition(1 - i / 100)).toBeCloseTo(2);
      previous = position;
    }
  });
  test("pinned progress follows the section, not its stationary screen", () => {
    expect(pinnedProgress(76, 1400, 700, 76)).toBe(0);
    expect(pinnedProgress(-274, 1400, 700, 76)).toBe(0.5);
    expect(pinnedProgress(-624, 1400, 700, 76)).toBe(1);
    expect(pinnedProgress(-900, 1400, 700, 76)).toBe(1);
    expect(pinnedProgress(200, 1400, 700, 76)).toBe(0);
  });
  test("damping is frame-rate independent and does not overshoot", () => {
    expect(damp(damp(0, 1, 1 / 60), 1, 1 / 60)).toBeCloseTo(damp(0, 1, 1 / 30));
    expect(damp(0, 1, 1 / 60)).toBeGreaterThan(0);
    expect(damp(0, 1, 1 / 60)).toBeLessThan(1);
    expect(damp(0.99999, 1, 1 / 60)).toBe(1);
  });
});
