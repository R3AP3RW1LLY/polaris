// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CommandDeck } from "./CommandDeck.js";

afterEach(cleanup);

describe("CommandDeck", () => {
  it("renders the empty shell awaiting live telemetry (Phase 1)", () => {
    render(<CommandDeck />);
    expect(screen.getByRole("heading", { name: /command deck/i })).toBeInTheDocument();
    expect(screen.getAllByText(/awaiting.*telemetry/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/phase 1/i).length).toBeGreaterThan(0);
  });
});
