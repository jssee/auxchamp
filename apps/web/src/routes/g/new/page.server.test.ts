import { expect, test } from "bun:test";
import dotenv from "dotenv";
import { isRedirect } from "@sveltejs/kit";

dotenv.config({
  path: new URL("../../../../.env", import.meta.url).pathname,
});

const { load } = await import("./+page.server");

test("redirects unauthenticated requests to /signin with return path and message", async () => {
  try {
    await load({
      request: new Request("http://localhost/g/new"),
      url: new URL("http://localhost/g/new"),
    } as never);

    throw new Error("Expected load to redirect.");
  } catch (thrown) {
    expect(isRedirect(thrown)).toBe(true);

    if (isRedirect(thrown)) {
      expect(thrown.status).toBe(303);
      const location = new URL(thrown.location, "http://localhost");
      expect(location.pathname).toBe("/signin");
      expect(location.searchParams.get("redirectTo")).toBe("/g/new");
      expect(location.searchParams.get("message")).toBe("Sign in to create a game");
    }
  }
});
