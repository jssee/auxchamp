<script lang="ts">
  import PasswordForm from "$lib/components/auth/password-form.svelte";
  import ProfileForm from "./components/profile-form.svelte";
  import DeleteAccountForm from "./components/delete-account-form.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<main class="col-content">
  <div class="flex flex-col gap-7">
    <section>
      <ProfileForm user={data.user} />
    </section>

    <section class="pt-7">
      <PasswordForm />
    </section>

    <section class="">
      <DeleteAccountForm />
    </section>
  </div>
</main>
