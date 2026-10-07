# Learning system

One scheduler, one session loop. Practice modes plug into the loop. The MVP ships flashcards only.

## Scheduling

- Library: `ts-fsrs`, wrapped by `src/domain/scheduler.ts`. Nothing else imports it.
- Defaults: library default parameters, target retention 0.90, learning steps 1 min and 10 min,
  fuzz enabled.
- Four ratings: Again (1), Hard (2), Good (3), Easy (4). Each rating button shows the interval it
  would produce ("Good · 3 d").
- Every review writes a `review_logs` row, including `prev_card` (JSON of the card before the
  review). The raw log allows undo now and replay with a different algorithm later.

Scheduler wrapper, minimum surface:

```ts
// src/domain/scheduler.ts
export interface Scheduler {
  newCard(now: number): CardSchedule;
  preview(card: CardSchedule, now: number): Record<Rating, { due: number; intervalMs: number }>;
  apply(card: CardSchedule, rating: Rating, now: number): CardSchedule;
}
```

`CardSchedule` is the domain type that maps 1:1 to the `cards` scheduling columns (`CardState` is
the state enum). Mapping to and from the `ts-fsrs` card type happens inside this file only. The
interval label ("3 d") is formatted in the UI through `t()`, from `intervalParts()` in
`src/domain/intervals.ts`.

### Stages

| Stage | Scope |
| --- | --- |
| MVP (M4) | Defaults above. New-word limit 10/day. Session cap 20 cards. Undo. Suspend. |
| V1 (M7, M8) | Recall-direction cards. Mode-to-rating mapping. Target retention setting (0.85-0.95). Catch-up mode. |
| V2 | Parameters optimised on the user's own log. |

## Study day

`src/domain/studyDay.ts`: the study day rolls over at 04:00 local time. "Due today", the daily
new-word limit and the streak all use the study day, not the calendar day.

## Daily limits

- **New-word limit** (default 10): maximum new cards introduced per study day, across all
  dictionaries. Stored in `settings`.
- **Session cap** (default 20): maximum cards per session. The remainder waits behind "Keep going".
- Count already-introduced new cards for today from `review_logs` (first-ever log of a card today).

## Session algorithm

1. **Collect due cards**: `suspended = 0`, word has a meaning and is not deleted, dictionary not
   deleted and `in_daily_review = 1`. Learning/relearning cards are due when `due <= now`; review
   cards when `due` is before the next study-day rollover (so a card due tonight is in this morning's
   queue). Order: learning/relearning first, then review cards by `due` ascending.
2. **Add new cards** up to today's remaining new limit, **newest first** (by word `created_at`),
   interleaved one after every four reviews.
3. **Cap** the queue at the session size.
4. **Sibling rule** (V1): if both directions of a word are due, show one; push the other to the
   next study day.
5. **Pick a mode** per card (V1). In the MVP every card is a flashcard.
6. **On each answer**, in one transaction: insert the `review_logs` row and update the card.
   The UI advances only after the write succeeds.
7. **Requeue**: if the card's new `due` is within 10 minutes of now, put it back in the queue at
   least three cards later (or at the end if fewer remain).
8. **End** when the queue is empty: show missed words (any card rated Again), then the summary.

Because step 6 persists every answer, there is no "resume session" state to store. Reopening the
app builds a fresh queue from the database.

## Undo

Undo applies to the last answer in the current session only:

1. Restore the card from that log row's `prev_card`.
2. Delete that log row.
3. Put the card back at the front of the queue.

## Suspend

"Suspend" / "I know this" sets `cards.suspended = 1` for all of the word's cards. Suspended cards
never enter a queue. The word stays searchable and editable. Unsuspending keeps the old state.

## Practice modes

| Mode | Stage | Used for | Rating sent to the scheduler |
| --- | --- | --- | --- |
| Flashcard | MVP | Any card | The button the user taps |
| Typing | V1 (M7) | Recall cards in review state | Exact match after `termKeys` normalisation: Good. Off by one character or accents only: Hard (show the correct spelling). Otherwise Again. "I was right" override. |
| Multiple choice | V1 (M7) | New and learning cards only | Correct: Good. Wrong: Again. |
| Free practice (any mode) | V1 (M7) | Chosen dictionary, tag, or weak words | Logged with `scheduled = 0`. Card state and due dates do not change. |

Rules:

- Exactly **one** rating per card per session reaches the scheduler, from the first attempt.
  In-session repeats of a requeued learning card follow the learning steps as normal reviews.
- Typing input: autocorrect off, autocapitalise off, keyboard language hint from the dictionary.
- Typing accepts alternatives: split the expected answer on `;` and `/`; any part matches.
- Multiple-choice distractors: same dictionary, prefer same part of speech, never the correct
  meaning, never duplicates. Hide the mode when fewer than four candidates exist.
- Word -> meaning and meaning -> word are **directions** (`recognition` / `recall`), not modes.

- **Free practice** (M7): the owner picks the source (a dictionary, a tag or weak words), the
  modes and the card count on Today → Practice; the last setup is remembered. Cards are a random
  sample (suspended cards left out, any dictionary). The chosen modes take turns; typing only fits
  recall cards, multiple choice needs four options, anything else is a flashcard. Only Again
  brings a card back in the session; undo deletes the practice log.
- In reviews the mode is picked per card (`pickMode`); "Flashcards only" in Settings turns typing
  and multiple choice off.
- A card's mode and options are fixed while it is on screen: saving the answer changes its state,
  which must not switch the mode under the feedback.
- Typing tolerance: one edit counts as close only for answers of 4+ characters.

Not planned before V2: fill in the blank, listen-and-type, matching (see Q8). Never: speed round.

## Weak words and leeches (V1)

- Weak words queue: cards with `lapses >= 3`, or two or more Again ratings in the last 30 days.
  Long intervals are **not** a weakness signal.
- Leech: `lapses >= 8`. On reaching it, prompt once to edit the word (add an example or
  mnemonic) or suspend it.

## Required tests (M4)

- Simulated 60-day history with mostly Good ratings produces strictly growing intervals.
- Again on a review card moves it to relearning and increments `lapses`.
- Requeue places a learning card at least three positions later.
- New-word limit and session cap are respected, including across two sessions in one study day.
- Study-day boundary: a review at 02:00 counts for the previous day.
- Undo restores the exact previous card state and removes the log row.
- Suspended and soft-deleted cards never enter the queue.
