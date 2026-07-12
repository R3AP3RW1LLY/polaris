// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { StatusBar } from "./StatusBar.js";
import type { AppHealth } from "@lodestar/shared";

afterEach(cleanup);

const health = (over: Partial<AppHealth> = {}): AppHealth => ({
  version: "0.1.0",
  dbStatus: "ok",
  journalStatus: "ok",
  ...over,
});

describe("StatusBar", () => {
  it("shows the app version", () => {
    render(<StatusBar health={health()} />);
    expect(screen.getByText(/0\.1\.0/)).toBeInTheDocument();
  });

  it("reflects DB and journal status with accessible state labels", () => {
    render(<StatusBar health={health({ dbStatus: "ok", journalStatus: "error" })} />);
    expect(screen.getByTestId("status-db")).toHaveAttribute("data-status", "ok");
    expect(screen.getByTestId("status-journal")).toHaveAttribute("data-status", "error");
  });

  it("shows not-configured states before setup", () => {
    render(
      <StatusBar
        health={health({ dbStatus: "not-configured", journalStatus: "not-configured" })}
      />,
    );
    expect(screen.getByTestId("status-db")).toHaveAttribute("data-status", "not-configured");
    expect(screen.getByTestId("status-journal")).toHaveAttribute("data-status", "not-configured");
  });

  it("maps each status to the correct dot color (red for error, green for ok, dim for not-configured)", () => {
    const { container } = render(
      <StatusBar health={health({ dbStatus: "ok", journalStatus: "error" })} />,
    );
    const dbDot = container.querySelector('[data-testid="status-db"] > span');
    const journalDot = container.querySelector('[data-testid="status-journal"] > span');
    expect(dbDot).toHaveClass("bg-signal-ok");
    expect(journalDot).toHaveClass("bg-signal-danger");
    cleanup();
    const { container: c2 } = render(<StatusBar health={health({ dbStatus: "not-configured" })} />);
    expect(c2.querySelector('[data-testid="status-db"] > span')).toHaveClass("bg-signal-skip");
  });

  it("renders a connecting state when health is null", () => {
    render(<StatusBar health={null} />);
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it("renders a distinct 'connection lost' state (not confused with connecting)", () => {
    render(<StatusBar health={null} connectionLost />);
    expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
    expect(screen.queryByText(/connecting/i)).not.toBeInTheDocument();
  });
});
