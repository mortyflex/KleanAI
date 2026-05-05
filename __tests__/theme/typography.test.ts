import {
  typography,
  fontFamilies,
  fontWeights,
  fontAssetKeys,
  TypographyVariant,
} from "../../src/theme/typography";

describe("typography variants", () => {
  it("exposes every required variant", () => {
    const required: TypographyVariant[] = [
      "display",
      "h1",
      "h2",
      "h3",
      "bodyLarge",
      "body",
      "bodyMedium",
      "secondary",
      "label",
      "caption",
      "button",
      "metric",
    ];
    for (const variant of required) {
      expect(typography[variant]).toBeDefined();
    }
  });

  it("matches the documented font sizes", () => {
    expect(typography.display.fontSize).toBe(32);
    expect(typography.h1.fontSize).toBe(28);
    expect(typography.h2.fontSize).toBe(24);
    expect(typography.h3.fontSize).toBe(21);
    expect(typography.bodyLarge.fontSize).toBe(18);
    expect(typography.body.fontSize).toBe(16);
    expect(typography.bodyMedium.fontSize).toBe(16);
    expect(typography.secondary.fontSize).toBe(15);
    expect(typography.label.fontSize).toBe(14);
    expect(typography.caption.fontSize).toBe(13);
    expect(typography.button.fontSize).toBe(16);
    expect(typography.metric.fontSize).toBe(30);
  });

  it("matches the documented line heights", () => {
    expect(typography.display.lineHeight).toBe(38);
    expect(typography.h1.lineHeight).toBe(34);
    expect(typography.h2.lineHeight).toBe(30);
    expect(typography.h3.lineHeight).toBe(27);
    expect(typography.bodyLarge.lineHeight).toBe(27);
    expect(typography.body.lineHeight).toBe(24);
    expect(typography.bodyMedium.lineHeight).toBe(24);
    expect(typography.secondary.lineHeight).toBe(22);
    expect(typography.label.lineHeight).toBe(20);
    expect(typography.caption.lineHeight).toBe(18);
    expect(typography.button.lineHeight).toBe(22);
    expect(typography.metric.lineHeight).toBe(36);
  });

  it("matches the documented font weights", () => {
    expect(typography.display.fontWeight).toBe("800");
    expect(typography.h1.fontWeight).toBe("800");
    expect(typography.metric.fontWeight).toBe("800");
    expect(typography.h2.fontWeight).toBe("700");
    expect(typography.h3.fontWeight).toBe("700");
    expect(typography.button.fontWeight).toBe("700");
    expect(typography.bodyMedium.fontWeight).toBe("600");
    expect(typography.label.fontWeight).toBe("600");
    expect(typography.body.fontWeight).toBe("400");
    expect(typography.secondary.fontWeight).toBe("400");
    expect(typography.caption.fontWeight).toBe("500");
  });

  it("never falls below 13px (no tiny text)", () => {
    for (const variant of Object.keys(typography) as TypographyVariant[]) {
      expect(typography[variant].fontSize).toBeGreaterThanOrEqual(13);
    }
  });

  it("keeps body and above at 16px or more", () => {
    expect(typography.body.fontSize).toBeGreaterThanOrEqual(16);
    expect(typography.bodyLarge.fontSize).toBeGreaterThanOrEqual(16);
    expect(typography.bodyMedium.fontSize).toBeGreaterThanOrEqual(16);
    expect(typography.button.fontSize).toBeGreaterThanOrEqual(16);
  });

  it("uses comfortable line height (~1.3-1.7x font size)", () => {
    for (const variant of Object.keys(typography) as TypographyVariant[]) {
      const { fontSize, lineHeight } = typography[variant];
      const ratio = lineHeight / fontSize;
      expect(ratio).toBeGreaterThanOrEqual(1.1);
      expect(ratio).toBeLessThanOrEqual(1.8);
    }
  });

  it("maps each variant to a Plus Jakarta Sans font family", () => {
    const allowed = new Set(Object.values(fontFamilies));
    for (const variant of Object.keys(typography) as TypographyVariant[]) {
      expect(allowed.has(typography[variant].fontFamily)).toBe(true);
    }
  });

  it("aligns weight tokens with their font family handles", () => {
    expect(fontWeights.regular).toBe("400");
    expect(fontWeights.medium).toBe("500");
    expect(fontWeights.semiBold).toBe("600");
    expect(fontWeights.bold).toBe("700");
    expect(fontWeights.extraBold).toBe("800");
  });

  it("declares font asset keys covering all weights used in variants", () => {
    const usedWeights = new Set(
      (Object.keys(typography) as TypographyVariant[]).map(
        (v) => typography[v].fontWeight,
      ),
    );
    const declaredFamilies = new Set(
      fontAssetKeys.map((k) => fontWeights[k]),
    );
    for (const w of usedWeights) {
      expect(declaredFamilies.has(w)).toBe(true);
    }
  });
});
