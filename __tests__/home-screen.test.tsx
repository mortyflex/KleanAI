import React from "react";
import { render, screen } from "@testing-library/react-native";

// i18n must be initialised before the screen is imported
import "../src/lib/i18n";
import HomeScreen from "../app/(tabs)/index";
import {
  AuthContext,
  type AuthContextValue,
} from "../src/features/auth";

const noopAuth: AuthContextValue = {
  status: "unauthenticated",
  session: null,
  user: null,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(async () => undefined),
  refresh: jest.fn(async () => undefined),
};

function renderHome() {
  return render(
    <AuthContext.Provider value={noopAuth}>
      <HomeScreen />
    </AuthContext.Provider>,
  );
}

describe("HomeScreen", () => {
  it("renders without crashing", () => {
    renderHome();
  });

  it("shows the greeting label (en)", () => {
    renderHome();
    expect(screen.getByText("Good morning,")).toBeTruthy();
  });

  it("shows user name from mock data", () => {
    renderHome();
    expect(screen.getByText(/Mohamed A/)).toBeTruthy();
  });

  it("shows today's overview section (en)", () => {
    renderHome();
    expect(screen.getByText("Today's Overview")).toBeTruthy();
  });

  it("shows quick actions section (en)", () => {
    renderHome();
    expect(screen.getByText("Quick Actions")).toBeTruthy();
  });

  it("shows coach tip label (en)", () => {
    renderHome();
    expect(screen.getByText("Coach's Tip")).toBeTruthy();
  });

  it("shows the CTA button (en)", () => {
    renderHome();
    expect(screen.getByText("Start Today's Workout 💪")).toBeTruthy();
  });

});
