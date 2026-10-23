
import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const STATE_FILE = path.resolve('state/hacker-news-state.json');

test('Stage 4: compare comment counts on three stories', async ({ page }) => {
  const content = await fs.readFile(STATE_FILE, 'utf8');
  const state = JSON.parse(content);

  const stories = state.stories
    .filter(story => story.commentCount > 0)
    .slice(0, 3);

  expect(stories).toHaveLength(3);

  for (const story of stories) {
    await page.goto(
      `https://news.ycombinator.com/item?id=${story.id}`,
      { waitUntil: 'domcontentloaded' }
    );

    const headerText = await page.locator('.subtext').first().innerText();
    const headerMatch = headerText.match(/(\d+)\s+comments?/i);
    const headerCount = headerMatch ? Number(headerMatch[1]) : 0;

    const commentRows = page.locator('tr.athing.comtr');
    const visibleCommentCount = await commentRows.count();

    console.log({
      title: story.title,
      headerCount,
      visibleCommentCount,
    });

    expect.soft(
      headerMatch,
      `Comment count not found in header for story ${story.id}`
    ).not.toBeNull();

    expect.soft(
      Math.abs(headerCount - visibleCommentCount),
      `Comment count difference too large for story ${story.id}`
    ).toBeLessThanOrEqual(5);
  }
});
