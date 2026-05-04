import React from "react";
import { render, screen } from "@testing-library/react-native";
import HomeScreen from "../app/(tabs)/index";

describe("HomeScreen", () => {
  it("renders without crashing", () => {
    render(<HomeScreen />);
  });

  it("shows the user greeting", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Good morning,")).toBeTruthy();
  });

  it("shows the user name from mock data", () => {
    render(<HomeScreen />);
    expect(screen.getByText(/Mohamed A/)).toBeTruthy();
  });

  it("shows today's overview section", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Today's Overview")).toBeTruthy();
  });

  it("shows quick actions section", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Quick Actions")).toBeTruthy();
  });

  it("shows coach tip card", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Coach's Tip")).toBeTruthy();
  });

  it("shows the CTA button", () => {
    render(<HomeScreen />);
    expect(screen.getByText(/Start Today's Workout/)).toBeTruthy();
  });
});
