import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import "../src/lib/i18n";

import { PasswordField } from "../src/components/ui/password-field";

describe("PasswordField", () => {
  it("renders the label and starts masked (secureTextEntry true)", () => {
    render(
      <PasswordField
        label="Password"
        value="hunter2"
        onChangeText={() => undefined}
        testID="pw-input"
        toggleTestID="pw-toggle"
      />,
    );
    const input = screen.getByTestId("pw-input");
    expect(input.props.secureTextEntry).toBe(true);
  });

  it("toggles secureTextEntry off when the eye is pressed", () => {
    render(
      <PasswordField
        label="Password"
        value="hunter2"
        onChangeText={() => undefined}
        testID="pw-input"
        toggleTestID="pw-toggle"
      />,
    );
    fireEvent.press(screen.getByTestId("pw-toggle"));
    expect(screen.getByTestId("pw-input").props.secureTextEntry).toBe(false);
    fireEvent.press(screen.getByTestId("pw-toggle"));
    expect(screen.getByTestId("pw-input").props.secureTextEntry).toBe(true);
  });

  it("propagates onChangeText", () => {
    const onChange = jest.fn();
    render(
      <PasswordField
        label="Password"
        value=""
        onChangeText={onChange}
        testID="pw-input"
      />,
    );
    fireEvent.changeText(screen.getByTestId("pw-input"), "abc12345");
    expect(onChange).toHaveBeenCalledWith("abc12345");
  });

  it("renders the error message under the field", () => {
    render(
      <PasswordField
        label="Password"
        value=""
        onChangeText={() => undefined}
        error="Required"
        testID="pw-input"
      />,
    );
    expect(screen.getByText("Required")).toBeTruthy();
  });
});
