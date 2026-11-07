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
and forbid edits and deletes — so clients cannot rewrite an existing score. They do NOT prove a score is legitimate or prevent spam.

## 5. Put the config on your machine

```sh
cd ~/minefield-patched
cp .env.example .env
nano .env                              # paste your three values; Ctrl+O, Enter, Ctrl+X
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

## 8. The composite indexes

In **Firestore Database → Indexes → Composite → Add index**, use collection ID
`scores`, query scope **Collection**, and create these two indexes:

| Index | Fields (all Ascending) |
| --- | --- |
| Classic / per-difficulty board | `mode`, `difficulty`, `seconds` |
| Blitz / all difficulties | `mode`, `seconds` |

Wait until both indexes say **Enabled**, then reload the leaderboard.
You can also use the error's generated Create index link instead.

### Troubleshooting

- Use the default Firestore database, not a named secondary database.
- Stop Vite with Ctrl+C and restart after editing `.env`.
- The Post button only appears after a **Classic or Blitz win**. Other modes
  currently save locally; configuring Firebase does not change that.
- `permission-denied`: publish this repo's rules to the same Firebase project.
- `failed-precondition`: finish creating the indexes above.
- Invalid API key/project: copy values from the registered web app again.
- The browser's developer console now logs failures instead of hiding them.
- On a deployed site, add the same three environment variables in your hosting
  dashboard **before rebuilding/redeploying**. A local `.env` is not uploaded.
- Do not paste service-account JSON or private keys into Vite variables.

### Why an index is needed

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

## Security and costs

This is a casual, client-submitted leaderboard, not cheat-proof competitive
scoring. Public create access permits fake records and spam. The rules validate
basic fields and forbid client updates/deletes, but do not verify gameplay.
For a competitive launch, add authenticated submissions, rate limiting and
server-side validation; App Check is an additional abuse barrier, not score
verification. Monitor Firestore usage and current free-tier quotas. Do not
assume public access can never incur costs if billing is enabled.

## Round 6: Blitz public scores

Blitz now queries each difficulty separately, using the same per-difficulty
composite index as Classic, then merges the exact fastest 20 across difficulties.
No new rules or document fields are required. If Classic's per-difficulty query
already works, its index also supports Blitz. The separate `mode + seconds` index
is no longer needed by this loader (leaving it in place is harmless).

The board now displays query failures and a Retry button instead of disguising
them as an empty board. If Firebase requests an index, follow its generated link,
wait for Enabled, and retry. Posting completion triggers a refresh. This update
was tested with mocked Firebase queries, not against your live database.
