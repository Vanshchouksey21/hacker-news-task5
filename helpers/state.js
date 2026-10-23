
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * @typedef {Object} Story
 * @property {string} id
 * @property {number} rank
 * @property {string} title
 * @property {string} url
 * @property {string|null} domain
 * @property {number} points
 * @property {number} commentCount
 */

/**
 * @typedef {Object} StoryState
 * @property {number} schemaVersion
 * @property {string} capturedAt
 * @property {number} page
 * @property {Story[]} stories
 */

const STATE_DIR = path.resolve('state');
const STATE_FILE = path.join(
  STATE_DIR,
  'hacker-news-state.json'
);

export async function writeStoryState(stories) {
  /** @type {StoryState} */
  const state = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    page: 1,
    stories,
  };

  await fs.mkdir(STATE_DIR, { recursive: true });

  await fs.writeFile(
    STATE_FILE,
    JSON.stringify(state, null, 2),
    'utf8'
  );

  console.log(`State saved: ${STATE_FILE}`);
}

export async function readStoryState() {
  const content = await fs.readFile(STATE_FILE, 'utf8');
  return JSON.parse(content);
}
