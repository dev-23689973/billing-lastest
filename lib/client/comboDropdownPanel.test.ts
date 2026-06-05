import { describe, expect, it } from "vitest";
import { computeComboDropdownPanelPos, computeComboDropdownPanelPosInContainer } from "./comboDropdownPanel";

const vp = { height: 500, offsetTop: 0 };

describe("computeComboDropdownPanelPos", () => {
  it("opens below the trigger when there is enough space", () => {
    const pos = computeComboDropdownPanelPos(
      { top: 100, bottom: 140, left: 8, width: 320 },
      vp,
    );
    expect(pos.top).toBe(144);
    expect(pos.left).toBe(8);
    expect(pos.width).toBe(320);
    expect(pos.maxHeight).toBeGreaterThanOrEqual(160);
  });

  it("opens above the trigger when space below is tight", () => {
    const pos = computeComboDropdownPanelPos(
      { top: 380, bottom: 420, left: 0, width: 300 },
      vp,
    );
    expect(pos.top).toBeLessThan(380);
    expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(420 - 4);
  });

  it("uses the visual viewport when the keyboard shrinks visible height", () => {
    const keyboardVp = { height: 220, offsetTop: 180 };
    const pos = computeComboDropdownPanelPos(
      { top: 360, bottom: 400, left: 16, width: 280 },
      keyboardVp,
    );
    expect(pos.top).toBeLessThan(360);
    expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(400);
  });
});

describe("computeComboDropdownPanelPosInContainer", () => {
  it("returns absolute coords relative to the container", () => {
    const trigger = {
      getBoundingClientRect: () => ({ top: 200, bottom: 240, left: 40, width: 280, right: 320, height: 40, x: 40, y: 200, toJSON: () => ({}) }),
    } as HTMLElement;
    const container = {
      getBoundingClientRect: () => ({ top: 80, bottom: 280, left: 20, width: 400, right: 420, height: 200, x: 20, y: 80, toJSON: () => ({}) }),
    } as HTMLElement;

    const pos = computeComboDropdownPanelPosInContainer(trigger, container);
    expect(pos.coordinateMode).toBe("absolute");
    expect(pos.left).toBe(40 - 20);
    expect(pos.width).toBe(280);
    // Height from viewport, not the ~40px gap to the container bottom.
    expect(pos.maxHeight).toBeGreaterThanOrEqual(200);
    expect(pos.top).toBeLessThan(200 - 80);
  });
});
