import { invalid } from "@sveltejs/kit";
import { ORPCError } from "@orpc/server";

type Issue = {
  message: string;
  path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>;
};

/**
 * If `thrown` is a non-auth ORPCError, surface it as a form field issue via
 * `invalid()`. Otherwise re-throw so SvelteKit handles it normally.
 *
 * Usage inside a `form()` handler's catch block:
 *
 *   catch (thrown) {
 *     rethrowAsIssue(thrown, issue.fieldName("fallback message"));
 *   }
 */
export function rethrowAsIssue(thrown: unknown, fieldIssue: Issue): never {
  if (thrown instanceof ORPCError && thrown.code !== "UNAUTHORIZED") {
    invalid(
      thrown.message ? { ...fieldIssue, message: thrown.message } : fieldIssue,
    );
  }

  throw thrown;
}
