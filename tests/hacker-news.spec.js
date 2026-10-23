
import { test, expect } from '@playwright/test';
import { writeStoryState } from '../helpers/state.js';

test('Stage 1: collect top 30 Hacker News stories', async ({ page }) => {
  await page.goto('https://news.ycombinator.com/', {
    waitUntil: 'domcontentloaded',
  });

  const stories = await page
    .locator('tr.athing.submission')
    .evaluateAll(rows =>
      rows.slice(0, 30).map(row => {
        const details = row.nextElementSibling;
        const link = row.querySelector('.titleline > a');

        const pointsText =
          details?.querySelector('.score')?.textContent ?? '';

        const commentLinks = [
          ...(details?.querySelectorAll('a') ?? []),
        ];

        const commentLink = commentLinks.find(a =>
          /\bcomments?\b|\bdiscuss\b/i.test(a.textContent ?? '')
        );

        const pointsMatch = pointsText.match(/\d+/);
        const commentsMatch = (
          commentLink?.textContent ?? ''
        ).match(/\d+/);

        let domain = null;

        try {
          domain = new URL(link.href).hostname.replace(/^www\./, '');
        } catch {}

        return {
          id: row.id,
          rank: Number(
            row.querySelector('.rank')?.textContent?.replace('.', '')
          ),
          title: link?.textContent?.trim() ?? '',
          url: link?.href ?? '',
          domain,
          points: pointsMatch ? Number(pointsMatch[0]) : 0,
          commentCount: commentsMatch ? Number(commentsMatch[0]) : 0,
        };
      })
    );

  console.log('Stories collected:', stories.length);

  expect(stories).toHaveLength(30);
  expect(
    stories.every(story => story.id && story.title && story.url)
  ).toBeTruthy();

  // Save Stage 1 data for the next stages.
  await writeStoryState(stories);
});
