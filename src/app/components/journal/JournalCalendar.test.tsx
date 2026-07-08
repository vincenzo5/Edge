import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import JournalCalendar from "./JournalCalendar";

describe("JournalCalendar", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders daily P&L for seeded day", () => {
    render(
      <JournalCalendar
        year={2026}
        month={5}
        dailyRows={[{ date: "2026-06-01", netPnL: 150, tradeCount: 2 }]}
        onDayClick={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("journal-calendar-day-2026-06-01")).toHaveTextContent("$150");
    expect(screen.getByTestId("journal-calendar-day-2026-06-01")).toHaveTextContent("2 trades");
  });

  it("uses full-height flex layout for calendar grid", () => {
    const { container } = render(
      <JournalCalendar
        year={2026}
        month={5}
        dailyRows={[]}
        onDayClick={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    const section = container.querySelector('[data-testid="journal-calendar"]');
    expect(section).toHaveClass("flex", "h-full", "flex-col");
    expect(screen.getByTestId("journal-calendar-grid")).toHaveClass("flex-1");
  });

  it("fires onDayClick when day clicked", () => {
    const onDayClick = vi.fn();
    render(
      <JournalCalendar
        year={2026}
        month={5}
        dailyRows={[{ date: "2026-06-01", netPnL: 150, tradeCount: 2 }]}
        onDayClick={onDayClick}
        onMonthChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("journal-calendar-day-2026-06-01"));
    expect(onDayClick).toHaveBeenCalledWith("2026-06-01");
  });

  it("fires onDayClick again when same day clicked twice", () => {
    const onDayClick = vi.fn();
    render(
      <JournalCalendar
        year={2026}
        month={5}
        dailyRows={[{ date: "2026-06-01", netPnL: 150, tradeCount: 2 }]}
        onDayClick={onDayClick}
        onMonthChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("journal-calendar-day-2026-06-01"));
    fireEvent.click(screen.getByTestId("journal-calendar-day-2026-06-01"));
    expect(onDayClick).toHaveBeenCalledTimes(2);
    expect(onDayClick).toHaveBeenNthCalledWith(1, "2026-06-01");
    expect(onDayClick).toHaveBeenNthCalledWith(2, "2026-06-01");
  });

  it("changes month via prev/next buttons", () => {
    const onMonthChange = vi.fn();
    render(
      <JournalCalendar
        year={2026}
        month={5}
        dailyRows={[]}
        onDayClick={vi.fn()}
        onMonthChange={onMonthChange}
      />,
    );
    fireEvent.click(screen.getByTestId("journal-calendar-prev"));
    expect(onMonthChange).toHaveBeenCalledWith(2026, 4);
    fireEvent.click(screen.getByTestId("journal-calendar-next"));
    expect(onMonthChange).toHaveBeenCalledWith(2026, 6);
  });

  it("shows P&L for days with trades", () => {
    render(
      <JournalCalendar
        year={2026}
        month={5}
        dailyRows={[{ date: "2026-06-01", netPnL: 150, tradeCount: 2 }]}
        onDayClick={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("journal-calendar-day-2026-06-01")).toHaveTextContent("$150");
    expect(screen.getByTestId("journal-calendar-day-2026-06-01")).toHaveTextContent("2 trades");
  });

  describe("This Month navigation", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-07-07"));
    });

    it("shows This Month when viewing another month", () => {
      render(
        <JournalCalendar
          year={2026}
          month={5}
          dailyRows={[]}
          onDayClick={vi.fn()}
          onMonthChange={vi.fn()}
        />,
      );
      expect(screen.getByTestId("journal-calendar-this-month")).toBeInTheDocument();
    });

    it("hides This Month when viewing the current month", () => {
      render(
        <JournalCalendar
          year={2026}
          month={6}
          dailyRows={[]}
          onDayClick={vi.fn()}
          onMonthChange={vi.fn()}
        />,
      );
      expect(screen.queryByTestId("journal-calendar-this-month")).not.toBeInTheDocument();
    });

    it("navigates to current month when This Month is clicked", () => {
      const onMonthChange = vi.fn();
      render(
        <JournalCalendar
          year={2026}
          month={5}
          dailyRows={[]}
          onDayClick={vi.fn()}
          onMonthChange={onMonthChange}
        />,
      );
      fireEvent.click(screen.getByTestId("journal-calendar-this-month"));
      expect(onMonthChange).toHaveBeenCalledWith(2026, 6);
    });
  });
});
