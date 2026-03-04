import { expect, test } from "bun:test";

import { auth, createAuth } from "./index";

test("createAuth allows framework-specific plugins without changing the shared auth export", () => {
  const plugin = {
    id: "test-plugin",
  };

  const appAuth = createAuth({ plugins: [plugin] });

  expect(auth).toBeDefined();
  expect(appAuth).toBeDefined();
  expect(appAuth.options.plugins).toContain(plugin);
  expect(auth.options.plugins).not.toContain(plugin);
});
