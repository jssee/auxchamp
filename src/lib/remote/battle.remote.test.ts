import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { battleInsertSchema, battleUpdateSchema } from "$lib/server/db/schema";

// Pick the same fields used in the remote functions
const battleFormSchema = v.required(
  v.pick(battleInsertSchema, [
    "name",
    "visibility",
    "maxPlayers",
    "doubleSubmissions",
  ]),
);

const battleUpdateFormSchema = v.pick(battleUpdateSchema, [
  "name",
  "visibility",
  "maxPlayers",
  "doubleSubmissions",
]);

describe("battleFormSchema (create)", () => {
  it("accepts valid battle data", () => {
    const result = v.safeParse(battleFormSchema, {
      name: "My Battle",
      visibility: "private",
      maxPlayers: 8,
      doubleSubmissions: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.name).toBe("My Battle");
      expect(result.output.visibility).toBe("private");
      expect(result.output.maxPlayers).toBe(8);
      expect(result.output.doubleSubmissions).toBe(false);
    }
  });

  it("rejects empty name", () => {
    const result = v.safeParse(battleFormSchema, {
      name: "",
      visibility: "private",
      maxPlayers: 8,
      doubleSubmissions: false,
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid visibility", () => {
    const result = v.safeParse(battleFormSchema, {
      name: "My Battle",
      visibility: "invalid",
      maxPlayers: 8,
      doubleSubmissions: false,
    });

    expect(result.success).toBe(false);
  });

  it("rejects maxPlayers below 2", () => {
    const result = v.safeParse(battleFormSchema, {
      name: "My Battle",
      visibility: "private",
      maxPlayers: 1,
      doubleSubmissions: false,
    });

    expect(result.success).toBe(false);
  });

  it("rejects maxPlayers above 32", () => {
    const result = v.safeParse(battleFormSchema, {
      name: "My Battle",
      visibility: "private",
      maxPlayers: 100,
      doubleSubmissions: false,
    });

    expect(result.success).toBe(false);
  });

  it("requires all fields", () => {
    const result = v.safeParse(battleFormSchema, {
      name: "My Battle",
    });

    expect(result.success).toBe(false);
  });
});

describe("battleUpdateFormSchema", () => {
  it("accepts partial updates", () => {
    const result = v.safeParse(battleUpdateFormSchema, {
      name: "Updated Name",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.name).toBe("Updated Name");
      expect(result.output.visibility).toBeUndefined();
    }
  });

  it("accepts full updates", () => {
    const result = v.safeParse(battleUpdateFormSchema, {
      name: "Updated Battle",
      visibility: "public",
      maxPlayers: 16,
      doubleSubmissions: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid visibility on update", () => {
    const result = v.safeParse(battleUpdateFormSchema, {
      visibility: "invalid",
    });

    expect(result.success).toBe(false);
  });
});
