// What's new, in the user's terms — what actually changed about using the app,
// not what changed in the code. Newest first.
//
// This is the in-app copy. The GitHub release notes for each version say the
// same things in the same voice, because the update sheet shows them verbatim.
//
// kind: 'new' | 'improved' | 'fixed'
export const CHANGELOG = [
  {
    version: '1.2.0',
    date: '2026-07-14',
    summary: 'Hear a word said out loud, pin it to the page you actually met it on, and a lighter, sharper set of icons everywhere.',
    changes: [
      { kind: 'new', text: 'Hear how a word is said. Tap the speaker on any word — in the dictionary or in your saved vocabulary — and ReFocus plays the dictionary\'s own recording. Where there isn\'t one, your phone reads the word out instead, so the button works on every word, including the ones you saved before this update.' },
      { kind: 'new', text: 'Set the page when you look a word up. The field starts at the page you\'ve saved, but where you\'re actually reading is rarely the last page you told the app about. You can also fix the page on a word you already saved, with Edit page.' },
      { kind: 'improved', text: 'Removing a word from your vocabulary now asks first, the way deleting a note already did — a mistapped Remove no longer costs you the word.' },
      { kind: 'improved', text: 'Notes and saved words now say Edit and Delete in words rather than as bare icons, so it\'s clear what each one does before you tap it.' },
      { kind: 'improved', text: 'ReFocus is a good deal smaller to download. The icon font it used to ship weighed nearly 4 MB on its own; the new icons are drawn as part of the app.' },
      { kind: 'fixed', text: 'Icons are the size they were meant to be. A quirk of the old icon font quietly forced every icon in the app to one size, so small icons sat oversized in their buttons and the big ones on the setup and celebration screens came out shrunken.' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-14',
    summary: 'A dictionary for your books, tidier notes, a way to start a round over, and updates you can install from inside the app.',
    changes: [
      { kind: 'new', text: 'Look up a word without leaving your book. Every word you look up is kept with its definition and synonyms in that book\'s own Vocabulary list, so you can come back to it later.' },
      { kind: 'new', text: 'You can now edit a note after saving it — no more deleting and retyping to fix a typo.' },
      { kind: 'new', text: 'End a round and start it over from the first session. It only clears the round counter; the focus sessions you already finished stay in your history and stats.' },
      { kind: 'new', text: 'Delete entries from your history, one at a time or several at once with Select.' },
      { kind: 'new', text: 'Check for updates from Settings. If there\'s a new version, ReFocus can download and install it for you — and this page tells you what changed.' },
      { kind: 'improved', text: 'Notes are easier to tell apart at a glance, and a long quote now folds down to a few lines with a Show more link instead of pushing the rest of the page away.' },
      { kind: 'improved', text: 'On the timer, Skip now looks like the button it is, rather than blending in with the Sessions and Break read-outs beside it.' },
      { kind: 'fixed', text: 'Writing a long note no longer fights you: scrolling through what you\'ve typed used to drag the whole sheet down and throw the note away. The keyboard also stops covering the box you\'re typing in.' },
      { kind: 'fixed', text: 'The Break tile on the timer now shows your new break length as soon as you change it, instead of appearing stuck at 5 minutes until you left the screen and came back.' },
      { kind: 'fixed', text: 'The start button no longer changes size as its label switches between Start Focus, Pause, Resume and Start Break.' },
      { kind: 'fixed', text: 'Line breaks you type into a note are kept instead of being flattened into one paragraph.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-12',
    summary: 'The first complete ReFocus: a focus timer, your reading, and your tasks in one place.',
    changes: [
      { kind: 'new', text: 'A pomodoro timer that keeps running when you leave the app, with controls and a chime in the notification so a session ends on time even with your phone in your pocket.' },
      { kind: 'new', text: 'A reading shelf: add books by searching for them, track the page you\'re on, and keep notes and quotes against each one.' },
      { kind: 'new', text: 'Tasks with due dates, priorities and subtasks.' },
      { kind: 'new', text: 'Stats, a day-by-day history, streaks, and achievements that tier up as you go.' },
      { kind: 'new', text: 'Light, dark and system themes, chosen during a short setup when you first open the app.' },
      { kind: 'new', text: 'Everything stays on your device. Export a CSV backup at any time to keep it safe or move it to another phone.' },
    ],
  },
];

export const latestEntry = CHANGELOG[0];

export function entryFor(version) {
  const wanted = String(version).replace(/^v/i, '');
  return CHANGELOG.find((e) => e.version === wanted) || null;
}
