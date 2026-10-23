
import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const STATE_FILE = path.resolve('state/hacker-news-state.json');

test('Stage 3: validate Hacker News pagination', async ({ page }) => {
  const stateContent = await fs.readFile(STATE_FILE, 'utf8');
  const state = JSON.parse(stateContent);
  const page1Ids = new Set(state.stories.map(story => String(story.id)));

  await page.goto('https://news.ycombinator.com/', {
    waitUntil: 'domcontentloaded',
  });

  await page.getByRole('link', { name: 'More' }).click();

  await expect(page).toHaveURL(/p=2/);

  const page2Stories = await page.locator('tr.athing.submission').evaluateAll(rows =>
    rows.map(row => ({
      id: row.id,
      rank: Number(row.querySelector('.rank')?.textContent?.replace('.', '')),
      title: row.querySelector('.titleline > a')?.textContent?.trim() ?? '',
    }))
  );

  expect(page2Stories).toHaveLength(30);

  const overlappingStories = page2Stories.filter(story =>
    page1Ids.has(String(story.id))
  );

  expect(
    overlappingStories,
    'Page 2 should not contain stories saved from page 1'
  ).toHaveLength(0);

  expect(page2Stories[0].rank).toBe(31);
  expect(page2Stories[page2Stories.length - 1].rank).toBe(60);

  console.log('Page 2 story count:', page2Stories.length);
  console.log('Page 2 ranks:', page2Stories[0].rank, 'to', page2Stories[29].rank);
  console.log('Overlapping stories:', overlappingStories.length);
});
