<script lang="ts">
  import Form from "./form.svelte";

  let { data } = $props();
</script>

<main class="col-content">
  <Form battle={data.battle} />
</main>
