import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AppTimeZoneProvider, useAppTimeZone } from "./AppTimeZoneProvider";
import { APP_TIMEZONE_PREFERENCE_KEY } from "@/lib/app/appTimeZonePreference";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();

function TimeZoneProbe() {
  const { timeZone, setTimeZone } = useAppTimeZone();
  return (
    <div>
      <span data-testid="timezone-value">{timeZone}</span>
      <button
        type="button"
        data-testid="set-timezone"
        onClick={() => setTimeZone("America/Chicago")}
      >
        Set Chicago
      </button>
    </div>
  );
}

describe("AppTimeZoneProvider", () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(window, "localStorage", { value: localStorageMock, configurable: true });
  });

  it("hydrates persisted app timezone", async () => {
    localStorageMock.setItem(APP_TIMEZONE_PREFERENCE_KEY, "Europe/London");
    render(
      <AppTimeZoneProvider>
        <TimeZoneProbe />
      </AppTimeZoneProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("timezone-value")).toHaveTextContent("Europe/London");
    });
  });

  it("persists timezone changes", async () => {
    render(
      <AppTimeZoneProvider>
        <TimeZoneProbe />
      </AppTimeZoneProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("timezone-value")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("set-timezone"));

    await waitFor(() => {
      expect(screen.getByTestId("timezone-value")).toHaveTextContent("America/Chicago");
    });
    expect(localStorageMock.getItem(APP_TIMEZONE_PREFERENCE_KEY)).toBe("America/Chicago");
  });
});
