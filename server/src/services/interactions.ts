import type { InteractionAction } from '@findarr/shared';
import type { DB } from '../db/setup.js';

/**
 * Add a user interaction with media (request, like, dislike)
 */
export function addInteraction(
  db: DB,
  userId: number,
  mediaId: number,
  action: InteractionAction
): void {
  const stmt = db.prepare(`
    INSERT INTO user_media_interactions (userId, mediaId, action)
    VALUES (?, ?, ?)
    ON CONFLICT(mediaId, userId, action) DO NOTHING
  `);

  stmt.run(userId, mediaId, action);
}

/**
 * Check if a user has a specific interaction with media
 */
export function hasInteraction(
  db: DB,
  userId: number,
  mediaId: number,
  action: InteractionAction
): boolean {
  const stmt = db.prepare<[number, number, string], { count: number }>(`
    SELECT COUNT(*) as count
    FROM user_media_interactions
    WHERE userId = ? AND mediaId = ? AND action = ?
  `);

  const result = stmt.get(userId, mediaId, action);
  return (result?.count || 0) > 0;
}

/**
 * Remove a user interaction with media
 */
export function removeInteraction(
  db: DB,
  userId: number,
  mediaId: number,
  action: InteractionAction
): void {
  const stmt = db.prepare(`
    DELETE FROM user_media_interactions
    WHERE userId = ? AND mediaId = ? AND action = ?
  `);

  stmt.run(userId, mediaId, action);
}
