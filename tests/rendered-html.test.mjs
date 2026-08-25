import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ships the DrSmile dashboard and removes starter preview code", async () => {
  const [page, layout, styles, worker] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    access(new URL("../dist/server/index.js", import.meta.url)),
  ]);
  assert.equal(worker, undefined);
  assert.match(layout, /DrSmile Team Dashboard/);
  assert.match(page, /This is where we/);
  assert.match(page, /Products & Pricing/);
  assert.match(page, /PROMOTION_MARKETS = \["Malaysia", "Singapore", "Pharmacy"\]/);
  assert.match(page, /Previous promotion month/);
  assert.match(page, /Next promotion month/);
  assert.match(styles, /font-family: "Poppins"/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
});
