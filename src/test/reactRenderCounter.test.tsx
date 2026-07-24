/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createRenderCounter, useRenderCounter } from "./reactRenderCounter";

function CounterProbe({ counter }: { counter: ReturnType<typeof createRenderCounter> }) {
  useRenderCounter(counter);
  return <span>probe</span>;
}

describe("createRenderCounter", () => {
  it("counts renders across rerenders", () => {
    const counter = createRenderCounter();
    const { rerender } = render(<CounterProbe counter={counter} />);
    expect(counter.count()).toBe(1);

    rerender(<CounterProbe counter={counter} />);
    expect(counter.count()).toBe(2);

    counter.reset();
    expect(counter.count()).toBe(0);
  });
});
