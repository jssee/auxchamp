import type { RemoteQuery, RemoteForm, RemoteFormInput } from "@sveltejs/kit";
import * as v from "valibot";

import { battleSelectSchema } from "$lib/server/db/schema";

type Battle = v.InferInput<typeof battleSelectSchema>;

declare function getBattles(): RemoteQuery<Battle[]>;
declare function getBattle(id: string): RemoteQuery<Battle>;
declare function updateBattle(
  data: RemoteFormInput,
): RemoteForm<RemoteFormInput, Battle>;
declare function deleteBattle(id: string): RemoteForm<RemoteFormInput, Battle>;
declare function createBattle(
  date: RemoteFormInput,
): RemoteForm<RemoteFormInput, Battle>;

export { getBattles, getBattle, updateBattle, deleteBattle, createBattle };
