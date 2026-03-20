import { describe, it, expect } from "vitest";
import { render } from "../../test/helpers";
import { screen } from "@testing-library/react";
import { Badge } from "../../components/ui/Badge";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>High</Badge>);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("applies color styles when provided", () => {
    render(<Badge color="#ff0000">Colored</Badge>);
    const badge = screen.getByText("Colored");
    // jsdom may normalize hex to rgb — just verify style is set
    expect(badge.style.color).toBeTruthy();
    expect(badge.style.backgroundColor).toBeTruthy();
  });

  it("does not apply inline styles without color", () => {
    render(<Badge>Plain</Badge>);
    const badge = screen.getByText("Plain");
    expect(badge.style.color).toBe("");
  });

  it("merges custom className", () => {
    render(<Badge className="extra">Custom</Badge>);
    expect(screen.getByText("Custom")).toHaveClass("extra");
  });

  it("has rounded-full class for pill shape", () => {
    render(<Badge>Pill</Badge>);
    expect(screen.getByText("Pill")).toHaveClass("rounded-full");
  });
});
