import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PillButton, FilterPill } from "../src/components/ui/pill-button";

describe("PillButton", () => {
  it("renders its label", () => {
    render(<PillButton label="Start Workout" />);
    expect(screen.getByText("Start Workout")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    render(<PillButton label="Tap me" onPress={onPress} />);
    fireEvent.press(screen.getByText("Tap me"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders filled variant by default", () => {
    render(<PillButton label="Filled" />);
    expect(screen.getByText("Filled")).toBeTruthy();
  });

  it("renders outline variant", () => {
    render(<PillButton label="Outline" variant="outline" />);
    expect(screen.getByText("Outline")).toBeTruthy();
  });

  it("renders ghost variant", () => {
    render(<PillButton label="Ghost" variant="ghost" />);
    expect(screen.getByText("Ghost")).toBeTruthy();
  });
});

describe("FilterPill", () => {
  it("renders label", () => {
    render(<FilterPill label="Strength" active={false} onPress={jest.fn()} />);
    expect(screen.getByText("Strength")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    render(<FilterPill label="Cardio" active={false} onPress={onPress} />);
    fireEvent.press(screen.getByText("Cardio"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders in active state without crash", () => {
    render(<FilterPill label="All" active={true} onPress={jest.fn()} />);
    expect(screen.getByText("All")).toBeTruthy();
  });
});
