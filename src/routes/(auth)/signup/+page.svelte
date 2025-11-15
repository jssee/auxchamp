<script lang="ts">
  import { signUp } from "$lib/auth/auth.remote";
  import * as Card from "$lib/components/ui/card";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
</script>

<Card.Root class="mx-auto max-w-md">
  <Card.Header>
    <Card.Title class="text-xl">Sign up</Card.Title>
  </Card.Header>

  <Card.Content>
    <form {...signUp}>
      <Field.Set>
        <Field.Field>
          <Field.Label for="username">Username</Field.Label>
          <Input
            id="username"
            autocomplete="off"
            {...signUp.fields.username.as("text")}
          />
          {#each signUp.fields.password.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Field>

        <Field.Field>
          <Field.Label for="email">Email</Field.Label>
          <Input
            id="email"
            autocomplete="email"
            placeholder="you@example.com"
            {...signUp.fields.email.as("email")}
          />
          {#each signUp.fields.email.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Field>

        <Field.Field>
          <Field.Label for="password">Password</Field.Label>
          <Input
            id="password"
            autocomplete="new-password"
            {...signUp.fields.password.as("password")}
          />
          {#each signUp.fields.password.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Field>
        <Button type="submit">Sign up</Button>
      </Field.Set>
    </form>
  </Card.Content>
</Card.Root>
