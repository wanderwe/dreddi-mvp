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

test("public profile detail select includes completion metrics", () => {
  assert.match(publicProfileDetailSelect, /completion_executor_marked_count/);
  assert.match(publicProfileDetailSelect, /completion_executor_total_count/);
  assert.match(publicProfileDetailSelect, /completion_reviewer_responded_count/);
  assert.match(publicProfileDetailSelect, /completion_reviewer_total_count/);
});
