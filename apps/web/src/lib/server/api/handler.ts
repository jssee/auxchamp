import { createContext } from "@auxchamp/api/context";
import { appRouter } from "@auxchamp/api/router";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { experimental_ValibotToJsonSchemaConverter as ValibotToJsonSchemaConverter } from "@orpc/valibot";

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

const openApiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ValibotToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export async function handleRpc(request: Request) {
  const context = await createContext({ request });

  return rpcHandler.handle(request, {
    prefix: "/rpc",
    context,
  });
}

export async function handleApiReference(request: Request) {
  const context = await createContext({ request });

  return openApiHandler.handle(request, {
    prefix: "/api-reference",
    context,
  });
}
