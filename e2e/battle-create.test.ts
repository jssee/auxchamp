import { expect, test, type Page } from "@playwright/test";

// Generate unique user per test
function getTestUser() {
  const timestamp = Date.now();
  return {
    name: `testuser_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password: "testpassword123",
  };
}

async function signUpAndSignIn(page: Page) {
  const testUser = getTestUser();

  // Go to signup page
  await page.goto("/signup");

  // Wait for form to be visible
  await page.waitForSelector("form");

  // Fill signup form
  await page.getByLabel("Username").fill(testUser.name);
  await page.getByLabel("Email").fill(testUser.email);
  await page.getByLabel("Password").fill(testUser.password);

  // Submit signup form
  await page.getByRole("button", { name: "Sign up" }).click();

  // Wait for redirect to /home (with longer timeout for auth)
  await page.waitForURL("**/home", { timeout: 15000 });
}

test.describe("Battle Creation", () => {
  test.beforeEach(async ({ page }) => {
    await signUpAndSignIn(page);
  });

  test("shows validation error when voting deadline is before submission deadline", async ({
    page,
  }) => {
    // Navigate to create battle page
    await page.goto("/b/new");

    // Wait for form to load
    await page.waitForSelector("form");

    // Fill in battle details using labels
    await page.getByLabel("Name").fill("Test Battle");
    await page.getByLabel("Max Players").fill("8");

    // Fill stage vibe (no label-for association, use name selector)
    await page.locator('input[name="stages[0].vibe"]').fill("Test Stage");

    // Get tomorrow and day after for dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    dayAfter.setHours(12, 0, 0, 0);

    // DateTimePicker uses hidden inputs - we can set them directly via JS
    // Set voting deadline to tomorrow (before submission)
    await page.evaluate(
      (dateStr) => {
        const input = document.querySelector(
          'input[name="stages[0].votingDeadline"]',
        ) as HTMLInputElement;
        if (input) input.value = dateStr;
      },
      tomorrow.toISOString().slice(0, 16),
    );

    // Set submission deadline to day after (invalid - after voting)
    await page.evaluate(
      (dateStr) => {
        const input = document.querySelector(
          'input[name="stages[0].submissionDeadline"]',
        ) as HTMLInputElement;
        if (input) input.value = dateStr;
      },
      dayAfter.toISOString().slice(0, 16),
    );

    // Submit the form
    await page.getByRole("button", { name: "Create" }).click();

    // Should display validation error (not silent failure)
    const errorMessage = page.getByText(
      "Submission deadline must be before voting deadline",
    );
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Should still be on the create page (no redirect)
    expect(page.url()).toContain("/b/new");
  });

  test("shows validation error when deadline gap is less than 5 minutes", async ({
    page,
  }) => {
    await page.goto("/b/new");
    await page.waitForSelector("form");

    await page.getByLabel("Name").fill("Test Battle");
    await page.getByLabel("Max Players").fill("8");
    await page.locator('input[name="stages[0].vibe"]').fill("Test Stage");

    // Set dates with less than 5 minute gap
    const now = new Date();
    const submission = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
    const voting = new Date(submission.getTime() + 2 * 60 * 1000); // only 2 minutes later

    // Set hidden inputs directly
    await page.evaluate(
      (dateStr) => {
        const input = document.querySelector(
          'input[name="stages[0].submissionDeadline"]',
        ) as HTMLInputElement;
        if (input) input.value = dateStr;
      },
      submission.toISOString().slice(0, 16),
    );

    await page.evaluate(
      (dateStr) => {
        const input = document.querySelector(
          'input[name="stages[0].votingDeadline"]',
        ) as HTMLInputElement;
        if (input) input.value = dateStr;
      },
      voting.toISOString().slice(0, 16),
    );

    await page.getByRole("button", { name: "Create" }).click();

    // Should display error about minimum gap
    const errorMessage = page.getByText(
      "At least 5 minutes required between submission and voting deadlines",
    );
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    expect(page.url()).toContain("/b/new");
  });

  test("redirects to battle page on successful creation", async ({ page }) => {
    await page.goto("/b/new");
    await page.waitForSelector("form");

    // Fill valid battle details
    await page.getByLabel("Name").fill("My Test Battle");
    await page.getByLabel("Max Players").fill("8");
    await page.locator('input[name="stages[0].vibe"]').fill("First Stage");

    // Set valid dates (submission before voting, >5 min gap)
    const submission = new Date();
    submission.setDate(submission.getDate() + 1);
    submission.setHours(12, 0, 0, 0);

    const voting = new Date();
    voting.setDate(voting.getDate() + 2);
    voting.setHours(12, 0, 0, 0);

    // Set hidden inputs directly
    await page.evaluate(
      (dateStr) => {
        const input = document.querySelector(
          'input[name="stages[0].submissionDeadline"]',
        ) as HTMLInputElement;
        if (input) input.value = dateStr;
      },
      submission.toISOString().slice(0, 16),
    );

    await page.evaluate(
      (dateStr) => {
        const input = document.querySelector(
          'input[name="stages[0].votingDeadline"]',
        ) as HTMLInputElement;
        if (input) input.value = dateStr;
      },
      voting.toISOString().slice(0, 16),
    );

    // Submit form
    await page.getByRole("button", { name: "Create" }).click();

    // Should redirect to /b/{id}
    await page.waitForURL(/\/b\/[a-zA-Z0-9_-]+$/, { timeout: 10000 });

    // Verify we're on a battle detail page
    expect(page.url()).toMatch(/\/b\/[a-zA-Z0-9_-]+$/);
  });
});
