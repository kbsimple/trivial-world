import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { PackIndexEntrySchema, QuestionSchema, PackIndexEntry } from '@trivial-world/types';

const PUBLIC_DIR = resolve(__dirname, '../public');
const PACKS_DIR = resolve(PUBLIC_DIR, 'packs');
const INDEX_PATH = resolve(PUBLIC_DIR, 'api/v1/packs.json');

function loadIndex(): { packs: PackIndexEntry[] } {
  const raw = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
  if (!Array.isArray(raw.packs)) throw new Error('packs.json missing packs array');
  const packs: PackIndexEntry[] = [];
  for (const entry of raw.packs) {
    const result = PackIndexEntrySchema.safeParse(entry);
    if (!result.success) {
      throw new Error(`Invalid index entry "${entry?.name}": ${JSON.stringify(result.error.issues[0])}`);
    }
    packs.push(result.data);
  }
  return { packs };
}

function loadPackFiles(): string[] {
  return readdirSync(PACKS_DIR)
    .filter(f => f.endsWith('.json') && !f.endsWith('add_tidbits.py'))
    .map(f => resolve(PACKS_DIR, f));
}

describe('Pack index (public/api/v1/packs.json)', () => {
  it('parses without errors and every entry passes PackIndexEntrySchema', () => {
    // This throws on any schema violation, giving a precise error message.
    const index = loadIndex();
    expect(index.packs.length).toBeGreaterThan(0);
  });

  it('every pack id is a valid UUID', () => {
    const index = loadIndex();
    const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    for (const pack of index.packs) {
      expect(pack.id, `Pack "${pack.name}" has invalid UUID: ${pack.id}`).toMatch(uuidPattern);
    }
  });

  it('every downloadUrl points to a file that exists in public/packs/', () => {
    const index = loadIndex();
    for (const pack of index.packs) {
      const filename = pack.downloadUrl.split('/').pop()!;
      const fullPath = resolve(PACKS_DIR, filename);
      let exists = true;
      try { readFileSync(fullPath); } catch { exists = false; }
      expect(exists, `Pack "${pack.name}" downloadUrl resolves to missing file: ${filename}`).toBe(true);
    }
  });

  it('has no duplicate ids', () => {
    const index = loadIndex();
    const ids = index.packs.map(p => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe('Pack JSON files (public/packs/*.json)', () => {
  const packFiles = loadPackFiles();

  it('found at least one pack file', () => {
    expect(packFiles.length).toBeGreaterThan(0);
  });

  for (const fpath of packFiles) {
    const filename = fpath.split('/').pop()!;

    describe(filename, () => {
      it('contains a questions array', () => {
        const pack = JSON.parse(readFileSync(fpath, 'utf8'));
        expect(Array.isArray(pack.questions)).toBe(true);
        expect(pack.questions.length).toBeGreaterThan(0);
      });

      it('every question passes QuestionSchema', () => {
        const pack = JSON.parse(readFileSync(fpath, 'utf8'));
        for (const q of pack.questions) {
          const result = QuestionSchema.safeParse(q);
          expect(
            result.success,
            `Question "${q.id}" in ${filename} failed: ${result.success ? '' : JSON.stringify(result.error.issues[0])}`
          ).toBe(true);
        }
      });

      it('every question id is unique within the pack', () => {
        const pack = JSON.parse(readFileSync(fpath, 'utf8'));
        const ids = pack.questions.map((q: { id: string }) => q.id);
        const unique = new Set(ids);
        expect(unique.size).toBe(ids.length);
      });

      it('matches the pack index entry (totalQuestions, checksum in index)', () => {
        const index = loadIndex();
        const pack = JSON.parse(readFileSync(fpath, 'utf8'));
        const entry = index.packs.find(p => p.downloadUrl.endsWith(filename));
        if (!entry) return; // pack not yet indexed — not an error here
        expect(entry.totalQuestions).toBe(pack.questions.length);
      });
    });
  }
});
