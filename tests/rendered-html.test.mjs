import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ships the DrSmile dashboard and removes starter preview code", async () => {
  const [page, layout, worker] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    access(new URL("../dist/server/index.js", import.meta.url)),
  ]);
  assert.equal(worker, undefined);
  assert.match(layout, /DrSmile Team Dashboard/);
  assert.match(page, /Everything your team needs/);
  assert.match(page, /Products & Pricing/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
});
