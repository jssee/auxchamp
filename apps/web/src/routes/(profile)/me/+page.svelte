<script lang="ts">
  import { updateEmail, updatePassword, updateProfile } from "./account.remote";
  import { Button } from "$lib/components/ui/button";
  import * as Avatar from "$lib/components/ui/avatar";
  import * as Card from "$lib/components/ui/card";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
  import { Separator } from "$lib/components/ui/separator";
  import { fieldInvalid } from "$lib/utils";

  const { data } = $props();

  const getDisplayUsername = () =>
    data.user.displayUsername ?? data.user.username ?? "";
  const getInitialName = () =>
    data.user.name === data.user.username ? "" : (data.user.name ?? "");
  const getInitialDisplayName = () =>
    data.user.name !== data.user.username
      ? data.user.name
      : getDisplayUsername();
  const getInitialEmail = () => data.user.email;
  const emailUpdatesNeedVerification = () => data.user.emailVerified;

  const displayName = $derived(
    updateProfile.result?.name ?? getInitialDisplayName(),
  );
  const initials = $derived(
    (displayName ?? "")
      .split(/\s+/)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() ?? "")
      .join(""),
  );

  updateProfile.fields.username.set(getDisplayUsername());
  updateProfile.fields.name.set(getInitialName());
  updateEmail.fields.email.set(getInitialEmail());
</script>

<svelte:head>
  <title>Settings</title>
</svelte:head>

<div class="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
  <!-- Identity header -->
  <header class="mb-10 flex items-center gap-5">
    <Avatar.Root
      size="lg"
      class="size-16 text-lg font-semibold ring-2 ring-foreground/5"
      aria-hidden="true"
    >
      <Avatar.Fallback class="bg-accent text-accent-foreground">
        {initials || "?"}
      </Avatar.Fallback>
    </Avatar.Root>

    <div class="min-w-0 flex-1">
      <h1 class="truncate text-2xl font-semibold tracking-tight">
        {displayName}
      </h1>
      <p class="mt-0.5 text-sm text-muted-foreground">
        {updateEmail.result?.email ?? data.user.email}
        <span class="mx-1 text-muted-foreground">·</span>
        <a
          class="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          href={`/u/${updateProfile.result?.displayUsername ?? getDisplayUsername()}`}
        >
          View profile
        </a>
      </p>
    </div>
  </header>

  <div class="space-y-6">
    <!-- Profile -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Public profile</Card.Title>
        <Card.Description>
          The username and name other players can see.
        </Card.Description>
      </Card.Header>

      <Card.Content>
        <form {...updateProfile} class="space-y-5">
          {#if updateProfile.result}
            <p class="text-sm text-green-500" role="status">
              ✓ {updateProfile.result.message}
            </p>
          {/if}

          <Field.Error errors={updateProfile.fields.allIssues()} />

          <Field.Set>
            <Field.Field
              data-invalid={fieldInvalid(
                updateProfile.fields.username.issues(),
              )}
            >
              <Field.Label for="username">Username</Field.Label>
              <Input
                id="username"
                autocomplete="username"
                {...updateProfile.fields.username.as("text")}
              />
              <Field.Error errors={updateProfile.fields.username.issues()} />
            </Field.Field>

            <Field.Field
              data-invalid={fieldInvalid(updateProfile.fields.name.issues())}
            >
              <Field.Label for="name">Name</Field.Label>
              <Input
                id="name"
                autocomplete="name"
                placeholder="Optional"
                {...updateProfile.fields.name.as("text")}
              />
              <Field.Description>
                Leave blank to fall back to your username.
              </Field.Description>
              <Field.Error errors={updateProfile.fields.name.issues()} />
            </Field.Field>
          </Field.Set>

          <Button type="submit" disabled={updateProfile.pending > 0}>
            {updateProfile.pending > 0 ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </Card.Content>
    </Card.Root>

    <!-- Email -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Email</Card.Title>
        <Card.Description>
          The email address attached to this account.
        </Card.Description>
      </Card.Header>

      <Card.Content>
        <form {...updateEmail} class="space-y-5">
          {#if updateEmail.result}
            <p class="text-sm text-green-500" role="status">
              ✓ {updateEmail.result.message}
            </p>
          {/if}

          <Field.Error errors={updateEmail.fields.allIssues()} />

          <Field.Set>
            <Field.Field
              data-invalid={fieldInvalid(updateEmail.fields.email.issues())}
            >
              <Field.Label for="email">Email</Field.Label>
              <Input
                id="email"
                autocomplete="email"
                {...updateEmail.fields.email.as("email")}
              />
              <Field.Description>
                {#if emailUpdatesNeedVerification()}
                  This minimal flow stops here for verified emails until email
                  delivery is wired up.
                {:else}
                  Direct email changes are enabled while email verification is
                  not in use.
                {/if}
              </Field.Description>
              <Field.Error errors={updateEmail.fields.email.issues()} />
            </Field.Field>
          </Field.Set>

          <Button
            type="submit"
            disabled={updateEmail.pending > 0 || emailUpdatesNeedVerification()}
          >
            {updateEmail.pending > 0 ? "Saving…" : "Save email"}
          </Button>
        </form>
      </Card.Content>
    </Card.Root>

    <!-- Password -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Password</Card.Title>
        <Card.Description>
          Set a new password and revoke your other active sessions.
        </Card.Description>
      </Card.Header>

      <Card.Content>
        <form {...updatePassword} class="space-y-5">
          {#if updatePassword.result}
            <p class="text-sm text-green-500" role="status">
              ✓ {updatePassword.result.message}
            </p>
          {/if}

          <Field.Error errors={updatePassword.fields.allIssues()} />

          <Field.Set>
            <Field.Field
              data-invalid={fieldInvalid(
                updatePassword.fields.currentPassword.issues(),
              )}
            >
              <Field.Label for="current-password">Current password</Field.Label>
              <Input
                id="current-password"
                autocomplete="current-password"
                {...updatePassword.fields.currentPassword.as("password")}
              />
              <Field.Error
                errors={updatePassword.fields.currentPassword.issues()}
              />
            </Field.Field>

            <Separator />

            <Field.Field
              data-invalid={fieldInvalid(
                updatePassword.fields.newPassword.issues(),
              )}
            >
              <Field.Label for="new-password">New password</Field.Label>
              <Input
                id="new-password"
                autocomplete="new-password"
                {...updatePassword.fields.newPassword.as("password")}
              />
              <Field.Error
                errors={updatePassword.fields.newPassword.issues()}
              />
            </Field.Field>
          </Field.Set>

          <Button type="submit" disabled={updatePassword.pending > 0}>
            {updatePassword.pending > 0 ? "Saving…" : "Save password"}
          </Button>
        </form>
      </Card.Content>
    </Card.Root>
  </div>
</div>
