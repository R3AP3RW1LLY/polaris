// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MfdButton } from "./MfdButton.js";

afterEach(cleanup);

describe("MfdButton", () => {
  it("fires onClick when enabled", async () => {
    const onClick = vi.fn();
    render(<MfdButton onClick={onClick}>MINE</MfdButton>);
    await userEvent.click(screen.getByRole("button", { name: "MINE" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <MfdButton onClick={onClick} disabled>
        MINE
      </MfdButton>,
    );
    const button = screen.getByRole("button", { name: "MINE" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies the correct color per variant (orange primary, cyan ghost)", () => {
    const { rerender } = render(<MfdButton variant="primary">A</MfdButton>);
    const primary = screen.getByRole("button").className;
    expect(primary).toContain("border-orange");
    expect(primary).toContain("text-orange");
    rerender(<MfdButton variant="ghost">A</MfdButton>);
    const ghost = screen.getByRole("button").className;
    expect(ghost).toContain("text-cyan");
    expect(ghost).not.toContain("text-orange");
  });

  it("defaults to type=button so it never submits a form", () => {
    render(<MfdButton>A</MfdButton>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
