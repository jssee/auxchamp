<script lang="ts">
  import { page } from "$app/state";
  import { toast } from "svelte-sonner";
  import { AUTH_MESSAGES } from "$lib/auth/messages";
  import * as Card from "$lib/components/ui/card";
  import SignInForm from "./SignInForm.svelte";
  import SignUpForm from "./SignUpForm.svelte";

  const isSignUp = $derived(page.params.authtype === "signup");

  /** Only trust relative paths that start with a single slash. */
  const redirectTo = $derived.by(() => {
    const raw = page.url.searchParams.get("redirectTo");
    if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
    return raw;
  });

  /** Resolve message code to a static string; ignore unknown codes. */
  const message = $derived.by(() => {
    const code = page.url.searchParams.get("message");
    return code ? (AUTH_MESSAGES[code] ?? null) : null;
  });

  $effect(() => {
    if (message) {
      toast.info(message);
    }
  });
</script>

<main class="col-content grid h-full place-items-center">
  <Card.Root class="w-full max-w-md">
    <Card.Header>
      <Card.Title class="text-xl">{isSignUp ? "Sign up" : "Sign in"}</Card.Title
      >
    </Card.Header>

    <Card.Content>
      {#if isSignUp}
        <SignUpForm />
      {:else}
        <SignInForm />
      {/if}
    </Card.Content>

    <Card.Footer>
      {#if isSignUp}
        {@render switchAuthType({
          question: "Already have an account? ",
          href: redirectTo
            ? `/signin?redirectTo=${encodeURIComponent(redirectTo)}`
            : "/signin",
          cta: "Sign in",
          postscript: " instead.",
        })}
      {:else}
        {@render switchAuthType({
          question: "Don't have an account? ",
          href: redirectTo
            ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}`
            : "/signup",
          cta: "Sign up",
          postscript: " for free.",
        })}
      {/if}
    </Card.Footer>
  </Card.Root>
</main>

{#snippet switchAuthType({
  question,
  href,
  cta,
  postscript,
}: {
  question: string;
  href: string;
  cta: string;
  postscript: string;
})}
  <p class="mt-4 text-center text-sm text-gray-600 dark:text-zinc-400">
    {question}
    <a
      {href}
      class="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
    >
      {cta}
    </a>
    {postscript}
  </p>
{/snippet}
