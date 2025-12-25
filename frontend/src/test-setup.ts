// src/test-setup.ts
import { afterEach, beforeEach, vi } from 'vitest';

let rafSpy: ReturnType<typeof vi.spyOn> | undefined;

beforeEach(() => {
  // Prevent D3 render code (scheduled via rAF) from running in jsdom tests
  rafSpy = vi
    .spyOn(globalThis, 'requestAnimationFrame' as any)
    .mockImplementation(() => 0 as any);
});

afterEach(() => {
  rafSpy?.mockRestore();
});
