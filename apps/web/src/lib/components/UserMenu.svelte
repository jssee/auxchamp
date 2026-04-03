<script lang="ts">
  import { goto } from "$app/navigation";
  import { authClient } from "$lib/auth/client";
  import { Button } from "$lib/components/ui/button";
  import * as Avatar from "$lib/components/ui/avatar";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import {
    UserCircleIcon,
    Settings01Icon,
    Logout01Icon,
  } from "@hugeicons/core-free-icons";

  const sessionQuery = authClient.useSession();

  function displayName(user: {
    name?: string | null;
    username?: string | null;
    displayUsername?: string | null;
    email?: string | null;
  }): string {
    if (user.name && user.name !== user.username) return user.name;
    return (
      user.displayUsername ||
      user.username ||
      user.email?.split("@")[0] ||
      "User"
    );
  }

  function initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  }

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => goto("/"),
        onError: (error) => console.error("Sign out failed:", error),
      },
    });
  }
</script>

{#if $sessionQuery.isPending}
  <Skeleton class="size-8 rounded-full" />
{:else if $sessionQuery.data?.user}
  {@const user = $sessionQuery.data.user}
  {@const name = displayName(user)}
  {@const profileHref = user.username ? `/u/${user.username}` : "/me"}

  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="rounded-full transition-opacity outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label="Account menu"
    >
      <Avatar.Root size="default">
        <Avatar.Fallback class="bg-accent text-xs text-accent-foreground">
          {initials(name)}
        </Avatar.Fallback>
      </Avatar.Root>
    </DropdownMenu.Trigger>

    <DropdownMenu.Content align="end" class="w-56">
      <DropdownMenu.Label>
        <div class="font-medium text-foreground">{name}</div>
        {#if user.email}
          <div class="mt-0.5 truncate font-normal">{user.email}</div>
        {/if}
      </DropdownMenu.Label>

      <DropdownMenu.Separator />

      <DropdownMenu.Group>
        <DropdownMenu.Item onSelect={() => goto(profileHref)}>
          <HugeiconsIcon icon={UserCircleIcon} />
          Profile
        </DropdownMenu.Item>

        <DropdownMenu.Item onSelect={() => goto("/me")}>
          <HugeiconsIcon icon={Settings01Icon} />
          Settings
        </DropdownMenu.Item>
      </DropdownMenu.Group>

      <DropdownMenu.Separator />

      <DropdownMenu.Item variant="destructive" onSelect={handleSignOut}>
        <HugeiconsIcon icon={Logout01Icon} />
        Sign out
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{:else}
  <Button variant="default" size="sm" href="/signin">Sign in</Button>
{/if}
