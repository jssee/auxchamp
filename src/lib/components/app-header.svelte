<script lang="ts">
  import House from "@lucide/svelte/icons/house";
  import Globe from "@lucide/svelte/icons/globe";
  import CircleUserRound from "@lucide/svelte/icons/circle-user-round";
  import * as NavigationMenu from "$lib/components/ui/navigation-menu";
  import { Button } from "$lib/components/ui/button";
  import { authContext } from "$lib/auth/client";

  const session = authContext.get();
</script>

<header class="col-content h-16">
  <div class="flex h-16 items-center justify-between gap-4">
    <a class="font-display font-bold" href="/">auxchamp</a>

    <NavigationMenu.Root class="col-content">
      <NavigationMenu.List class="relative flex gap-2">
        {#if $session.isPending}
          <div class="h-10 w-full animate-pulse rounded-md bg-muted"></div>
        {:else if $session.data}
          <NavigationMenu.Item>
            <Button size="icon-lg" variant="ghost" href="/home">
              <House />
            </Button>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <Button size="icon-lg" variant="ghost" href="/explore">
              <Globe />
            </Button>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <Button size="icon-lg" variant="ghost" href="/me">
              <CircleUserRound />
            </Button>
          </NavigationMenu.Item>
        {:else}
          <NavigationMenu.Item>
            <Button variant="ghost" size="sm" href="/signin">Sign in</Button>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <Button size="sm" href="/signup">Sign up</Button>
          </NavigationMenu.Item>
        {/if}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  </div>
</header>
