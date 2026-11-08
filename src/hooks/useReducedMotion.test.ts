// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useReducedMotion } from "./useReducedMotion";
afterEach(cleanup);
it("observes reduced motion and cleans up its preference listener", () => {
  let change: (() => void) | undefined;
  const media = {
    matches: true,
    addEventListener: vi.fn((_: string, fn: () => void) => {
      change = fn;
    }),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(window, "matchMedia", {
    value: () => media,
    configurable: true,
  });
  const hook = renderHook(() => useReducedMotion());
  expect(hook.result.current).toBe(true);
  media.matches = false;
  act(() => change?.());
  expect(hook.result.current).toBe(false);
  hook.unmount();
  expect(media.removeEventListener).toHaveBeenCalled();
});
