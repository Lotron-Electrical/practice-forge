import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, mockAuthValue } from "../../test/helpers";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "../../pages/LoginPage";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // LoginPage redirects when authenticated — render as unauthenticated
    mockAuthValue.isAuthenticated = false;
    mockAuthValue.user = null;
  });

  it("renders without crashing", () => {
    render(<LoginPage />);
    expect(screen.getByText("PRACTICE")).toBeInTheDocument();
    expect(screen.getByText("FORGE")).toBeInTheDocument();
  });

  it("shows tagline", () => {
    render(<LoginPage />);
    expect(screen.getByText("Shape your sound.")).toBeInTheDocument();
  });

  it("displays Sign In and Create Account tabs", () => {
    render(<LoginPage />);
    // Both texts appear (as tab + submit button), just verify they're present
    expect(screen.getAllByText("Sign In").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Create Account").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("shows email and password fields on login tab", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("does not show display name on login tab", () => {
    render(<LoginPage />);
    expect(screen.queryByLabelText("Display name")).not.toBeInTheDocument();
  });

  it("shows display name field on register tab", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    // Click the tab button (first "Create Account" text, which is the tab)
    await user.click(screen.getAllByText("Create Account")[0]);
    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
  });

  it("submit button is disabled when fields are empty", () => {
    render(<LoginPage />);
    // The submit button is inside <form> and rendered by the Button component
    const form = document.querySelector("form")!;
    const submitBtn = form.querySelector("button")!;
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit button when email and password filled", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    const form = document.querySelector("form")!;
    const submitBtn = form.querySelector("button")!;
    expect(submitBtn).not.toBeDisabled();
  });

  it("calls login on form submit", async () => {
    const user = userEvent.setup();
    mockAuthValue.login.mockResolvedValue(undefined);
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    const form = document.querySelector("form")!;
    const submitBtn = form.querySelector("button")!;
    await user.click(submitBtn);
    expect(mockAuthValue.login).toHaveBeenCalledWith(
      "test@example.com",
      "password123",
    );
  });

  it("shows error message on login failure", async () => {
    const user = userEvent.setup();
    mockAuthValue.login.mockRejectedValue(new Error("Invalid credentials"));
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    const form = document.querySelector("form")!;
    const submitBtn = form.querySelector("button")!;
    await user.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("shows loading state during submit", async () => {
    const user = userEvent.setup();
    let resolveLogin: () => void;
    mockAuthValue.login.mockReturnValue(
      new Promise<void>((r) => {
        resolveLogin = r;
      }),
    );
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    const form = document.querySelector("form")!;
    const submitBtn = form.querySelector("button")!;
    await user.click(submitBtn);
    expect(screen.getByText("Please wait...")).toBeInTheDocument();
    resolveLogin!();
  });

  it("calls register on register tab submit", async () => {
    const user = userEvent.setup();
    mockAuthValue.register.mockResolvedValue(undefined);
    render(<LoginPage />);
    // Switch to register mode by clicking the tab
    await user.click(screen.getAllByText("Create Account")[0]);
    await user.type(screen.getByLabelText("Display name"), "New User");
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    const form = document.querySelector("form")!;
    const submitBtn = form.querySelector("button")!;
    await user.click(submitBtn);
    await waitFor(() => {
      expect(mockAuthValue.register).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        display_name: "New User",
      });
    });
  });
});
