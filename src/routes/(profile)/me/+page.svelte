<script lang="ts">
  import ProfileForm from "$lib/components/me/profile-form.svelte";
  import PasswordForm from "$lib/components/auth/password-form.svelte";
  import DeleteAccountForm from "$lib/components/me/delete-account-form.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<main class="grid-layout grid-row-2 h-full">
  <div class="col-content flex flex-col gap-7">
    <section class="pt-7">
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
