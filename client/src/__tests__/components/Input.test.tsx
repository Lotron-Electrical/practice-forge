import { describe, it, expect } from "vitest";
import { render } from "../../test/helpers";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input, Textarea, Select } from "../../components/ui/Input";

describe("Input", () => {
  it("renders without label", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("renders with label", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("generates id from label", () => {
    render(<Input label="Display name" />);
    const input = screen.getByLabelText("Display name");
    expect(input.id).toBe("display-name");
  });

  it("accepts user input", async () => {
    const user = userEvent.setup();
    render(<Input label="Name" />);
    const input = screen.getByLabelText("Name");
    await user.type(input, "Hello");
    expect(input).toHaveValue("Hello");
  });

  it("passes HTML attributes through", () => {
    render(<Input label="Pass" type="password" required />);
    const input = screen.getByLabelText("Pass");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toBeRequired();
  });
});

describe("Textarea", () => {
  it("renders with label", () => {
    render(<Textarea label="Notes" />);
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("accepts user input", async () => {
    const user = userEvent.setup();
    render(<Textarea label="Notes" />);
    const textarea = screen.getByLabelText("Notes");
    await user.type(textarea, "Some notes");
    expect(textarea).toHaveValue("Some notes");
  });
});

describe("Select", () => {
  it("renders with label and options", () => {
    render(
      <Select label="Priority">
        <option value="high">High</option>
        <option value="low">Low</option>
      </Select>,
    );
    expect(screen.getByLabelText("Priority")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("handles selection change", async () => {
    const user = userEvent.setup();
    render(
      <Select label="Priority">
        <option value="high">High</option>
        <option value="low">Low</option>
      </Select>,
    );
    const select = screen.getByLabelText("Priority");
    await user.selectOptions(select, "low");
    expect(select).toHaveValue("low");
  });
});
