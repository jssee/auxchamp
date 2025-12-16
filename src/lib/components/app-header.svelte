<script lang="ts">
  import House from "@lucide/svelte/icons/house";
  import Globe from "@lucide/svelte/icons/globe";
  import CircleUserRound from "@lucide/svelte/icons/circle-user-round";
  import * as NavigationMenu from "$lib/components/ui/navigation-menu";
  import { Button } from "$lib/components/ui/button";
</script>

<header class="grid-layout h-16 grid-rows-1">
  <div class="col-content flex items-center justify-between">
    <a class="font-display font-bold" href="/">auxchamp</a>
    <NavigationMenu.Root class="col-content">
      <NavigationMenu.List class="flex">
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
      </NavigationMenu.List>
    </NavigationMenu.Root>
  </div>
</header>
