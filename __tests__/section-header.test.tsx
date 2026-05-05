import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { SectionHeader } from "../src/components/ui/section-header";
import { typography } from "../src/theme/typography";

function flatStyle(node: any) {
  const s = node.props.style;
  return Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s;
}

describe("SectionHeader", () => {
  it("renders the title", () => {
    render(<SectionHeader title="Today's Workout" />);
    expect(screen.getByText("Today's Workout")).toBeTruthy();
  });

  it("uses the centralized h3 typography for the title", () => {
    render(<SectionHeader title="Quick Actions" />);
    const titleStyle = flatStyle(screen.getByText("Quick Actions"));
    expect(titleStyle.fontSize).toBe(typography.h3.fontSize);
    expect(titleStyle.lineHeight).toBe(typography.h3.lineHeight);
    expect(titleStyle.fontWeight).toBe(typography.h3.fontWeight);
  });

  it("renders the action label when provided and triggers onAction", () => {
    const onAction = jest.fn();
    render(
      <SectionHeader title="Workouts" action="See all" onAction={onAction} />,
    );
    const action = screen.getByText("See all");
    fireEvent.press(action);
    expect(onAction).toHaveBeenCalledTimes(1);
    const actionStyle = flatStyle(action);
    expect(actionStyle.fontSize).toBe(typography.label.fontSize);
    expect(actionStyle.fontWeight).toBe(typography.label.fontWeight);
  });

  it("does not render an action when omitted", () => {
    render(<SectionHeader title="Today" />);
    expect(screen.queryByText("See all")).toBeNull();
  });
});
