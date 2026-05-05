import React from "react";
import { render, screen } from "@testing-library/react-native";
import { KleanText } from "../src/components/ui/klean-text";
import { typography } from "../src/theme/typography";
import { colors } from "../src/design/tokens";

function styleOf(testID: string) {
  const element = screen.getByTestId(testID);
  const style = element.props.style;
  return Array.isArray(style)
    ? Object.assign({}, ...style.filter(Boolean))
    : style;
}

describe("KleanText", () => {
  it("renders its children", () => {
    render(<KleanText>Klean AI</KleanText>);
    expect(screen.getByText("Klean AI")).toBeTruthy();
  });

  it("uses the body variant by default", () => {
    render(<KleanText testID="t">hi</KleanText>);
    const style = styleOf("t");
    expect(style.fontSize).toBe(typography.body.fontSize);
    expect(style.lineHeight).toBe(typography.body.lineHeight);
    expect(style.fontWeight).toBe(typography.body.fontWeight);
    expect(style.fontFamily).toBe(typography.body.fontFamily);
  });

  it("applies the requested variant", () => {
    render(
      <KleanText testID="t" variant="h1">
        Title
      </KleanText>,
    );
    const style = styleOf("t");
    expect(style.fontSize).toBe(typography.h1.fontSize);
    expect(style.fontWeight).toBe(typography.h1.fontWeight);
    expect(style.fontFamily).toBe(typography.h1.fontFamily);
  });

  it("falls back to ink color when none is provided", () => {
    render(<KleanText testID="t">x</KleanText>);
    expect(styleOf("t").color).toBe(colors.ink);
  });

  it("applies the color prop", () => {
    render(
      <KleanText testID="t" color={colors.brand}>
        x
      </KleanText>,
    );
    expect(styleOf("t").color).toBe(colors.brand);
  });

  it("applies textAlign when align is provided", () => {
    render(
      <KleanText testID="t" align="center">
        x
      </KleanText>,
    );
    expect(styleOf("t").textAlign).toBe("center");
  });

  it("does not set textAlign when align is omitted", () => {
    render(<KleanText testID="t">x</KleanText>);
    expect(styleOf("t").textAlign).toBeUndefined();
  });

  it("respects an explicit weight override", () => {
    render(
      <KleanText testID="t" variant="body" weight="700">
        x
      </KleanText>,
    );
    expect(styleOf("t").fontWeight).toBe("700");
  });

  it("merges caller-provided style on top of the variant", () => {
    render(
      <KleanText testID="t" variant="caption" style={{ marginTop: 4 }}>
        x
      </KleanText>,
    );
    const style = styleOf("t");
    expect(style.marginTop).toBe(4);
    expect(style.fontSize).toBe(typography.caption.fontSize);
  });

  it("forwards numberOfLines for truncation", () => {
    render(
      <KleanText testID="t" numberOfLines={1}>
        x
      </KleanText>,
    );
    expect(screen.getByTestId("t").props.numberOfLines).toBe(1);
  });
});
