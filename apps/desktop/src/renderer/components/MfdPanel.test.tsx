// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MfdPanel } from "./MfdPanel.js";

afterEach(cleanup);

describe("MfdPanel", () => {
  it("renders its title and children", () => {
    render(
      <MfdPanel title="VEIN FINDER">
        <p>content</p>
      </MfdPanel>,
    );
    expect(screen.getByText("VEIN FINDER")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("exposes the title via an accessible region label", () => {
    render(<MfdPanel title="LEDGER">x</MfdPanel>);
    expect(screen.getByRole("region", { name: "LEDGER" })).toBeInTheDocument();
  });

  it("renders without a title (no heading, still a region)", () => {
    render(<MfdPanel>bare</MfdPanel>);
    expect(screen.getByText("bare")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
