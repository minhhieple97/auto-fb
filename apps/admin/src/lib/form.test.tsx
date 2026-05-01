import { describe, expect, it } from "vitest";
import { stringField } from "./form.js";

describe("form helpers", () => {
  it("trims non-empty string fields and falls back for blank or missing values", () => {
    const form = new FormData();
    form.set("name", "  Launch  ");
    form.set("blank", "   ");

    expect(stringField(form, "name")).toBe("Launch");
    expect(stringField(form, "blank", "fallback")).toBe("fallback");
    expect(stringField(form, "missing", "fallback")).toBe("fallback");
  });
});
