import type { RequestHandler } from "./$types";

import { handleRpc } from "$lib/server/orpc-handlers";

const handle: RequestHandler = async ({ request }) => {
  const result = await handleRpc(request);

  if (!result.matched) {
    return new Response("Not Found", { status: 404 });
  }

  return result.response;
};

export const GET = handle;
export const POST = handle;
export const OPTIONS = handle;
