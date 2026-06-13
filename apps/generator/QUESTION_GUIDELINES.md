# Question Creation Guidelines

Guidelines for generating and editing trivia questions. These generally should be followed, but deviation is acceptable when a question reads more clearly or less revealingly without them.

## 1. Multiple Choice for Specific Numbers

Prefer multiple choice format when asking about a specific numerical value:
- Years ("In what year did X happen?")
- Distances, heights, speeds
- Scientific constants or measurements
- Durations (how long, how many years)
- Counts (how many, total number)

**Format:** Embed options directly in the question text. The `answerText` field contains the correct answer only.

**Example:**
```
questionText: "In what year was the original Game Boy released? A) 1985, B) 1989, C) 1992, D) 1996"
answerText: "1989 (B)"
```

**Exceptions — do NOT use multiple choice when:**
- The options would make the answer obvious (e.g., "Is the speed of light closer to A) 300,000 km/s, B) 30 km/s?" — too easy to eliminate)
- There aren't 3–4 plausible wrong answers to offer (don't pad with implausible options)
- The question is conceptual and a specific number isn't the key fact being tested

## 2. Light Puns as Difficulty Aids

For especially difficult questions, it is acceptable to lightly pun in the question text as a hint toward the answer.

**Purpose:** Gives players a chance at particularly obscure facts; rewards wordplay thinking.

**Guideline:** Keep puns subtle — the question should still work without catching the pun. Don't pun on easy questions where it would make them trivial.

**Example:**
```
questionText: "This Japanese game console's name was a bit of a 'switch' from Nintendo's previous handheld strategy."
answerText: "Nintendo Switch"
```

## Retroactive Application

These guidelines can be applied during the `pnpm review` workflow when editing existing draft questions:
- Edit `questionText` to add multiple choice options where appropriate
- Edit `answerText` to include the correct option letter (e.g., "1989 (B)")
- Revise phrasing to add a subtle pun for very hard questions

No schema changes are required — both formats fit within the existing `questionText`/`answerText` string fields.
