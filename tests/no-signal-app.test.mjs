import { describe, expect, it } from "vitest";
import { TestDriver } from "testdriverai/vitest/hooks";

// Sample end-to-end tests for the "No Signal!" / Nola Visual Arts AV Academy app,
// targeting the production Firebase Hosting deployment.
//
// The app is a public Expo Router (React Native for web) app — no login is
// required, so these tests exercise anonymous, read-only user flows.
//
// Note: the root URL ("/") client-side redirects into the tab navigator and can
// render a blank splash on the static export, so tests deep-link straight to a
// concrete route (e.g. "/directory") which reliably hydrates the tab layout.
const PROD_URL = "https://nola-visual-arts-1f3cf.web.app";
const DIRECTORY_URL = `${PROD_URL}/directory`;

describe("No Signal! app (production)", () => {
  it("loads the Industry Directory screen", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: DIRECTORY_URL });

    // React Native web bundle needs a moment to hydrate the tab navigator.
    await testdriver.wait(7000);

    const result = await testdriver.assert(
      "the Industry Directory screen is visible with a search bar and a list of company listings",
    );
    expect(result).toBeTruthy();
  });

  it("filters the directory when searching for a company", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: DIRECTORY_URL });
    await testdriver.wait(7000);

    await testdriver
      .find('the search input field with placeholder "Search companies or types..."')
      .click();
    await testdriver.type("AVTS");
    await testdriver.wait(2000);

    const result = await testdriver.assert(
      "the directory list is filtered to show the AVTS company after searching",
    );
    expect(result).toBeTruthy();
  });

  it("navigates to the Gigs tab", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: DIRECTORY_URL });
    await testdriver.wait(7000);

    await testdriver.find('the "Gigs" tab in the bottom navigation bar').click();
    await testdriver.wait(3000);

    const result = await testdriver.assert(
      'the Gigs screen is displayed with the "GIG ALERTS" heading and a list of gig opportunities',
    );
    expect(result).toBeTruthy();
  });
});
