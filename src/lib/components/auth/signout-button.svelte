<script lang="ts">
  import { signOut } from "$lib/auth/auth.remote";
  import { Button } from "$lib/components/ui/button";
</script>

<form class="contents" {...signOut}>
  <Button type="submit">Sign out</Button>
</form>
