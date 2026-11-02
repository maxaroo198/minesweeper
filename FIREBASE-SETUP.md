# Public leaderboard: setup

Fifteen minutes of clicking in the Firebase console and your scores are shared
between every device. It runs on Firebase's free Spark plan — no card, no billing.

The code is already written and waiting for config. `src/publicBoard.ts` reads three
environment variables and, when they are missing, quietly stays local.

---

## 1. Create the project

1. Go to <https://console.firebase.google.com> and sign in with your Google account.
2. **Create a project** → name it `minefield` (project id becomes something like
   `minefield-4f2a1`) → Google Analytics **off** (you do not need it) → **Create project**.

## 2. Turn on Firestore

1. In the left sidebar: **Build → Firestore Database** → **Create database**.
2. Pick a location near you (e.g. `us-west1`) — this cannot be changed later.
3. Choose **Start in production mode** → **Create**. (You will paste real rules in step 4.)

## 3. Register a web app and copy the config

1. Click the **⚙️ gear → Project settings** → scroll to **Your apps** → hit the **</>** (web) icon.
2. Nickname: `minefield-web`. **Do not** tick Firebase Hosting. → **Register app**.
3. Firebase shows a `firebaseConfig` block. You need three values from it:

   | In the console | In your `.env` |
   | --- | --- |
   | `apiKey` | `VITE_FIREBASE_API_KEY` |
   | `projectId` | `VITE_FIREBASE_PROJECT_ID` |
   | `appId` | `VITE_FIREBASE_APP_ID` |

## 4. Paste the security rules

**Firestore Database → Rules** tab → replace everything with the contents of
`firestore.rules` from this repo → **Publish**.

Those rules let anyone read the board, let a well-formed win record be created,
and forbid edits and deletes — so nobody can rewrite someone else's time.

## 5. Put the config on your machine

```sh
cd /home/max/minesweeper-fresh          # or wherever the project lives
cp .env.example .env
$EDITOR .env                            # paste your three values
```

```dotenv
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_PROJECT_ID=minefield-4f2a1
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
```

`.env` is git-ignored, so your keys stay on your machine. (These values are not
secrets in the usual sense — they ship in every web client — the rules are what
protect the data.)

## 6. Restart the dev server

Vite only reads `.env` at startup:

```sh
npm run dev
```

## 7. Prove it works

1. Play a **Classic** or **Blitz** game and win.
2. The win card asks **"What name should go on the public leaderboard?"** — type a
   name and hit **Post**.
3. Go to **Leaderboard** → the *Public leaderboard* table should now list you.
4. Open the game in a second browser (or incognito) — your score is there too.

If the table stays empty, open the browser console and look for `permission-denied`
(the rules are not published yet) or `failed-precondition` (the index below is missing).

## 8. The composite index

The public board queries `mode == X` **and** orders by `seconds`. Firestore often
wants an index for that; the first such query fails with a console error containing
a **Create index** link — click it, wait a minute, reload. Nothing else to do.

The Blitz board asks for every difficulty at once, so it needs the same index on
`mode + seconds` only. That link covers it.

---

## Optional: make it real

* **Deploy the web build** — `npm run build` then host `dist/` anywhere static
  (Vercel, Netlify, GitHub Pages, Firebase Hosting). Set the same three env vars in
  the host's dashboard; Vite bakes them in at build time.
* **Abuse** — the rules cap names at 24 characters and times at 1–86 400 seconds.
  If you ever want to stop obvious cheats, add App Check or a Cloud Function that
  validates the record server-side; the schema is in `src/publicBoard.ts`.
* **Reset the board** — Firestore → the `scores` collection → delete the documents.
