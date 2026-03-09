import { createRouterClient } from "@orpc/server";
import { createContext } from "@auxchamp/api/context";
import { appRouter } from "@auxchamp/api/router";

export function createApi(request: Request) {
  return createRouterClient(appRouter, {
    context: () => createContext({ request }),
  });
}
