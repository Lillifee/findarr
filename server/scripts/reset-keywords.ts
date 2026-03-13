import { catalogCache } from '@findarr/shared';
import { db } from '../src/db/setup.js';

/**
 * Reset all keywords to null so they can be re-enriched
 * This is a one-time script after changing keywords from NOT NULL to nullable
 */
async function resetKeywords() {
  console.log('Resetting all catalog keywords to null...');

  const result = await db.update(catalogCache).set({ keywords: null });

  console.log(`Reset ${result.changes} items`);
  process.exit(0);
}

resetKeywords().catch(error => {
  console.error('Failed to reset keywords:', error);
  process.exit(1);
});
