import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "../../test/helpers";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionPage } from "../../pages/SessionPage";
import { api } from "../../api/client";

const mockApi = vi.mocked(api);

describe("SessionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getCurrentSession.mockRejectedValue(new Error("none"));
  });

  it("renders without crashing", async () => {
    render(<SessionPage />);
    await waitFor(() => {
      expect(screen.getByText("Practice Session")).toBeInTheDocument();
    });
  });

  it("shows plan session view when no current session", async () => {
    render(<SessionPage />);
    await waitFor(() => {
      expect(screen.getByText("Plan your session")).toBeInTheDocument();
    });
  });

  it("shows duration options", async () => {
    render(<SessionPage />);
    await waitFor(() => {
      expect(screen.getByText("30 min")).toBeInTheDocument();
      expect(screen.getByText("45 min")).toBeInTheDocument();
      expect(screen.getByText("60 min")).toBeInTheDocument();
      expect(screen.getByText("90 min")).toBeInTheDocument();
      expect(screen.getByText("120 min")).toBeInTheDocument();
    });
  });

  it("shows Generate Session button", async () => {
    render(<SessionPage />);
    await waitFor(() => {
      expect(screen.getByText("Generate Session")).toBeInTheDocument();
    });
  });

  it("selects different duration on click", async () => {
    const user = userEvent.setup();
    render(<SessionPage />);
    await waitFor(() => {
      expect(screen.getByText("30 min")).toBeInTheDocument();
    });
    await user.click(screen.getByText("30 min"));
    // The 30 min button should now have the active style (background color)
    const btn30 = screen.getByText("30 min");
    expect(btn30.style.backgroundColor).toBeTruthy();
  });

  it("calls generateSession on button click", async () => {
    const user = userEvent.setup();
    const mockSession = {
      id: "s1",
      date: "2024-01-01",
      planned_duration_min: 60,
      actual_duration_min: null,
      status: "planned",
      rating: null,
      notes: "",
      blocks: [
        {
          id: "b1",
          category: "warmup",
          title: "Warm-up",
          description: "",
          planned_duration_min: 10,
          actual_duration_min: null,
          sort_order: 0,
          status: "pending",
          linked_type: null,
          linked_id: null,
          focus_points: "",
          notes: "",
        },
      ],
    };
    mockApi.generateSession.mockResolvedValue(mockSession as any);
    render(<SessionPage />);
    await waitFor(() => {
      expect(screen.getByText("Generate Session")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Generate Session"));
    expect(mockApi.generateSession).toHaveBeenCalledWith(60);
  });

  it("shows session blocks after generation", async () => {
    const user = userEvent.setup();
    const mockSession = {
      id: "s1",
      date: "2024-01-01",
      planned_duration_min: 60,
      actual_duration_min: null,
      status: "planned",
      rating: null,
      notes: "",
      blocks: [
        {
          id: "b1",
          category: "warmup",
          title: "Long tones",
          description: "Sustained notes",
          planned_duration_min: 10,
          actual_duration_min: null,
          sort_order: 0,
          status: "pending",
          linked_type: null,
          linked_id: null,
          focus_points: "",
          notes: "",
        },
        {
          id: "b2",
          category: "technique",
          title: "Scales",
          description: "Major scales",
          planned_duration_min: 15,
          actual_duration_min: null,
          sort_order: 1,
          status: "pending",
          linked_type: null,
          linked_id: null,
          focus_points: "",
          notes: "",
        },
      ],
    };
    mockApi.generateSession.mockResolvedValue(mockSession as any);
    render(<SessionPage />);
    await waitFor(() => {
      expect(screen.getByText("Generate Session")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Generate Session"));
    await waitFor(() => {
      expect(screen.getByText("Long tones")).toBeInTheDocument();
      expect(screen.getByText("Scales")).toBeInTheDocument();
    });
  });

  it("shows Start Session button for planned session", async () => {
    mockApi.getCurrentSession.mockResolvedValue({
      id: "s1",
      date: "2024-01-01",
      planned_duration_min: 60,
      actual_duration_min: null,
      status: "planned",
      rating: null,
      notes: "",
      blocks: [
        {
          id: "b1",
          category: "warmup",
          title: "Warm-up",
          description: "",
          planned_duration_min: 10,
          actual_duration_min: null,
          sort_order: 0,
          status: "pending",
          linked_type: null,
          linked_id: null,
          focus_points: "",
          notes: "",
        },
      ],
    } as any);
    render(<SessionPage />);
    await waitFor(() => {
      expect(screen.getByText("Start Session")).toBeInTheDocument();
    });
  });

  it("shows completed session view", async () => {
    mockApi.getCurrentSession.mockResolvedValue({
      id: "s1",
      date: "2024-01-01",
      planned_duration_min: 60,
      actual_duration_min: 55,
      status: "completed",
      rating: "good",
      notes: "Great session",
      blocks: [
        {
          id: "b1",
          category: "warmup",
          title: "Warm-up",
          description: "",
          planned_duration_min: 10,
          actual_duration_min: 10,
          sort_order: 0,
          status: "completed",
          linked_type: null,
          linked_id: null,
          focus_points: "",
          notes: "",
        },
      ],
    } as any);
    render(<SessionPage />);
    await waitFor(() => {
      expect(screen.getByText("Session Complete")).toBeInTheDocument();
      expect(screen.getByText("Well done!")).toBeInTheDocument();
    });
  });
});
