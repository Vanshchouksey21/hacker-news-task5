
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

function getNodeKey(violation, node) {
  return `${violation.id}|${violation.impact}|${JSON.stringify(node.target)}`;
}


function findNewViolations(currentViolations, baselineViolations) {
  const baselineRules = new Set(
    baselineViolations.map(violation =>
      `${violation.id}|${violation.impact}`
    )
  );

  return currentViolations
    .filter(violation =>
      !baselineRules.has(`${violation.id}|${violation.impact}`)
    )
    .map(violation => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      nodes: violation.nodes,
    }));
}


async function attachResults(page, attachmentName, currentViolations, newViolations) {
  await test.info().attach(attachmentName, {
    body: JSON.stringify({
      totalCurrentViolations: currentViolations.length,
      newViolationRules: newViolations.length,
      newViolations,
    }, null, 2),
    contentType: 'application/json',
  });

  console.log('Current violation rules:', currentViolations.length);
  console.log('New violation rules:', newViolations.length);
  console.log(
    'New violation targets:',
    newViolations.flatMap(v => v.nodes.map(n => n.target))
  );
}

test('Accessibility scan: Hacker News front page', async ({ page }) => {
  await page.goto('https://news.ycombinator.com/', {
    waitUntil: 'domcontentloaded',
  });

  const scan = await new AxeBuilder({ page }).analyze();
  const baselinePath = path.resolve('baselines/accessibility.json');

  const baseline = JSON.parse(
    await fs.readFile(baselinePath, 'utf8')
  );
const newViolations = findNewViolations(scan.violations, baseline);

console.log('\n--- DEBUG ACCESSIBILITY ---');
console.log('Baseline rules:', baseline.length);
console.log('Current rules:', scan.violations.length);
console.log('New rules:', newViolations.length);
console.log(
  JSON.stringify(
    newViolations.map(v => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.map(n => n.target),
    })),
    null,
    2
  )
);

  await attachResults(
    page,
    'front-page-accessibility-violations.json',
    scan.violations,
    newViolations
  );

  expect(
    newViolations,
    'New front-page accessibility violations detected'
  ).toEqual([]);
});

test('Accessibility scan: Hacker News comment page', async ({ page }) => {
  await page.goto('https://news.ycombinator.com/item?id=1', {
    waitUntil: 'domcontentloaded',
  });

  const scan = await new AxeBuilder({ page }).analyze();
  const baselinePath = path.resolve(
    'baselines/comment-page-accessibility.json'
  );

  await fs.mkdir(path.dirname(baselinePath), { recursive: true });

  let baseline;

  try {
    baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    await fs.writeFile(
      baselinePath,
      JSON.stringify(scan.violations, null, 2),
      'utf8'
    );

    baseline = scan.violations;
    console.log('Comment-page baseline created:', baselinePath);
  }

  const newViolations = findNewViolations(scan.violations, baseline);

  await attachResults(
    page,
    'comment-page-accessibility-violations.json',
    scan.violations,
    newViolations
  );

  expect(
    newViolations,
    'New comment-page accessibility violations detected'
  ).toEqual([]);
});
