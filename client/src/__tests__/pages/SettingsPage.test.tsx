import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "../../test/helpers";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "../../pages/SettingsPage";
import { api } from "../../api/client";

const mockApi = vi.mocked(api);

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getSettings.mockResolvedValue({});
  });

  it("renders without crashing", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("shows Appearance section", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Appearance")).toBeInTheDocument();
  });

  it("shows Practice section", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Practice")).toBeInTheDocument();
  });

  it("shows Feedback section", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Feedback")).toBeInTheDocument();
  });

  it("displays theme options", () => {
    render(<SettingsPage />);
    expect(screen.getByText("light")).toBeInTheDocument();
    expect(screen.getByText("dark")).toBeInTheDocument();
    expect(screen.getByText("midnight")).toBeInTheDocument();
  });

  it("shows accessibility options", () => {
    render(<SettingsPage />);
    expect(screen.getByText("High contrast mode")).toBeInTheDocument();
    expect(screen.getByText("Reduced motion")).toBeInTheDocument();
    expect(screen.getByText("Colour vision mode")).toBeInTheDocument();
  });

  it("shows version string", () => {
    render(<SettingsPage />);
    expect(screen.getByText(/Practice Forge v/)).toBeInTheDocument();
  });

  it("shows feedback type choices", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Report a Bug")).toBeInTheDocument();
    expect(screen.getByText("Request a Feature")).toBeInTheDocument();
  });

  it("opens bug report form", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    await user.click(screen.getByText("Report a Bug"));
    expect(screen.getByText("Bug Report")).toBeInTheDocument();
  });

  it("opens feature request form", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    await user.click(screen.getByText("Request a Feature"));
    expect(screen.getByText("Feature Request")).toBeInTheDocument();
  });

  it("shows theme gallery button", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Browse Themes")).toBeInTheDocument();
  });

  it("shows export and import buttons", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Export Theme")).toBeInTheDocument();
    expect(screen.getByText("Import Theme")).toBeInTheDocument();
  });

  it("displays AI spend when available", async () => {
    mockApi.getSettings.mockResolvedValue({ ai_spend_total: 0.0125 });
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("$0.0125")).toBeInTheDocument();
    });
  });

  it("shows time allocation sliders", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Time allocation (%)")).toBeInTheDocument();
    expect(screen.getByText("Warm-up")).toBeInTheDocument();
  });
});
