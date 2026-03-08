import { expect, test } from "bun:test";
import dotenv from "dotenv";
import { isRedirect } from "@sveltejs/kit";

dotenv.config({
  path: new URL("../../../../.env", import.meta.url).pathname,
});

const { load } = await import("./+page.server");

test("redirects unauthenticated requests to /login", async () => {
  try {
    await load({
      params: { id: "game_123" },
      request: new Request("http://localhost/games/game_123"),
    } as never);

    throw new Error("Expected load to redirect.");
  } catch (thrown) {
    expect(isRedirect(thrown)).toBe(true);

    if (isRedirect(thrown)) {
      expect(thrown.status).toBe(303);
      expect(thrown.location).toBe("/login");
    }
  }
});
