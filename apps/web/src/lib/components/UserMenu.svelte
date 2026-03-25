<script lang="ts">
  import { goto } from "$app/navigation";
  import { authClient } from "$lib/auth/client";

  const sessionQuery = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          goto("/");
        },
        onError: (error) => {
          console.error("Sign out failed:", error);
        },
      },
    });
  }

  function goTosignin() {
    goto("/signin");
  }
</script>

<div class="relative">
  {#if $sessionQuery.isPending}
    <div class="h-8 w-24 animate-pulse rounded bg-neutral-700"></div>
  {:else if $sessionQuery.data?.user}
    {@const user = $sessionQuery.data.user}
    <div class="flex items-center gap-3">
      <span
        class="hidden text-sm text-neutral-300 sm:inline"
        title={user.email}
      >
        <a
          href={user.username ? `/u/${user.username}` : "/me"}
          class="hover:text-white"
        >
          {user.name && user.name !== user.username
            ? user.name
            : user.displayUsername ||
              user.username ||
              user.email?.split("@")[0] ||
              "User"}
        </a>
      </span>
      <a
        href="/me"
        class="rounded bg-neutral-800 px-3 py-1 text-sm text-white transition-colors hover:bg-neutral-700"
      >
        Settings
      </a>
      <button
        onclick={handleSignOut}
        class="rounded bg-red-600 px-3 py-1 text-sm text-white transition-colors hover:bg-red-700"
      >
        Sign Out
      </button>
    </div>
  {:else}
    <div class="flex items-center gap-2">
      <button
        onclick={goTosignin}
        class="rounded bg-indigo-600 px-3 py-1 text-sm text-white transition-colors hover:bg-indigo-700"
      >
        Sign In
      </button>
    </div>
  {/if}
</div>
