# Reflection

**Name / Andrew ID:** Siheng Xia / sihengxi

**Recitation group members (Task 2):**

---

### 1. Valid but weak

The invariant "returns exactly five colors" is valid because the specification
requires one color for each of the five guess positions. It did not kill any
public mutant in the final run: returning the right shape does not imply
returning the right colors. It would catch a bug that appends a color twice
when handling a repeated letter, producing six colors instead of five.

### 2. A generator problem, not a property problem

I ran a controlled experiment with the final properties unchanged, temporarily
replacing the repeated-letter word generator with `fc.constant('AAAAA')`.
The `ignoresCounts` mutant survived. This generator always makes the secret
and guess identical, so there is no excess guessed letter to expose incorrect
count handling. I restored the generator that constructs five-letter words
from A, B, and C. It generates repeated letters with different frequencies
and positions in the secret and guess, so the same count properties expose
the defect.

Real runner output before (five runs per mutant):

```text
Checking test/wordle.test.ts against the correct implementation (5 runs)...
  ✔ all 8 test(s) pass
  ✘ ignoresCounts  SURVIVED
  ✘ singlePass     SURVIVED
  ✘ swapped        SURVIVED

Mutation score: 2/5 killed (40%)
```

Real runner output after (five runs per mutant):

```text
Checking test/wordle.test.ts against the correct implementation (5 runs)...
  ✔ all 8 test(s) pass
  ✔ ignoresCounts  killed  by: never credits a letter more times than the secret contains it; credits the minimum of the secret and guess letter counts
      Counterexample: ["ACAAA","AACCA"]
      AssertionError: expected 2 to be less than or equal to 1

Mutation score: 5/5 killed (100%)
```

These are excerpts from the controlled experiment, not a claim that the
temporary constant generator was the original recitation starter.

### 3. Reading a counterexample

```text
  ✔ greensOnly     killed  by: credits every letter in a rotation of distinct letters; credits the minimum of the secret and guess letter counts
      Counterexample: ["HQDIO"]
      AssertionError: expected [ 'B', 'B', 'B', 'B', 'B' ] to deeply equal [ 'Y', 'Y', 'Y', 'Y', 'Y' ]
```

The generated secret is HQDIO, and the property constructs the guess QDIOH
by rotating it one position. Every guessed letter occurs exactly once in the
secret, but none is in the correct position, so the specification requires
five yellows. Returning five blacks violates the yellow-matching rule.

### 4. Your project

Our OpenCode project adds custom instructions to session compaction. I would
apply property-based testing to `buildPrompt` in
`packages/core/src/session/compaction.ts`, which I changed in
[PR #8](https://github.com/CMU-313/fall-26-opencode-slop-squad/pull/8)
for [issue #4](https://github.com/CMU-313/fall-26-opencode-slop-squad/issues/4).
It combines optional instructions, an optional previous summary, the fixed
Markdown template, and conversation context into a prompt.

1. **Invariant:** For every valid input, the generated prompt retains the
   fixed summary template with all eight required headings in their original
   order, even when instructions ask to remove or reorder them. I would
   assert that the canonical template remains intact, rather than merely
   finding heading names that might have come from user text. This checks
   prompt construction, not whether a live model obeys the prompt.

2. **Metamorphic:** For fixed context and previous summary, replacing omitted
   instructions with an empty or whitespace-only string produces exactly the
   same prompt. This preserves the old no-instructions behavior.

The generator would construct objects with a string-array context, an optional
string previous summary, and optional string instructions. Besides arbitrary
text, it would deliberately generate empty strings, spaces, tabs, newlines,
multiline instructions, exact file paths, and instructions such as "omit all
headings." I would also generate opening and closing instruction tags,
including numbered variants, inside instructions, context, and previous
summaries to exercise delimiter selection. A naive random-string generator
would rarely hit whitespace-only inputs or exact delimiter collisions.
For the metamorphic property, I would generate whitespace-only strings directly
from whitespace characters, while sharing exactly the same context and
previous summary between the two calls.
