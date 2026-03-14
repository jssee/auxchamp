<script lang="ts">
  import { updateEmail, updatePassword, updateProfile } from "$lib/account.remote";
  import { Button } from "$lib/components/ui/button";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";

  const { data } = $props();

  const getInitialUsername = () => data.user.username ?? data.user.displayUsername ?? "";
  const getInitialName = () => (data.user.name === data.user.username ? "" : data.user.name ?? "");
  const getInitialDisplayName = () =>
    data.user.name !== data.user.username ? data.user.name : getInitialUsername();
  const getInitialEmail = () => data.user.email;
  const emailUpdatesNeedVerification = () => data.user.emailVerified;

  updateProfile.fields.username.set(getInitialUsername());
  updateProfile.fields.name.set(getInitialName());
  updateEmail.fields.email.set(getInitialEmail());
</script>

<div class="container mx-auto max-w-3xl space-y-10 px-4 py-8">
  <header class="space-y-2">
    <p class="text-sm text-neutral-400">Settings</p>
    <h1 class="font-bold text-3xl">
      {updateProfile.result?.name ?? getInitialDisplayName()}
    </h1>
    <p class="text-sm text-neutral-400">
      Signed in as {updateEmail.result?.email ?? data.user.email} ·
      <a
        class="underline underline-offset-4 hover:text-white"
        href={`/u/${updateProfile.result?.username ?? getInitialUsername()}`}
      >
        View public profile
      </a>
    </p>
  </header>

  <section class="space-y-4">
    <div class="space-y-1">
      <h2 class="font-semibold text-xl">Public profile</h2>
      <p class="text-sm text-neutral-400">Update the username and name other players can see.</p>
    </div>

    <form {...updateProfile} class="space-y-4">
      {#if updateProfile.result}
        <p class="text-sm text-green-600">{updateProfile.result.message}</p>
      {/if}

      {#each updateProfile.fields.allIssues() as issue}
        <Field.Error>{issue.message}</Field.Error>
      {/each}

      <Field.Set>
        <Field.Field>
          <Field.Label for="username">Username</Field.Label>
          <Input id="username" autocomplete="username" {...updateProfile.fields.username.as("text")} />
          {#each updateProfile.fields.username.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Field>

        <Field.Field>
          <Field.Label for="name">Name</Field.Label>
          <Input id="name" autocomplete="name" placeholder="Optional" {...updateProfile.fields.name.as("text")} />
          <Field.Description>Leave blank to fall back to your username.</Field.Description>
          {#each updateProfile.fields.name.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Field>

        <Button type="submit" disabled={updateProfile.pending > 0}>
          {updateProfile.pending > 0 ? "Saving..." : "Save profile"}
        </Button>
      </Field.Set>
    </form>
  </section>

  <section class="space-y-4 border-t border-neutral-800 pt-6">
    <div class="space-y-1">
      <h2 class="font-semibold text-xl">Email</h2>
      <p class="text-sm text-neutral-400">Update the email address attached to this account.</p>
    </div>

    <form {...updateEmail} class="space-y-4">
      {#if updateEmail.result}
        <p class="text-sm text-green-600">{updateEmail.result.message}</p>
      {/if}

      {#each updateEmail.fields.allIssues() as issue}
        <Field.Error>{issue.message}</Field.Error>
      {/each}

      <Field.Set>
        <Field.Field>
          <Field.Label for="email">Email</Field.Label>
          <Input id="email" autocomplete="email" {...updateEmail.fields.email.as("email")} />
          <Field.Description>
            {#if emailUpdatesNeedVerification()}
              This minimal flow stops here for verified emails until email delivery is wired up.
            {:else}
              Direct email changes are enabled while email verification is not in use.
            {/if}
          </Field.Description>
          {#each updateEmail.fields.email.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Field>

        <Button type="submit" disabled={updateEmail.pending > 0 || emailUpdatesNeedVerification()}>
          {updateEmail.pending > 0 ? "Saving..." : "Save email"}
        </Button>
      </Field.Set>
    </form>
  </section>

  <section class="space-y-4 border-t border-neutral-800 pt-6">
    <div class="space-y-1">
      <h2 class="font-semibold text-xl">Password</h2>
      <p class="text-sm text-neutral-400">Set a new password and revoke your other active sessions.</p>
    </div>

    <form {...updatePassword} class="space-y-4">
      {#if updatePassword.result}
        <p class="text-sm text-green-600">{updatePassword.result.message}</p>
      {/if}

      {#each updatePassword.fields.allIssues() as issue}
        <Field.Error>{issue.message}</Field.Error>
      {/each}

      <Field.Set>
        <Field.Field>
          <Field.Label for="current-password">Current password</Field.Label>
          <Input
            id="current-password"
            autocomplete="current-password"
            {...updatePassword.fields.currentPassword.as("password")}
          />
          {#each updatePassword.fields.currentPassword.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Field>

        <Field.Field>
          <Field.Label for="new-password">New password</Field.Label>
          <Input
            id="new-password"
            autocomplete="new-password"
            {...updatePassword.fields.newPassword.as("password")}
          />
          {#each updatePassword.fields.newPassword.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Field>

        <Button type="submit" disabled={updatePassword.pending > 0}>
          {updatePassword.pending > 0 ? "Saving..." : "Save password"}
        </Button>
      </Field.Set>
    </form>
  </section>
</div>
