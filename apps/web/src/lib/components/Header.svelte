<script lang="ts">
  import * as Nav from "$lib/components/ui/navigation-menu";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { Home01Icon, Add01Icon } from "@hugeicons/core-free-icons";
  import UserMenu from "./UserMenu.svelte";
  import favicon from "$lib/assets/favicon.svg";
</script>

<header
  class="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg"
>
  <div class="flex items-center justify-between px-4 py-2 md:px-6">
    <div class="flex items-center gap-1">
      <a
        href="/"
        class="mr-2 flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-muted"
        aria-label="Home"
      >
        <img
          src={favicon}
          alt=""
          class="h-5 w-auto dark:invert"
          aria-hidden="true"
        />
      </a>

      <Nav.Root viewport={false}>
        <Nav.List>
          <Nav.Item>
            <Nav.Link href="/">
              <HugeiconsIcon icon={Home01Icon} class="size-4" />
              <span>Home</span>
            </Nav.Link>
          </Nav.Item>

          <Nav.Item>
            <Nav.Link href="/g/new">
              <HugeiconsIcon icon={Add01Icon} class="size-4" />
              <span>New Game</span>
            </Nav.Link>
          </Nav.Item>
        </Nav.List>
      </Nav.Root>
    </div>

    <UserMenu />
  </div>
</header>
