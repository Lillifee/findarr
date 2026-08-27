import { toPreferenceKey, type UserPreference } from '@findarr/shared/preferences';

import { createTestMedia } from '../tests/helpers/testHelper.js';
import { scoreMediaItemsForUser } from './scoring.js';

describe('scoreMediaItemsForUser explanations', () => {
  it('does not use a single rating for scoring or explanation', () => {
    const preference: UserPreference = {
      kind: 'genre',
      subjectKey: '28',
      subjectName: 'Action',
      score: -1,
      count: 1,
    };
    const preferences = new Map([
      [toPreferenceKey(preference.kind, preference.subjectKey), preference],
    ]);

    const [result] = scoreMediaItemsForUser(
      [createTestMedia({ genres: [{ id: 28, name: 'Action' }] })],
      preferences,
    );

    expect(result?.state?.score?.userScore).toBe(0.5);
    expect(result?.state?.score?.explanation).toMatchObject({
      positiveSignals: [],
      mixedSignals: [],
      negativeSignals: [],
    });
  });

  it('reports the positive and negative split and classifies a close result as mixed', () => {
    const preference: UserPreference = {
      kind: 'genre',
      subjectKey: '28',
      subjectName: 'Action',
      score: 1,
      count: 15,
    };
    const preferences = new Map([
      [toPreferenceKey(preference.kind, preference.subjectKey), preference],
    ]);

    const [result] = scoreMediaItemsForUser(
      [createTestMedia({ genres: [{ id: 28, name: 'Action' }] })],
      preferences,
    );
    const signal = result?.state?.score?.explanation?.mixedSignals[0];

    expect(signal).toMatchObject({
      name: 'Action',
      positiveCount: 8,
      negativeCount: 7,
    });
  });

  it('does not compound multiple weak genre preferences into a strong match', () => {
    const action: UserPreference = {
      kind: 'genre',
      subjectKey: '28',
      subjectName: 'Action',
      score: 9,
      count: 141,
    };
    const thriller: UserPreference = {
      kind: 'genre',
      subjectKey: '53',
      subjectName: 'Thriller',
      score: 9,
      count: 169,
    };
    const preferences = new Map(
      [action, thriller].map((preference) => [
        toPreferenceKey(preference.kind, preference.subjectKey),
        preference,
      ]),
    );

    const [result] = scoreMediaItemsForUser(
      [
        createTestMedia({
          genres: [
            { id: 28, name: 'Action' },
            { id: 53, name: 'Thriller' },
          ],
        }),
      ],
      preferences,
    );
    const score = result?.state?.score;

    expect(score?.userScore).toBeCloseTo(0.52857, 5);
    expect(score?.explanation).toMatchObject({
      positiveSignals: [],
      negativeSignals: [],
    });
    expect(score?.explanation?.mixedSignals).toHaveLength(2);
  });

  it('does not let sparse keyword evidence outweigh mature genre evidence', () => {
    const preferences: UserPreference[] = [
      { kind: 'genre', subjectKey: '28', subjectName: 'Action', score: 14, count: 22 },
      { kind: 'genre', subjectKey: '80', subjectName: 'Crime', score: -1, count: 15 },
      { kind: 'genre', subjectKey: '53', subjectName: 'Thriller', score: 20, count: 32 },
      {
        kind: 'keyword',
        subjectKey: '239886',
        subjectName: 'child protection',
        score: 2,
        count: 2,
      },
      {
        kind: 'keyword',
        subjectKey: '325773',
        subjectName: 'audacious',
        score: 1,
        count: 3,
      },
    ];
    const preferenceMap = new Map(
      preferences.map((preference) => [
        toPreferenceKey(preference.kind, preference.subjectKey),
        preference,
      ]),
    );
    const [result] = scoreMediaItemsForUser(
      [
        createTestMedia({
          genres: [
            { id: 28, name: 'Action' },
            { id: 80, name: 'Crime' },
            { id: 53, name: 'Thriller' },
          ],
          keywords: [
            { id: 239_886, name: 'child protection' },
            { id: 325_773, name: 'audacious' },
          ],
        }),
      ],
      preferenceMap,
    );

    expect(result?.state?.score?.userScore).toBeCloseTo(0.84297, 5);
  });

  it('keeps established cast evidence competitive with much more common genre evidence', () => {
    const preferences: UserPreference[] = [
      { kind: 'genre', subjectKey: '28', subjectName: 'Action', score: 20, count: 100 },
      { kind: 'cast', subjectKey: '1', subjectName: 'First Lead', score: 10, count: 10 },
    ];
    const preferenceMap = new Map(
      preferences.map((preference) => [
        toPreferenceKey(preference.kind, preference.subjectKey),
        preference,
      ]),
    );

    const [result] = scoreMediaItemsForUser(
      [
        createTestMedia({
          genres: [{ id: 28, name: 'Action' }],
          cast: [{ id: 1, name: 'First Lead', character: '', profilePath: undefined, order: 0 }],
        }),
      ],
      preferenceMap,
    );

    expect(result?.state?.score?.userScore).toBeCloseTo(0.99524, 5);
  });

  it('weights subjects by their evidence rather than metadata tag count', () => {
    const preferenceMap = new Map<string, UserPreference>([
      [
        'keyword:0',
        {
          kind: 'keyword',
          subjectKey: '0',
          subjectName: 'Alien',
          score: 17,
          count: 19,
        },
      ],
      [
        'keyword:1',
        {
          kind: 'keyword',
          subjectKey: '1',
          subjectName: 'Sequel',
          score: 0,
          count: 14,
        },
      ],
    ]);

    const [result] = scoreMediaItemsForUser(
      [
        createTestMedia({
          keywords: [
            { id: 0, name: 'Alien' },
            { id: 1, name: 'Sequel' },
          ],
        }),
      ],
      preferenceMap,
    );

    expect(result?.state?.score?.userScore).toBeCloseTo(0.67895, 5);
  });

  it.each([
    {
      name: 'mixed action thriller profile',
      genres: [
        { id: 28, name: 'Action', score: 11, count: 147 },
        { id: 53, name: 'Thriller', score: 11, count: 177 },
      ],
      keywords: [
        { id: 1930, name: 'kidnapping', score: 3, count: 9 },
        { id: 11_107, name: 'rescue mission', score: -1, count: 3 },
        { id: 298_636, name: 'underworld', score: 0, count: 2 },
        { id: 322_496, name: 'action', score: -2, count: 6 },
      ],
      expectedUserScore: 0.53343,
    },
    {
      name: 'negative drama profile with mixed keywords',
      genres: [
        { id: 53, name: 'Thriller', score: 11, count: 177 },
        { id: 18, name: 'Drama', score: -138, count: 222 },
        { id: 9648, name: 'Mystery', score: -10, count: 72 },
      ],
      keywords: [
        { id: 1930, name: 'kidnapping', score: 3, count: 9 },
        { id: 201_456, name: 'paranoid', score: 2, count: 2 },
        { id: 241_804, name: 'toxic relationship', score: 0, count: 2 },
        { id: 311_315, name: 'dramatic', score: -6, count: 12 },
        { id: 325_787, name: 'complicated', score: -1, count: 3 },
        { id: 325_823, name: 'harsh', score: 3, count: 3 },
        { id: 325_853, name: 'sympathetic', score: 0, count: 4 },
      ],
      expectedUserScore: 0.36609,
    },
    {
      name: 'aligned science fiction and dystopia profile',
      genres: [
        { id: 28, name: 'Action', score: 11, count: 147 },
        { id: 878, name: 'Science Fiction', score: 18, count: 82 },
        { id: 53, name: 'Thriller', score: 11, count: 177 },
      ],
      keywords: [
        { id: 4565, name: 'dystopia', score: 2, count: 8 },
        { id: 4458, name: 'post-apocalyptic future', score: 7, count: 17 },
        { id: 18_249, name: 'game', score: 1, count: 3 },
        { id: 212_516, name: 'dark future', score: 2, count: 2 },
      ],
      expectedUserScore: 0.6858,
    },
  ])('$name produces a differentiated score', ({ genres, keywords, expectedUserScore }) => {
    const preferenceMap = new Map<string, UserPreference>(
      [
        ...genres.map((genre) => ({ ...genre, kind: 'genre' as const })),
        ...keywords.map((keyword) => ({ ...keyword, kind: 'keyword' as const })),
      ].map((preference) => [
        toPreferenceKey(preference.kind, String(preference.id)),
        {
          kind: preference.kind,
          subjectKey: String(preference.id),
          subjectName: preference.name,
          score: preference.score,
          count: preference.count,
        },
      ]),
    );

    const [result] = scoreMediaItemsForUser(
      [
        createTestMedia({
          genres: genres.map(({ id, name }) => ({ id, name })),
          keywords: keywords.map(({ id, name }) => ({ id, name })),
        }),
      ],
      preferenceMap,
    );

    expect(result?.state?.score?.userScore).toBeCloseTo(expectedUserScore, 5);
  });

  it("measures preference relative to a selective user's overall like rate", () => {
    const genres = [
      { id: 28, name: 'Action', score: 11, count: 147 },
      { id: 80, name: 'Crime', score: -32, count: 114 },
      { id: 53, name: 'Thriller', score: 11, count: 177 },
    ];
    const keywords = [
      { id: 14_903, name: 'home invasion', score: 0, count: 2 },
      { id: 239_886, name: 'child protection', score: 2, count: 2 },
      { id: 325_773, name: 'audacious', score: -3, count: 5 },
    ];
    const preferenceMap = new Map<string, UserPreference>(
      [
        ...genres.map((genre) => ({ ...genre, kind: 'genre' as const })),
        ...keywords.map((keyword) => ({ ...keyword, kind: 'keyword' as const })),
      ].map((preference) => [
        toPreferenceKey(preference.kind, String(preference.id)),
        {
          kind: preference.kind,
          subjectKey: String(preference.id),
          subjectName: preference.name,
          score: preference.score,
          count: preference.count,
        },
      ]),
    );

    const [result] = scoreMediaItemsForUser(
      [
        createTestMedia({
          genres: genres.map(({ id, name }) => ({ id, name })),
          keywords: keywords.map(({ id, name }) => ({ id, name })),
        }),
      ],
      preferenceMap,
      { likes: 212, dislikes: 479 },
    );
    const score = result?.state?.score;

    expect(score?.userScore).toBeCloseTo(0.74638, 5);
    expect(
      score?.explanation.mixedSignals.find((signal) => signal.subjectKey === '80'),
    ).toMatchObject({ name: 'Crime', preferenceType: 'mixed' });
  });

  it('scores the configured top-billed cast members', () => {
    const preferences = new Map<string, UserPreference>(
      [
        { id: 1, name: 'First Lead', score: 2 },
        { id: 2, name: 'Second Lead', score: 2 },
        { id: 3, name: 'Third Lead', score: 2 },
        { id: 4, name: 'Fourth Cast Member', score: -2 },
      ].map((member) => [
        `cast:${member.id}`,
        {
          kind: 'cast',
          subjectKey: String(member.id),
          subjectName: member.name,
          score: member.score,
          count: 2,
        },
      ]),
    );

    const [result] = scoreMediaItemsForUser(
      [
        createTestMedia({
          cast: [
            { id: 4, name: 'Fourth Cast Member', character: '', profilePath: undefined, order: 3 },
            { id: 2, name: 'Second Lead', character: '', profilePath: undefined, order: 1 },
            { id: 1, name: 'First Lead', character: '', profilePath: undefined, order: 0 },
            { id: 3, name: 'Third Lead', character: '', profilePath: undefined, order: 2 },
          ],
        }),
      ],
      preferences,
    );
    const score = result?.state?.score;

    expect(score?.userScore).toBeCloseTo(0.68462, 5);
    expect(score?.explanation.positiveSignals.map((signal) => signal.name)).toStrictEqual([
      'First Lead',
      'Second Lead',
      'Third Lead',
    ]);
  });
});
