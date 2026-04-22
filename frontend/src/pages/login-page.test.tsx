import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./login-page";

const loginMock = vi.fn();

vi.mock("../auth/auth-context", () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}));

describe("LoginPage", () => {
  it("renders and validates form", async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByText("Invalid email")).toBeInTheDocument();
  });
});
