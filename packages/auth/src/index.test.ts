import { expect, test } from "bun:test";
import dotenv from "dotenv";

dotenv.config({
  path: new URL("../../../apps/web/.env", import.meta.url).pathname,
});

const { auth, createAuth } = await import("./index");

test("createAuth keeps the shared username plugin while allowing framework-specific plugins", () => {
  const plugin = {
    id: "test-plugin",
  };

  const appAuth = createAuth({ plugins: [plugin] });

  expect(auth).toBeDefined();
  expect(appAuth).toBeDefined();
  expect(
    auth.options.plugins.some((entry) => entry.id === "username"),
  ).toBeTrue();
  expect(
    appAuth.options.plugins.some((entry) => entry.id === "username"),
  ).toBeTrue();
  expect(appAuth.options.plugins).toContain(plugin);
  expect(auth.options.plugins).not.toContain(plugin);
});
