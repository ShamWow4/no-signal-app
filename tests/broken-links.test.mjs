import { describe, expect, it } from "vitest";
import { TestDriver } from "testdriverai/vitest/hooks";

// "No Signal!" / Nola Visual Arts AV Academy app — broken-link check.
//
// The app is a public Expo Router (React Native for web) app served from
// Firebase Hosting. This suite verifies there are no broken links anywhere in
// the app's navigation. It checks links two complementary ways:
//
//   1. INTERACTIVELY — it clicks the real navigation controls a user would
//      click (each tab in the bottom tab bar, and an in-app link on the
//      Profile screen) and confirms each one lands on a working screen.
//   2. BY DEEP-LINK — it navigates directly to the routes NOT already reached
//      by a tab click (routes hidden from the tab bar, standalone screens, and
//      redirect routes) and confirms the static Firebase export serves each one
//      without a 404.
//
// Each check is its own `it` so an infra hiccup fails/retries a single link
// instead of the whole navigation walk. The tab-click tests already cover the
// six visible tab routes, so those are intentionally not repeated as deep-links.
//
// "Working screen" / "not broken" means: no blank page, no "Not Found" / 404,
// no "This screen doesn't exist", and no error boundary.
//
// We deep-link into "/directory" as a stable starting point for the tab tests
// because the root "/" client-side redirects into the tab navigator and can
// flash a blank splash on the static export; "/directory" reliably hydrates
// the tab layout.
const PROD_URL = "https://nola-visual-arts-1f3cf.web.app";
const DIRECTORY_URL = `${PROD_URL}/directory`;

const HYDRATE_MS = 8000; // RN-web bundle needs a moment to hydrate.
const NAV_MS = 4500; // Settle time after an in-app navigation (RN-web screen swap).

const NO_ERROR =
  'There is NO "Not Found", "404", "This screen doesn\'t exist", blank white page, or error boundary on screen.';

// Every visible tab in the bottom tab bar (app/(tabs)/_layout.tsx), in order,
// with a natural-language description of content that proves the tab's screen
// rendered after the tab link is clicked.
const TABS = [
  {
    label: "Calendar",
    find: 'the "Calendar" tab in the very bottom navigation bar of the app (leftmost tab, calendar icon)',
    proof: "a calendar, agenda, or events view",
  },
  {
    label: "Directory",
    find: 'the "Directory" tab in the very bottom navigation bar of the app (second tab from the left)',
    proof: "a search bar and a list of company/vendor listings",
  },
  {
    label: "Gigs",
    find: 'the "Gigs" tab in the very bottom navigation bar of the app (third tab from the left)',
    proof: 'gig opportunities or a "GIG ALERTS" heading',
  },
  {
    label: "Toolbox",
    find: 'the "Toolbox" tab in the very bottom navigation bar of the app (fourth tab from the left)',
    proof: "AV technician tools such as a DMX calculator",
  },
  {
    label: "Tech Support",
    find: 'the "Tech Support" tab in the very bottom navigation bar of the app (fifth tab from the left)',
    proof: "tech support, help, or education content",
  },
  {
    label: "AV News",
    find: 'the "AV News" tab in the very bottom navigation bar of the app (sixth tab from the left)',
    proof: "news articles, headlines, or a newsletter",
  },
  {
    label: "Profile",
    find: 'the "Profile" tab in the very bottom navigation bar of the app (rightmost tab, person icon)',
    proof: "profile or account content (for example a greeting and saved stats)",
  },
];

// Routes NOT reached by a tab click above. `redirectsToTabs` routes
// intentionally `<Redirect href="/(tabs)" />`, so "not broken" for them means
// they land on the tab navigator, not a 404.
const ROUTES = [
  // Routes hidden from the tab bar but reachable in-app (href: null tabs).
  { path: "/donors", name: "Donors", proof: "donor or sponsor information" },
  { path: "/rf-coordination", name: "RF Coordination", proof: "an RF coordination tool or frequency content" },

  // In-app link target from the Profile screen (also exercised by click below).
  { path: "/saved-items", name: "Saved Items", proof: 'a "Saved Items" screen with Saved Gigs / Saved Events tabs' },

  // Standalone routes that render their own screen.
  { path: "/contact", name: "Contact", proof: "contact details or a contact form" },
  { path: "/donate", name: "Donate", proof: "donation or donor information" },
  { path: "/privacy", name: "Privacy Policy", proof: "a privacy policy" },

  // Routes that intentionally redirect into the tab navigator.
  { path: "/about", name: "About", redirectsToTabs: true },
  { path: "/volunteer", name: "Volunteer", redirectsToTabs: true },
  { path: "/portfolio", name: "Portfolio", redirectsToTabs: true },
  { path: "/home", name: "Home", redirectsToTabs: true },
];

describe("No Signal! app — no broken links", () => {
  // 1. Interactive: click each tab link in the bottom navigation bar and
  //    confirm the destination screen renders — the primary in-app navigation
  //    links, exercised exactly as a user clicks them. One test per tab so an
  //    infra hiccup only affects that tab.
  for (const tab of TABS) {
    it(`the "${tab.label}" tab link navigates to its screen when clicked`, async (context) => {
      const testdriver = TestDriver(context);

      await testdriver.provision.chrome({ url: DIRECTORY_URL });
      await testdriver.wait(HYDRATE_MS);
      await testdriver.focusApplication("Google Chrome");

      await testdriver.find(tab.find).click();
      await testdriver.wait(NAV_MS);

      const ok = await testdriver.assert(
        `the ${tab.label} screen is displayed showing ${tab.proof}. ${NO_ERROR}`,
      );
      expect(ok).toBeTruthy();
    });
  }

  // 2. Interactive: an in-app link on the Profile screen. Clicking a "Saved"
  //    stat box must navigate to the Saved Items screen (not a dead end).
  it('the Profile "Saved" link navigates to the Saved Items screen when clicked', async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: `${PROD_URL}/profile` });
    await testdriver.wait(HYDRATE_MS);
    await testdriver.focusApplication("Google Chrome");

    await testdriver
      .find('the "Saved Gigs" stat box (a number above the label "SAVED GIGS") on the Profile screen')
      .click();
    await testdriver.wait(NAV_MS);

    const ok = await testdriver.assert(
      `the Saved Items screen is displayed with "Saved Gigs" and "Saved Events" tabs. ${NO_ERROR}`,
    );
    expect(ok).toBeTruthy();
  });

  // 3. Deep-link the remaining routes (hidden, standalone, redirect) to confirm
  //    none 404 on the static Firebase export.
  for (const route of ROUTES) {
    it(`${route.path} (${route.name}) resolves without a 404 / blank / error`, async (context) => {
      const testdriver = TestDriver(context);

      await testdriver.provision.chrome({ url: `${PROD_URL}${route.path}` });
      await testdriver.wait(HYDRATE_MS);
      await testdriver.focusApplication("Google Chrome");

      const assertion = route.redirectsToTabs
        ? `the app has loaded and is showing the No Signal! app with its bottom navigation bar ` +
          `(tabs such as Directory, Gigs, Toolbox, Tech Support, AV News, Profile) — this route ` +
          `redirects into the app. ${NO_ERROR}`
        : `the ${route.name} page has loaded and shows ${route.proof}. ${NO_ERROR}`;

      const ok = await testdriver.assert(assertion);
      expect(ok).toBeTruthy();
    });
  }
});
