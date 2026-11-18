// The benchmark: the player walks a fixed loop through the market while the frame times
// are recorded at a few render pixel ratios, then (if asked) for a few minutes more to
// see whether the phone slows down as it heats up.
import { summarize, type FrameTimes, type Summary } from './stats';

export interface BenchHooks {
  frames: FrameTimes;
  setRatio(ratio: number): void;
  canvasSize(): [number, number];
  status(text: string): void;
  stepLabel(step: number, steps: number, ratio: number, secondsLeft: number): string;
  soakLabel(secondsLeft: number): string;
}

export interface BenchStep extends Summary {
  ratio: number;
  canvas: [number, number];
}

export interface BenchResult {
  steps: BenchStep[];
  /** Frames per second of each 10 s window of the heat test. */
  soak: number[];
  soakRatio: number | null;
}

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/**
 * The suite: the standard scene at every pixel ratio worth comparing, then one change at
 * a time at the default ratio. Each variant is a fresh page load with these settings.
 */
export const SUITE: { id: SuiteId; query: Record<string, string> }[] = [
  { id: 'standard', query: {} },
  { id: 'tex-1k', query: { tex: '1k' } },
  { id: 'no-aa', query: { aa: '0' } },
  { id: 'unique-16', query: { unique: '1', stalls: '16' } },
  { id: 'npcs-24', query: { npcs: '24' } },
];
export type SuiteId = 'standard' | 'tex-1k' | 'no-aa' | 'unique-16' | 'npcs-24';
export const SUITE_KEY = 'bench-suite';

/** The pixel ratios worth comparing on this screen: 1, 1.5, 2 and the screen's own. */
export function benchRatios(screenRatio: number): number[] {
  const top = Math.min(3, Math.max(1, screenRatio));
  const list = [1, 1.5, 2, top].filter((r) => r <= top + 1e-6);
  return [...new Set(list.map((r) => Math.round(r * 100) / 100))].sort((a, b) => a - b);
}

export async function runBench(h: BenchHooks, ratios: number[], warm: number, measure: number, soak: number, soakRatio: number): Promise<BenchResult> {
  const steps: BenchStep[] = [];
  for (let i = 0; i < ratios.length; i++) {
    h.setRatio(ratios[i]);
    for (let left = warm + measure; left > 0; left--) {
      if (left === measure) h.frames.clear();
      h.status(h.stepLabel(i + 1, ratios.length, ratios[i], left));
      await sleep(1000);
    }
    steps.push({ ratio: ratios[i], canvas: h.canvasSize(), ...summarize(h.frames.recent()) });
  }
  const windows: number[] = [];
  if (soak > 0) {
    h.setRatio(soakRatio);
    for (let left = soak; left > 0; left -= 10) {
      h.frames.clear();
      for (let s = 0; s < 10; s++) {
        h.status(h.soakLabel(left - s));
        await sleep(1000);
      }
      windows.push(summarize(h.frames.recent()).fps);
    }
  }
  return { steps, soak: windows, soakRatio: soak > 0 ? soakRatio : null };
}
