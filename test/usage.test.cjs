const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeLimits } = require('../src/usage.cjs');
test('official windows map by duration, with remaining percentages and reset times', () => {
  const result = normalizeLimits({
    rateLimitsByLimitId: {
      codex: {
        secondary: { windowDurationMins: 300, usedPercent: 25, resetsAt: 123 },
        primary: { windowDurationMins: 10080, usedPercent: 100, resetsAt: 456 },
      },
    },
  });
  assert.deepEqual(result.fiveHour, { remaining: 75, resetsAt: 123 });
  assert.deepEqual(result.weekly, { remaining: 0, resetsAt: 456 });
});
test('absent or different-duration quotas never become invented percentages', () => {
  const result = normalizeLimits({
    rateLimits: { primary: { usedPercent: 5, windowDurationMins: 15 } },
  });
  assert.equal(result.fiveHour, null);
  assert.equal(result.weekly, null);
  assert.equal(normalizeLimits({}).fiveHour, null);
});
