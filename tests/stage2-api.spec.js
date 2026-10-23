
import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { retryTransient } from '../helpers/retry.js';
const STATE_FILE = path.resolve(
  'state/hacker-news-state.json'
);

const API_BASE =
  'https://hacker-news.firebaseio.com/v0';

const MIN_OVERLAP_PERCENT = 80;
const MAX_POINT_DRIFT = 15;
const MAX_COMMENT_DRIFT = 5;

function normalizeTitle(title = '') {
  return title.normalize('NFC').replace(/\s+/g, ' ').trim();
}

test('Stage 2: compare saved UI stories with Hacker News API', async ({
  request,
}) => {
  const stateContent = await fs.readFile(STATE_FILE, 'utf8');
  const state = JSON.parse(stateContent);

  expect(state.stories).toHaveLength(30);

const topResponse = await retryTransient(
  () =>
    request.get(`${API_BASE}/topstories.json`, {
      timeout: 15000,
    }),
  {
    attempts: 3,
    delayMs: 1000,
    label: 'Fetch top stories',
  }
);

  expect(
    topResponse.ok(),
    'Hacker News top-stories API request failed'
  ).toBeTruthy();

  const apiTopIds = (await topResponse.json())
    .slice(0, 30)
    .map(String);

  const apiTopIdSet = new Set(apiTopIds);

  const matchingStories = state.stories.filter(story =>
    apiTopIdSet.has(String(story.id))
  );

  const overlapPercentage =
    (matchingStories.length / state.stories.length) * 100;

  console.log('\n--- Stage 2: API comparison ---');
  console.log('Saved UI stories:', state.stories.length);
  console.log('Current API top 30:', apiTopIds.length);
  console.log('Matching story IDs:', matchingStories.length);
  console.log('Overlap percentage:', overlapPercentage.toFixed(2) + '%');

  expect(overlapPercentage).toBeGreaterThanOrEqual(
    MIN_OVERLAP_PERCENT
  );

  const differences = [];
  let maxPointDrift = 0;
  let maxCommentDrift = 0;

  for (const story of matchingStories) {
    const itemResponse = await retryTransient(
  () =>
    request.get(`${API_BASE}/item/${story.id}.json`, {
      timeout: 15000,
    }),
  {
    attempts: 3,
    delayMs: 1000,
    label: `Fetch story ${story.id}`,
  }
);

    expect.soft(
      itemResponse.ok(),
      `API item request failed for story ${story.id}`
    ).toBeTruthy();

    if (!itemResponse.ok()) {
      continue;
    }

    const item = await itemResponse.json();

    const apiPoints = Number(item.score ?? 0);
    const apiComments = Number(item.descendants ?? 0);

    const pointDrift = Math.abs(story.points - apiPoints);
    const commentDrift = Math.abs(
      story.commentCount - apiComments
    );

    maxPointDrift = Math.max(maxPointDrift, pointDrift);
    maxCommentDrift = Math.max(maxCommentDrift, commentDrift);

    const titleMatches =
      normalizeTitle(story.title) === normalizeTitle(item.title);

    differences.push({
      id: story.id,
      titleMatches,
      uiPoints: story.points,
      apiPoints,
      pointDrift,
      uiComments: story.commentCount,
      apiComments,
      commentDrift,
    });

    expect.soft(
      titleMatches,
      `Title mismatch for story ${story.id}`
    ).toBeTruthy();

    expect.soft(
      pointDrift,
      `Point drift exceeded for story ${story.id}`
    ).toBeLessThanOrEqual(MAX_POINT_DRIFT);

    expect.soft(
      commentDrift,
      `Comment drift exceeded for story ${story.id}`
    ).toBeLessThanOrEqual(MAX_COMMENT_DRIFT);
  }

  console.log('\n--- Per-story differences ---');
  console.log(JSON.stringify(differences, null, 2));
  console.log('Largest point drift:', maxPointDrift);
  console.log('Largest comment drift:', maxCommentDrift);

  console.log('\n--- Tolerance summary ---');
  console.log({
    minOverlapPercent: MIN_OVERLAP_PERCENT,
    actualOverlapPercent: overlapPercentage,
    maxAllowedPointDrift: MAX_POINT_DRIFT,
    observedMaxPointDrift: maxPointDrift,
    maxAllowedCommentDrift: MAX_COMMENT_DRIFT,
    observedMaxCommentDrift: maxCommentDrift,
  });

    test.info().annotations.push({
    type: 'metrics',
    description: JSON.stringify({
      overlapPercentage,
      maxPointDrift,
      maxCommentDrift,
    }),
  });

  const softErrors = test.info().errors;

console.log('\n--- Soft Failure Summary ---');

if (softErrors.length === 0) {
  console.log('No soft assertion failures.');
} else {
  console.log(`Total soft failures: ${softErrors.length}`);

  for (const error of softErrors) {
    console.log(`- ${error.message}`);
  }
}

});
