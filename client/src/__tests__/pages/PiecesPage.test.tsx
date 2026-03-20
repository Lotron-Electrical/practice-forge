import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "../../test/helpers";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PiecesPage } from "../../pages/PiecesPage";
import { api } from "../../api/client";

const mockApi = vi.mocked(api);

describe("PiecesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getPieces.mockResolvedValue([]);
  });

  it("renders without crashing", () => {
    render(<PiecesPage />);
    expect(screen.getByText("Pieces")).toBeInTheDocument();
  });

  it("shows Add Piece button", () => {
    render(<PiecesPage />);
    expect(screen.getByText("Add Piece")).toBeInTheDocument();
  });

  it("shows empty state when no pieces", async () => {
    render(<PiecesPage />);
    await waitFor(() => {
      expect(screen.getByText(/No pieces yet/)).toBeInTheDocument();
    });
  });

  it("opens create form when Add Piece is clicked", async () => {
    const user = userEvent.setup();
    render(<PiecesPage />);
    await user.click(screen.getByText("Add Piece"));
    expect(screen.getByText("New Piece")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Composer")).toBeInTheDocument();
  });

  it("shows cancel button in create form", async () => {
    const user = userEvent.setup();
    render(<PiecesPage />);
    await user.click(screen.getByText("Add Piece"));
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("closes create form on cancel", async () => {
    const user = userEvent.setup();
    render(<PiecesPage />);
    await user.click(screen.getByText("Add Piece"));
    expect(screen.getByText("New Piece")).toBeInTheDocument();
    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByText("New Piece")).not.toBeInTheDocument();
  });

  it("Create Piece button is disabled when title is empty", async () => {
    const user = userEvent.setup();
    render(<PiecesPage />);
    await user.click(screen.getByText("Add Piece"));
    const createBtn = screen.getByText("Create Piece");
    expect(createBtn.closest("button")).toBeDisabled();
  });

  it("creates piece when form is submitted", async () => {
    const user = userEvent.setup();
    mockApi.createPiece.mockResolvedValue({});
    render(<PiecesPage />);
    await user.click(screen.getByText("Add Piece"));
    await user.type(screen.getByLabelText("Title"), "Bach Partita");
    await user.type(screen.getByLabelText("Composer"), "J.S. Bach");
    const createBtn = screen.getByText("Create Piece").closest("button")!;
    expect(createBtn).not.toBeDisabled();
    await user.click(createBtn);
    expect(mockApi.createPiece).toHaveBeenCalled();
  });

  it("displays pieces from API", async () => {
    mockApi.getPieces.mockResolvedValue([
      {
        id: "1",
        title: "Debussy Syrinx",
        composer: "Debussy",
        status: "in_progress",
        priority: "medium",
        difficulty: 6,
        target_date: null,
        sections: [],
        technical_demands: [],
        colour_tag: null,
        general_notes: "",
        historical_context: null,
        created_at: "",
        updated_at: "",
      },
    ] as any);
    render(<PiecesPage />);
    await waitFor(() => {
      expect(screen.getByText("Debussy Syrinx")).toBeInTheDocument();
      expect(screen.getByText("Debussy")).toBeInTheDocument();
    });
  });

  it("shows priority badges on pieces", async () => {
    mockApi.getPieces.mockResolvedValue([
      {
        id: "1",
        title: "Test",
        composer: "Test",
        status: "in_progress",
        priority: "high",
        difficulty: null,
        target_date: null,
        sections: [],
        technical_demands: [],
        colour_tag: null,
        general_notes: "",
        historical_context: null,
        created_at: "",
        updated_at: "",
      },
    ] as any);
    render(<PiecesPage />);
    await waitFor(() => {
      expect(screen.getByText("High")).toBeInTheDocument();
    });
  });
});
