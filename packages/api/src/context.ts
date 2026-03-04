import { auth } from "@auxchamp/auth";

export type CreateContextOptions = {
  request: Request;
};

export async function createContext({ request }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  return {
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
