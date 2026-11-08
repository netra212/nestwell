import {
  test,
  expect,
  type APIRequestContext,
  type BrowserContext,
} from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
test.setTimeout(60000);
async function login(api: APIRequestContext, email: string) {
  const csrf = await (await api.get("/api/auth/csrf")).json();
  const response = await api.post("/api/auth/callback/credentials", {
    form: {
      email,
      password: "demo",
      csrfToken: csrf.csrfToken,
      callbackUrl: "/saved",
      json: "true",
    },
  });
  expect(response.status()).toBe(200);
  const session = await (await api.get("/api/auth/session")).json();
  expect(session.user.email).toBe(email);
  return session.user.id as string;
}
async function logout(api: APIRequestContext) {
  const csrf = await (await api.get("/api/auth/csrf")).json();
  await api.post("/api/auth/signout", {
    form: { csrfToken: csrf.csrfToken, callbackUrl: "/", json: "true" },
  });
}
async function cleanupUser(email: string) {
  const db = new PrismaClient();
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      await db.enquiry.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    }
  } finally {
    await db.$disconnect();
  }
}
const newEmail = () => `phase5-${randomUUID()}@example.com`;
test("session-only cookies, anonymous gates and seeded-user ownership", async ({
  browser,
  baseURL,
}) => {
  const anonymous = await browser.newContext({ baseURL });
  const emma = await browser.newContext({ baseURL });
  const oliver = await browser.newContext({ baseURL });
  let searchId = "";
  let propertyId = "";
  let originalEmma = false;
  let originalOliver = false;
  try {
    for (const [path, method] of [
      ["/api/favorites", "POST"],
      ["/api/favorites/missing", "DELETE"],
      ["/api/saved-searches", "POST"],
      ["/api/saved-searches/missing", "DELETE"],
      ["/api/enquiries", "POST"],
    ]) {
      const response = await anonymous.request.fetch(path, {
        method,
        data: {},
      });
      expect(response.status()).toBe(401);
    }
    expect((await anonymous.request.get("/api/favorites")).status()).toBe(401);
    expect((await anonymous.request.get("/api/saved-searches")).status()).toBe(
      401,
    );
    await login(emma.request, "emma.wilson@example.com");
    await login(oliver.request, "oliver.taylor@example.com");
    const cookie = (await emma.cookies()).find((c) =>
      c.name.includes("session-token"),
    );
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    expect(cookie?.expires).toBe(-1);
    const properties = await (
      await anonymous.request.get("/api/properties?city=Bristol")
    ).json();
    propertyId = properties.results[0].id;
    const ea = await (await emma.request.get("/api/favorites")).json();
    const oa = await (await oliver.request.get("/api/favorites")).json();
    originalEmma = ea.propertyIds.includes(propertyId);
    originalOliver = oa.propertyIds.includes(propertyId);
    expect(
      (
        await emma.request.post("/api/favorites", {
          data: { propertyId, userId: "other" },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await emma.request.post("/api/favorites", {
          headers: { Origin: "https://other.example" },
          data: { propertyId },
        })
      ).status(),
    ).toBe(403);
    for (const actor of [emma, oliver])
      expect(
        (
          await actor.request.post("/api/favorites", { data: { propertyId } })
        ).status(),
      ).toBe(201);
    expect(
      (
        await emma.request.post("/api/favorites", { data: { propertyId } })
      ).status(),
    ).toBe(201);
    await emma.request.delete(`/api/favorites/${propertyId}`);
    expect(
      (await (await oliver.request.get("/api/favorites")).json()).propertyIds,
    ).toContain(propertyId);
    const saved = await emma.request.post("/api/saved-searches", {
      data: {
        name: `Ownership ${randomUUID()}`,
        rawQuery: "Buy in Bristol",
        filters: { city: "Bristol", priceMax: "600000", features: ["garden"] },
      },
    });
    expect(saved.status()).toBe(201);
    searchId = (await saved.json()).id;
    const own = await (await emma.request.get("/api/saved-searches")).json();
    const other = await (
      await oliver.request.get(
        `/api/saved-searches?userId=${(await (await emma.request.get("/api/auth/session")).json()).user.id}`,
      )
    ).json();
    expect(own.results.some((s: { id: string }) => s.id === searchId)).toBe(
      true,
    );
    expect(other.results.some((s: { id: string }) => s.id === searchId)).toBe(
      false,
    );
    expect(
      (await oliver.request.delete(`/api/saved-searches/${searchId}`)).status(),
    ).toBe(404);
    await logout(emma.request);
    expect((await emma.request.get("/api/favorites")).status()).toBe(401);
    expect(
      (await emma.cookies()).some((c) => c.name.includes("session-token")),
    ).toBe(false);
  } finally {
    await login(emma.request, "emma.wilson@example.com");
    if (searchId) await emma.request.delete(`/api/saved-searches/${searchId}`);
    if (propertyId) {
      for (const [actor, wasSaved] of [
        [emma, originalEmma],
        [oliver, originalOliver],
      ] as [BrowserContext, boolean][]) {
        if (wasSaved)
          await actor.request.post("/api/favorites", { data: { propertyId } });
        else await actor.request.delete(`/api/favorites/${propertyId}`);
      }
    }
    await Promise.all([anonymous.close(), emma.close(), oliver.close()]);
  }
});
test("email sign-in, optimistic favorites with rollback, saved search Run/Delete and sign-out", async ({
  page,
}) => {
  const email = newEmail();
  try {
    await page.goto("/sign-in?callbackUrl=%2Ffor-sale");
    await page
      .getByRole("textbox", { name: "Email address", exact: true })
      .fill(email);
    await page.getByRole("button", { name: "Continue with email" }).click();
    await page.waitForURL((url) => url.pathname === "/for-sale");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    const first = page.locator("article").first();
    const save = first.getByRole("button", { name: /^Save / });
    await expect(save).toBeEnabled();
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/favorites", async (route) => {
      if (route.request().method() === "POST") {
        await held;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "TEST_ERROR", message: "Try again", details: [] },
          }),
        });
      } else await route.continue();
    });
    await save.click();
    await expect(
      first.getByRole("button", { name: /^Unsave / }),
    ).toHaveAttribute("aria-pressed", "true");
    release();
    await expect(first.getByRole("button", { name: /^Save / })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await page.unroute("**/api/favorites");
    await first.getByRole("button", { name: /^Save / }).click();
    await expect(first.getByRole("button", { name: /^Unsave / })).toBeEnabled();
    await first.locator("a").first().click();
    await page.waitForURL((url) => url.pathname.startsWith("/property/"));
    await expect(
      page.getByRole("button", { name: /^Unsave property at / }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^Unsave property at / }).click();
    await expect(
      page.getByRole("button", { name: /^Save property at / }),
    ).toBeEnabled();
    await page.getByRole("button", { name: /^Save property at / }).click();
    await expect(
      page.getByRole("button", { name: /^Unsave property at / }),
    ).toBeEnabled();
    await page.getByRole("link", { name: "Buy", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/for-sale");
    await page
      .getByRole("button", { name: "Save this search", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Name (optional)" })
      .fill("Weekend shortlist");
    await page
      .getByRole("button", { name: "Save search", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("link", { name: "Saved", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Your saved collection." }),
    ).toBeVisible();
    await expect(page.locator("article")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Weekend shortlist" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Run", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/for-sale");
    await page.getByRole("link", { name: "Saved", exact: true }).click();
    await page
      .getByRole("button", { name: "Delete Weekend shortlist" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Weekend shortlist" }),
    ).toBeHidden();
    await page
      .locator("article")
      .getByRole("button", { name: /^Unsave / })
      .click();
    await expect(
      page.getByText("You haven’t saved any homes yet."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(
      page.getByRole("link", { name: "Sign in", exact: true }),
    ).toBeVisible();
  } finally {
    await cleanupUser(email);
  }
});
test("enquiry submission validates, persists, filters honeypots and rate-limits", async ({
  page,
  context,
}) => {
  const email = newEmail();
  let userId = "";
  const db = new PrismaClient();
  try {
    userId = await login(context.request, email);
    const properties = await (
      await context.request.get("/api/properties")
    ).json();
    const propertyId = properties.results[0].id;
    await page.goto(`/property/${propertyId}`);
    await page
      .getByRole("button", { name: "Send enquiry", exact: true })
      .click();
    await expect(
      page.getByText("Please write at least 10 characters"),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Full name", exact: true })
      .fill("Alex Viewer");
    await page
      .getByRole("textbox", { name: "Your message", exact: true })
      .fill("Could we arrange a viewing this weekend?");
    await page
      .getByRole("button", { name: "Send enquiry", exact: true })
      .click();
    await expect(
      page.getByText("Thanks — your enquiry has been received.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(await db.enquiry.count({ where: { userId, propertyId } })).toBe(1);
    const body = {
      propertyId,
      name: "Alex Viewer",
      email,
      message: "Could we arrange a viewing?",
    };
    const ip = `2001:db8:${randomUUID().slice(0, 4)}::1`;
    expect(
      (
        await context.request.post("/api/enquiries", {
          headers: { "x-forwarded-for": ip },
          data: body,
        })
      ).status(),
    ).toBe(201);
    const limited = await context.request.post("/api/enquiries", {
      headers: { "x-forwarded-for": ip },
      data: body,
    });
    expect(limited.status()).toBe(429);
    expect(Number(limited.headers()["retry-after"])).toBeGreaterThan(0);
    const before = await db.enquiry.count({ where: { userId } });
    expect(
      (
        await context.request.post("/api/enquiries", {
          headers: {
            "x-forwarded-for": `2001:db8:${randomUUID().slice(0, 4)}::2`,
          },
          data: { ...body, website: "spam.example" },
        })
      ).status(),
    ).toBe(201);
    expect(await db.enquiry.count({ where: { userId } })).toBe(before);
  } finally {
    await db.$disconnect();
    await cleanupUser(email);
  }
});
test("similar properties use the specified bounds and recently viewed persists eight IDs", async ({
  page,
  request,
}) => {
  const properties = (
    await (
      await request.get("/api/properties?pageSize=50&city=Manchester")
    ).json()
  ).results;
  const property = properties.find(
    (p: { propertyType: string }) => p.propertyType === "FLAT",
  );
  const response = await request.get(`/api/properties/${property.id}/similar`);
  expect(response.status()).toBe(200);
  const similar = (await response.json()).results;
  expect(similar.length).toBeGreaterThan(0);
  expect(similar.length).toBeLessThanOrEqual(6);
  for (const p of similar) {
    expect(p.id).not.toBe(property.id);
    expect(p.city).toBe(property.city);
    expect(p.propertyType).toBe(property.propertyType);
    expect(p.price).toBeGreaterThanOrEqual(property.price * 0.7);
    expect(p.price).toBeLessThanOrEqual(property.price * 1.3);
    expect(Math.abs(p.bedrooms - property.bedrooms)).toBeLessThanOrEqual(1);
  }
  await page.goto(`/property/${property.id}`);
  await expect(
    page.getByRole("heading", { name: "Similar properties", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("nestwell.recently-viewed.v1") || "[]"),
      ),
    )
    .toContain(property.id);
  await page.evaluate(
    (ids) =>
      localStorage.setItem("nestwell.recently-viewed.v1", JSON.stringify(ids)),
    properties.slice(0, 8).map((p: { id: string }) => p.id),
  );
  await page.goto(`/property/${properties[9].id}`);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("nestwell.recently-viewed.v1") || "[]",
          ).length,
      ),
    )
    .toBe(8);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Recently viewed", exact: true }),
  ).toBeVisible();
});
test("map degrades without a public token and public browsing remains available", async ({
  page,
}) => {
  await page.goto("/for-sale");
  await expect(
    page.getByRole("status").filter({ hasText: "100 properties found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Map view", exact: true }),
  ).toBeDisabled();
  await page.getByRole("group", { name: "Map view unavailable" }).focus();
  await expect(page.getByRole("tooltip")).toContainText(
    "Map view isn’t available",
  );
  await expect(
    page.getByRole("button", { name: "Save this search", exact: true }),
  ).toHaveCount(0);
});
