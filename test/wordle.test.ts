import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { matchGuess } from '../src/wordle';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Construct valid five-letter words directly.
const word = fc
  .array(fc.constantFrom(...ALPHABET), { minLength: 5, maxLength: 5 })
  .map(letters => letters.join(''));

// A small alphabet makes repeated letters common.
const repeatedWord = fc
  .array(fc.constantFrom('A', 'B', 'C'), { minLength: 5, maxLength: 5 })
  .map(letters => letters.join(''));

describe('matchGuess', () => {
  // Pattern: invariant. The result always has exactly five colors.
  it('returns exactly five colors', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        expect(matchGuess(secret, guess)).toHaveLength(5);
      }),
    );
  });

  // Pattern: invariant. Every output color is G, Y, or B.
  it('only uses the colors G, Y, B', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        for (const color of matchGuess(secret, guess)) {
          expect(['G', 'Y', 'B']).toContain(color);
        }
      }),
    );
  });

  // Pattern: conditional. Guessing the secret gives all greens.
  it('guessing the secret gives all greens', () => {
    fc.assert(
      fc.property(word, secret => {
        expect(matchGuess(secret, secret)).toEqual(['G', 'G', 'G', 'G', 'G']);
      }),
    );
  });

  // Pattern: invariant. A letter is never credited more times than it occurs in the secret.
  it('never credits a letter more times than the secret contains it', () => {
    fc.assert(
      fc.property(repeatedWord, repeatedWord, (secret, guess) => {
        const colors = matchGuess(secret, guess);
        for (const letter of new Set(guess)) {
          const available = [...secret].filter(value => value === letter).length;
          const credited = [...guess].filter(
            (value, i) => value === letter && (colors[i] === 'G' || colors[i] === 'Y'),
          ).length;
          expect(credited).toBeLessThanOrEqual(available);
        }
      }),
    );
  });
});
