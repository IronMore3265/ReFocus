// What's new, in the user's terms — what actually changed about using the app,
// not what changed in the code. Newest first.
//
// This is the in-app copy. The GitHub release notes for each version say the
// same things in the same voice, because the update sheet shows them verbatim.
//
// One line per change — this is a list you skim, not prose you read. Lead with
// the thing that changed, and stop. If a point needs a second sentence to explain
// itself, it's either the wrong point or two points. Small fixes nobody was
// waiting on don't each earn a line; they collect into a single "minor bug fixes
// and quality-of-life improvements" at the end of Fixed.
//
// kind: 'new' | 'improved' | 'fixed'
export const CHANGELOG = [
  {
    version: '1.3.4',
    date: '2026-07-17',
    summary: 'Scan actually opens Google Lens now.',
    changes: [
      { kind: 'fixed', text: 'Scan opens Google Lens instead of saying it isn\'t available on your device.' },
    ],
  },
  {
    version: '1.3.3',
    date: '2026-07-17',
    summary: 'Scan a page with Google Lens instead of typing the quote out.',
    changes: [
      { kind: 'new', text: 'Notes have a Scan button that opens Google Lens — copy the text off the page, come back, and tap Paste scanned text.' },
      { kind: 'fixed', text: 'The arrow between page numbers in Reading History sits level with them again.' },
    ],
  },
  {
    version: '1.3.2',
    date: '2026-07-17',
    summary: 'Ticking things off no longer reloads the page out from under you.',
    changes: [
      { kind: 'fixed', text: 'Ticking a subtask no longer reloads the task and throws you back to the top of it.' },
      { kind: 'fixed', text: 'Adding, renaming, deleting or reordering a subtask leaves the rest of the page where it was.' },
      { kind: 'fixed', text: 'On Home, starting, pausing and skipping the timer no longer reload the page.' },
      { kind: 'fixed', text: 'Ticking off your next task on Home swaps in the one after it, without a reload.' },
      { kind: 'fixed', text: 'Ticking a task off on the Tasks tab keeps your place in the list.' },
      { kind: 'improved', text: 'Weekly Activity is marked with a bar chart, matching the bars underneath it.' },
      { kind: 'improved', text: 'The achievements card is titled Achievements, and its heading now fits on one line.' },
    ],
  },
  {
    version: '1.3.1',
    date: '2026-07-17',
    summary: 'Pronunciation works on every saved word, subtasks read properly, and a tidier Focus Stats.',
    changes: [
      { kind: 'fixed', text: 'The speaker now works on words you saved before this update — ReFocus fetches the recording from Merriam-Webster the first time you tap it, and keeps it.' },
      { kind: 'fixed', text: 'Long subtasks wrap onto the next line instead of running off the side.' },
      { kind: 'fixed', text: 'Reordering a subtask no longer reloads the page and throws you back to the top.' },
      { kind: 'improved', text: 'Notes and Vocabulary are ordered by page, deepest first.' },
      { kind: 'improved', text: 'Focus Stats: Weekly Activity has an icon, the Daily Streak flames are bigger, and a recent achievement fits on one line.' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-07-17',
    summary: 'A book page you can scan, subtasks you can fix and reorder, medals worth earning, and a status bar that follows your theme.',
    changes: [
      { kind: 'new', text: 'Reading history now opens a book, with a two-week chart and your totals.' },
      { kind: 'new', text: 'Set your page with a slider — drag either way to fix a number you got wrong.' },
      { kind: 'new', text: 'Notes and Vocabulary are now tabs, so a long word list stops burying the page.' },
      { kind: 'new', text: 'Subtasks can be edited, added with the + button, and reordered with arrows.' },
      { kind: 'new', text: 'Low-priority tasks show a double-down arrow, mirroring high priority.' },
      { kind: 'new', text: 'Word lookups fall back to Merriam-Webster for pronunciation, synonyms, and words the free dictionary has never heard of.' },
      { kind: 'improved', text: 'Achievement medals are now hexagons lit with their tier colour, legible in both themes.' },
      { kind: 'fixed', text: 'The status and navigation bars follow your theme instead of always being light.' },
      { kind: 'fixed', text: 'Tapping anywhere on a task opens it, not just the title.' },
      { kind: 'fixed', text: 'Minor bug fixes and quality-of-life improvements.' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-07-14',
    summary: 'Hear a word said out loud, pin it to the page you met it on, and a lighter set of icons everywhere.',
    changes: [
      { kind: 'new', text: 'Hear how a word is said — tap the speaker, with your phone\'s voice as backup.' },
      { kind: 'new', text: 'Set the page when you look a word up, and fix it later with Edit page.' },
      { kind: 'improved', text: 'Removing a word from your vocabulary now asks first.' },
      { kind: 'improved', text: 'Notes and saved words say Edit and Delete in words rather than bare icons.' },
      { kind: 'improved', text: 'ReFocus is a good deal smaller to download — 4.7 MB, down from 8.6 MB.' },
      { kind: 'fixed', text: 'Icons are the size they were meant to be — the old icon font had forced them all to one size.' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-14',
    summary: 'A dictionary for your books, tidier notes, a way to start a round over, and updates you can install from inside the app.',
    changes: [
      { kind: 'new', text: 'Look up a word without leaving your book — it\'s saved to that book\'s Vocabulary.' },
      { kind: 'new', text: 'Edit a note after saving it.' },
      { kind: 'new', text: 'End a round and start over from the first session, keeping the sessions you finished.' },
      { kind: 'new', text: 'Delete history entries, one at a time or several at once with Select.' },
      { kind: 'new', text: 'Check for updates from Settings, and read what changed before you install.' },
      { kind: 'improved', text: 'Long quotes fold down to a Show more link instead of pushing the page away.' },
      { kind: 'improved', text: 'On the timer, Skip now looks like the button it is.' },
      { kind: 'fixed', text: 'Writing a long note no longer throws it away when you scroll, or hides the box behind the keyboard.' },
      { kind: 'fixed', text: 'Minor bug fixes and quality-of-life improvements.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-12',
    summary: 'The first complete ReFocus: a focus timer, your reading, and your tasks in one place.',
    changes: [
      { kind: 'new', text: 'A pomodoro timer that keeps running — with controls and a chime — when you leave the app.' },
      { kind: 'new', text: 'A reading shelf: search for books, track your page, keep notes and quotes.' },
      { kind: 'new', text: 'Tasks with due dates, priorities and subtasks.' },
      { kind: 'new', text: 'Stats, a day-by-day history, streaks, and achievements that tier up as you go.' },
      { kind: 'new', text: 'Light, dark and system themes.' },
      { kind: 'new', text: 'Everything stays on your device, with CSV backup to keep it safe or move it.' },
    ],
  },
];

export const latestEntry = CHANGELOG[0];

export function entryFor(version) {
  const wanted = String(version).replace(/^v/i, '');
  return CHANGELOG.find((e) => e.version === wanted) || null;
}
