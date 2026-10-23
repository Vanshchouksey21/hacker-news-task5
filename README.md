@'
# Hacker News Playwright Task 5

## Test stages

1. Stage 1 collects the top 30 Hacker News stories from the UI and saves typed state.
2. Stage 2 compares saved UI stories against the Hacker News API.
3. Stage 3 verifies pagination, ranks 31–60, and no overlap with the first page.
4. Stage 4 checks comment pagination and compares the displayed comment count with loaded comments.

## API comparison tolerances

- Minimum UI/API story overlap: 80%.
- Maximum points drift: 15.
- Maximum comments drift: 5.

Hacker News data changes frequently. These tolerances allow limited differences between UI and API snapshots without ignoring substantial mismatches.

## Retries

Network operations retry transient network errors and timeouts up to three attempts. Assertion failures are not retried by the helper. HTTP status responses such as 429 or 5xx should be handled explicitly if retrying those responses is required.

## Accessibility

Axe scans run against the front page and a comment page. Results are attached as JSON. The suite compares current violations against stored baselines and fails when new violation rules or impacts are detected.

The comparison uses violation rule ID and impact, so a new affected element under an already-baselined rule may not count as a new violation.

## Reporting

The custom JSON reporter records test status, duration, errors, and available stage metrics, including API overlap and maximum points/comments drift.

## CI

GitHub Actions prepares shared story state, runs tests across two shards, uploads failure traces and reports, and merges Playwright blob reports into an HTML report.

## Run tests

```bash
npx playwright test