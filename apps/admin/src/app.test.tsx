import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./app.js";
import { renderWithClient } from "./test/render.js";

const supabaseMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  setCurrentAuthSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("./lib/supabase.js", () => ({
  getAuthAccessToken: vi.fn(() => "jwt-1"),
  getSupabaseClient: () => ({
    auth: {
      getSession: supabaseMock.getSession,
      onAuthStateChange: supabaseMock.onAuthStateChange,
      signInWithPassword: supabaseMock.signInWithPassword,
      signOut: supabaseMock.signOut
    }
  }),
  isSupabaseConfigured: true,
  missingSupabaseEnv: [],
  setCurrentAuthSession: supabaseMock.setCurrentAuthSession
}));

const session = {
  access_token: "jwt-1",
  expires_in: 3600,
  refresh_token: "refresh-1",
  token_type: "bearer",
  user: {
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-05-01T00:00:00.000Z",
    email: "admin@example.com",
    id: "user-1",
    user_metadata: {}
  }
};

function mockApiResponses() {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } })
  );
}

function mockAuthListener() {
  supabaseMock.onAuthStateChange.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: vi.fn()
      }
    }
  });
}

describe("admin app auth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    supabaseMock.getSession.mockReset();
    supabaseMock.onAuthStateChange.mockReset();
    supabaseMock.setCurrentAuthSession.mockReset();
    supabaseMock.signInWithPassword.mockReset();
    supabaseMock.signOut.mockReset();
    mockAuthListener();
  });

  it("renders the login page when no Supabase session exists", async () => {
    supabaseMock.getSession.mockResolvedValue({ data: { session: null }, error: null });

    renderWithClient(<App />);

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByText("Campaigns")).not.toBeInTheDocument();
  });

  it("renders campaign, source, draft, timeline, and history surfaces after authentication", async () => {
    mockApiResponses();
    supabaseMock.getSession.mockResolvedValue({ data: { session }, error: null });

    renderWithClient(<App />);

    expect(await screen.findByText("Campaigns")).toBeInTheDocument();
    expect(screen.getByText("Sources")).toBeInTheDocument();
    expect(screen.getByText("Approval inbox")).toBeInTheDocument();
    expect(screen.getByText("Agent timeline")).toBeInTheDocument();
    expect(screen.getByText("Published history")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });

  it("signs in with Supabase email and password", async () => {
    const user = userEvent.setup();
    mockApiResponses();
    supabaseMock.getSession.mockResolvedValue({ data: { session: null }, error: null });
    supabaseMock.signInWithPassword.mockResolvedValue({ data: { session }, error: null });

    renderWithClient(<App />);

    await user.type(await screen.findByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(supabaseMock.signInWithPassword).toHaveBeenCalledWith({
        email: "admin@example.com",
        password: "correct-password"
      })
    );
    expect(await screen.findByText("Campaigns")).toBeInTheDocument();
  });

  it("signs out of the current Supabase session", async () => {
    const user = userEvent.setup();
    mockApiResponses();
    supabaseMock.getSession.mockResolvedValue({ data: { session }, error: null });
    supabaseMock.signOut.mockResolvedValue({ error: null });

    renderWithClient(<App />);

    await user.click(await screen.findByRole("button", { name: /sign out/i }));

    await waitFor(() => expect(supabaseMock.signOut).toHaveBeenCalledWith({ scope: "local" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });
});
