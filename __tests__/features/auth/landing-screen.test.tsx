import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import "../../../src/lib/i18n";

import LandingScreen from "../../../app/(auth)/landing";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

describe("AuthLandingScreen", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("offers both 'Get started' and 'I already have an account' CTAs", () => {
    render(<LandingScreen />);
    expect(screen.getByTestId("auth-landing-start")).toBeTruthy();
    expect(screen.getByTestId("auth-landing-sign-in")).toBeTruthy();
  });

  it("renders translated copy from the i18n bundle", () => {
    render(<LandingScreen />);
    expect(screen.getByText("Get started")).toBeTruthy();
    expect(screen.getByText("I already have an account")).toBeTruthy();
  });

  it("routes to onboarding on 'Get started'", () => {
    render(<LandingScreen />);
    fireEvent.press(screen.getByTestId("auth-landing-start"));
    expect(mockPush).toHaveBeenCalledWith("/(onboarding)/goal");
  });

  it("routes to login on 'I already have an account'", () => {
    render(<LandingScreen />);
    fireEvent.press(screen.getByTestId("auth-landing-sign-in"));
    expect(mockPush).toHaveBeenCalledWith("/(auth)/login");
  });
});
