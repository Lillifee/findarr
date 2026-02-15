import type {
  CreateMediaRequest,
  MediaRequest,
  MediaRequestWithUser,
  RequestStatus,
} from '@findarr/shared';
import type { DB } from '../db/setup.js';
import { Conflict, Forbidden, NotFound } from '../utils/errors.js';

// ============================================================================
// Create Operations
// ============================================================================

export const createRequest = (db: DB, data: CreateMediaRequest, userId?: number) => {
  if (!userId) return;

  const existing = getRequestByTmdbId(db, data.tmdbId);

  if (existing) {
    throw Conflict('Media already requested');
  }

  const stmt = db.prepare(`
    INSERT INTO media_requests (userId, mediaType, tmdbId, title, posterPath)
    VALUES (?, ?, ?, ?, ?)
  `);

  const { lastInsertRowid } = stmt.run(
    userId,
    data.mediaType,
    data.tmdbId,
    data.title,
    data.posterPath
  );

  return getRequestById(db, lastInsertRowid as number);
};

// ============================================================================
// Update Operations
// ============================================================================

export const updateRequestStatus = (db: DB, requestId: number, status: RequestStatus) => {
  const update = db
    .prepare(
      `
      UPDATE media_requests
      SET status = ?, updatedAt = unixepoch()
      WHERE id = ?
      `
    )
    .run(status, requestId);

  if (update.changes === 0) {
    throw NotFound('Request not found');
  }
};

// ============================================================================
// Read / Query Operations
// ============================================================================

export const getUserRequests = (db: DB, userId?: number) =>
  userId
    ? db
        .prepare<[number], MediaRequest>(
          `
          SELECT * FROM media_requests
          WHERE userId = ?
          ORDER BY requestedAt DESC
          `
        )
        .all(userId)
    : undefined;

export const getAllRequests = (db: DB) =>
  db
    .prepare<[], MediaRequestWithUser>(
      `
      SELECT 
        mr.*,
        u.email as userEmail,
        u.displayName as userDisplayName
      FROM media_requests mr
      JOIN users u ON mr.userId = u.id
      ORDER BY mr.requestedAt DESC
    `
    )
    .all();

export const getUserRequestById = (
  db: DB,
  requestId: number,
  userId?: number,
  userRole?: string
) => {
  const mediaRequest = getRequestById(db, requestId);

  if (!mediaRequest) {
    throw NotFound('Request not found');
  }

  if (userId !== mediaRequest.userId && userRole !== 'admin') {
    throw Forbidden('Access denied');
  }

  return mediaRequest;
};

export const getRequestById = (db: DB, requestId: number) =>
  db.prepare<[number], MediaRequest>(`SELECT * FROM media_requests WHERE id = ?`).get(requestId);

export const getRequestByTmdbId = (db: DB, tmdbId: number) =>
  db.prepare<[number], MediaRequest>(`SELECT * FROM media_requests WHERE tmdbId = ?`).get(tmdbId);
