import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const outDirectory = new URL("../out/", import.meta.url);

async function builtPage(path) {
  return readFile(new URL(path, outDirectory), "utf8");
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "";
const configuredSiteUrl = process.env.SITE_URL || "http://localhost:3000/";
const siteUrl = configuredSiteUrl.endsWith("/")
  ? configuredSiteUrl
  : `${configuredSiteUrl}/`;

test("home includes complete metadata, legal anchors, avatar, and invite link", async () => {
  const html = await builtPage("index.html");

  assert.match(html, /<title>Selenite Legal<\/title>/i);
  assert.match(html, /<meta name="description" content="Selenite is a configurable Discord moderation bot/);
  assert.ok(html.includes(`<link rel="canonical" href="${siteUrl}"`));
  assert.ok(html.includes(`<link rel="icon" href="${siteUrl}selenite-avatar.webp"`));
  assert.ok(html.includes(`href="${basePath}/terms/">Terms of Use</a>`));
  assert.ok(html.includes(`href="${basePath}/privacy/">Privacy Policy</a>`));
  assert.ok(html.includes(`src="${basePath}/selenite-avatar.webp"`));
  assert.match(html, /Created for simplicity/);
  assert.match(html, /discord\.com\/oauth2\/authorize\?client_id=1287008074976198667/);
  assert.doesNotMatch(html, /Written to be understood/);
  assert.doesNotMatch(html, /api\/selenite-avatar/);
});

test("Terms of Use renders with route-specific metadata and policy content", async () => {
  const html = await builtPage("terms/index.html");

  assert.match(html, /<title>Terms of Use — Selenite<\/title>/i);
  assert.ok(html.includes(`<link rel="canonical" href="${siteUrl}terms/"`));
  assert.match(html, /Acceptance of these terms/);
  assert.match(html, /Acceptable use/);
  assert.match(html, /Disclaimers and liability/);
  assert.match(html, /\/report-problem/);
});

test("Privacy Policy renders specific disclosures and route metadata", async () => {
  const html = await builtPage("privacy/index.html");

  assert.match(html, /<title>Privacy Policy — Selenite<\/title>/i);
  assert.ok(html.includes(`<link rel="canonical" href="${siteUrl}privacy/"`));
  assert.match(html, /MongoDB Atlas/);
  assert.match(html, /5,000 records/);
  assert.match(html, /latest 100 messages/);
  assert.match(html, /PRIVACY REQUEST/);
  assert.match(html, /does not sell or rent Discord API data/);
});

test("404 output is excluded from search results and has no home canonical", async () => {
  const html = await builtPage("404.html");
  const robotsTags = html.match(/<meta name="robots" content="[^"]+"\/>/g) || [];

  assert.equal(robotsTags.length, 1);
  assert.match(robotsTags[0], /noindex/);
  assert.doesNotMatch(html, /<link rel="canonical"/);
  assert.match(html, /404: This page could not be found/);
});

test("all exported internal page, asset, and fragment links resolve", async () => {
  const pages = ["index.html", "terms/index.html", "privacy/index.html", "404.html"];

  for (const page of pages) {
    const html = await builtPage(page);
    const documentIds = new Set(
      [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]),
    );

    for (const [, attribute, value] of html.matchAll(/\s(href|src)="([^"]+)"/g)) {
      if (attribute === "href" && value.startsWith("#")) {
        assert.ok(
          documentIds.has(value.slice(1)),
          `${page} links to missing fragment ${value}`,
        );
        continue;
      }

      if (!value.startsWith("/")) {
        continue;
      }

      assert.ok(
        value === `${basePath}/` || value.startsWith(`${basePath}/`),
        `${page} contains a path outside the configured base path: ${value}`,
      );

      const withoutBasePath = value.slice(basePath.length).split(/[?#]/, 1)[0];
      const exportedPath = withoutBasePath.endsWith("/")
        ? `${withoutBasePath.slice(1)}index.html`
        : withoutBasePath.slice(1);

      await assert.doesNotReject(
        access(new URL(exportedPath, outDirectory)),
        `${page} links to missing exported file ${value}`,
      );
    }
  }
});

test("all generated inline JavaScript parses successfully", async () => {
  const pages = ["index.html", "terms/index.html", "privacy/index.html", "404.html"];

  for (const page of pages) {
    const html = await builtPage(page);
    const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1])
      .filter(Boolean);

    assert.ok(scripts.length > 0, `${page} should contain generated inline scripts`);

    scripts.forEach((source, index) => {
      assert.doesNotThrow(
        () => new vm.Script(source, { filename: `${page}#inline-${index + 1}` }),
        `${page} contains invalid inline JavaScript`,
      );
    });
  }
});

test("manifest, robots, and sitemap use only the final public origin", async () => {
  const manifest = JSON.parse(await builtPage("manifest.webmanifest"));
  const robots = await builtPage("robots.txt");
  const sitemap = await builtPage("sitemap.xml");
  const allowedPath = basePath ? `${basePath}/` : "/";

  assert.equal(manifest.start_url, siteUrl);
  assert.equal(manifest.icons[0].src, `${siteUrl}selenite-avatar.webp`);
  assert.ok(robots.includes(`Allow: ${allowedPath}`));
  assert.ok(robots.includes(`Sitemap: ${siteUrl}sitemap.xml`));
  assert.ok(sitemap.includes(`<loc>${siteUrl}</loc>`));
  assert.ok(sitemap.includes(`<loc>${siteUrl}terms/</loc>`));
  assert.ok(sitemap.includes(`<loc>${siteUrl}privacy/</loc>`));
  assert.doesNotMatch(sitemap, /404/);
  assert.doesNotMatch(`${robots}\n${sitemap}`, /\/SELENITE\//);
});

test("avatar refresh uses only Discord's public application profile", async () => {
  const source = await readFile(
    new URL("../scripts/fetch-selenite-avatar.mjs", import.meta.url),
    "utf8",
  );

  assert.match(source, /oauth2\/applications\/\$\{APPLICATION_ID\}\/rpc/);
  assert.match(source, /cdn\.discordapp\.com\/app-icons/);
  assert.match(source, /checked-in fallback/);
  assert.match(source, /content-type/);
  assert.match(source, /RIFF/);
  assert.match(source, /WEBP/);
  assert.doesNotMatch(source, /DISCORD_TOKEN/);
  assert.doesNotMatch(source, /Authorization:\s*`Bot/);
});

test("GitHub Pages workflow targets only the standalone public repository path", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/pages.yml", import.meta.url),
    "utf8",
  );

  assert.match(workflow, /SITE_URL: https:\/\/quantum-sharkware\.github\.io\/selenite-legal\//);
  assert.match(workflow, /NEXT_PUBLIC_BASE_PATH: \/selenite-legal/);
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
  assert.doesNotMatch(workflow, /working-directory: legal-site/);
  assert.doesNotMatch(workflow, /\/SELENITE\//);
});
