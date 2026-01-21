import assert from "node:assert/strict";
import test from "node:test";

import {
  publicProfileDetailSelect,
  publicProfileDirectorySelect,
} from "../src/lib/publicProfileQueries";

test("public profile stats selects include reputation_score", () => {
  assert.match(publicProfileDirectorySelect, /reputation_score/);
  assert.match(publicProfileDetailSelect, /reputation_score/);
});
