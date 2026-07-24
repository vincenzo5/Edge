import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import JournalCalendar from "./JournalCalendar";

describe("JournalCalendar", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const seededRow = {
    date: "2026-06-01",
    netPnL: 150,
    tradeCount: 2,
    winCount: 2,
    lossCount: 0,
  };

  it("renders daily P&L for seeded day", () => {
    render(
      <JournalCalendar
        year={2026}
        month={5}
        dailyRows={[seededRow]}
        onDayClick={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("journal-calendar-day-2026-06-01")).toHaveTextContent("$150");
    expect(screen.getByTestId("journal-calendar-day-2026-06-01")).toHaveTextContent("2 trades");
    expect(screen.getByTestId("journal-calendar-day-2026-06-01")).toHaveTextContent("100%");
  });

  it("uses Mon-Fri grid with week column", () => {
    render(
      <JournalCalendar
        year={2026}
        month={5}
        dailyRows={[seededRow]}
        onDayClick={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("journal-calendar-grid")).toHaveClass("grid-cols-6");
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Week")).toBeInTheDocument();
    expect(screen.queryByText("Sat")).not.toBeInTheDocument();
    expect(screen.queryByText("Sun")).not.toBeInTheDocument();
    expect(screen.getByTestId("journal-calendar-week-0")).toHaveTextContent("$150");
  });

  it("shows month summary rollup", () => {
    render(
      <JournalCalendar
        year={2026}
        month={5}
        dailyRows={[seededRow]}
        onDayClick={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("journal-calendar-month-summary")).toHaveTextContent("+$150");
    expect(screen.getByTestId("journal-calendar-month-summary")).toHaveTextContent("1W / 0L");
    expect(screen.getByTestId("journal-calendar-month-summary")).toHaveTextContent("2 trades");
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
        dailyRows={[seededRow]}
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
        dailyRows={[seededRow]}
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

  it("marks today and selected day chrome", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00"));
    render(
      <JournalCalendar
        year={2026}
        month={5}
        dailyRows={[seededRow, { date: "2026-06-02", netPnL: 20, tradeCount: 1, winCount: 1, lossCount: 0 }]}
        selectedDate="2026-06-02"
        onDayClick={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("journal-calendar-day-2026-06-01")).toHaveAttribute("data-today", "true");
    expect(screen.getByTestId("journal-calendar-day-2026-06-02")).toHaveAttribute("data-selected", "true");
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
