import { expect, test } from "bun:test";
import dotenv from "dotenv";
import { isRedirect } from "@sveltejs/kit";

dotenv.config({
  path: new URL("../../../../.env", import.meta.url).pathname,
});

const { load } = await import("./+page.server");

test("redirects unauthenticated requests to /signin with a return path", async () => {
  try {
    await load({
      request: new Request("http://localhost/me"),
      url: new URL("http://localhost/me"),
    } as never);

    throw new Error("Expected load to redirect.");
  } catch (thrown) {
    expect(isRedirect(thrown)).toBe(true);

    if (isRedirect(thrown)) {
      expect(thrown.status).toBe(303);
      expect(thrown.location).toBe("/signin?redirectTo=%2Fme");
    }
  }
});
