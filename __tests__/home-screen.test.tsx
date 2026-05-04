import React from "react";
import { render, screen } from "@testing-library/react-native";

// i18n must be initialised before the screen is imported
import "../src/lib/i18n";
import HomeScreen from "../app/(tabs)/index";

describe("HomeScreen", () => {
  it("renders without crashing", () => {
    render(<HomeScreen />);
  });

  it("shows the greeting label (en)", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Good morning,")).toBeTruthy();
  });

  it("shows user name from mock data", () => {
    render(<HomeScreen />);
    expect(screen.getByText(/Mohamed A/)).toBeTruthy();
  });

  it("shows today's overview section (en)", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Today's Overview")).toBeTruthy();
  });

  it("shows quick actions section (en)", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Quick Actions")).toBeTruthy();
  });

  it("shows coach tip label (en)", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Coach's Tip")).toBeTruthy();
  });

  it("shows the CTA button (en)", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Start Today's Workout 💪")).toBeTruthy();
  });
});
