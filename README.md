# GameSquares.live

Run a **Super Bowl squares** (or any game) pool: 10×10 grid, row and column numbers drawn at game time, winners each quarter by last digit of the two teams' scores.

This README is for the **global admin** who runs the site and the game scores, plus **pool runners** and **players** who use it.

---

## For the global admin (you)

You run the app and control the **one global game** whose scores drive quarter winners for every pool.

### 1. Set the admin passcode

Set `GLOBAL_ADMIN_SECRET` in **two** places (same value):

1. **Vercel** (or your host): Project Settings > Environment Variables. Also add it to `.env.local` for local dev.
2. **Convex dashboard**: Deployment > Settings > Environment Variables.

Both are needed because the Next.js API routes check the secret server-side, and the Convex `setScoresManual` mutation also validates it.

### 2. Admin dashboard

Open **`/admin`** (e.g. `https://yoursite.com/admin`) and enter your passcode. The single admin page includes:

- **Current Game** -- live view of what's in the database (name, quarter scores, possession, source, last updated).
- **Manual Scores** -- form to set game name, quarter scores (Q1-Q4), and game complete. Click **Save scores** to update all pools immediately.
- **ESPN Feed Diagnostic** -- "Test ESPN Feed" button to verify the live score scraper can reach ESPN, find the Super Bowl, parse teams/scores/possession, and whether the cron would write a new row.
- **Force Score Update** -- manually trigger the same `fetchAndUpdateScores` action that the cron runs every minute.

### 3. Automatic scores (ESPN)

The app fetches NFL scores from ESPN every minute via a Convex cron job (`nflScores.fetchAndUpdateScores`). It automatically detects the Super Bowl, builds cumulative quarter scores, tracks ball possession, and deduplicates unchanged data. Use the ESPN diagnostic on `/admin` to verify it's working before game day.

---

## For the pool runner

You create a pool and send the play link to friends. You're the only one who can assign numbers and see the admin board.

### 1. Create a pool

- Go to the **homepage** of the site.
- Click the main CTA to create a pool.
- Enter:
  - **Pool title** (e.g. "Smith Family Super Bowl").
  - **Your email** (you'll get the admin link here).
  - **Squares per person** (e.g. 5 = 20 players for a full board, or 10 = 10 players).
- Submit. You'll get an email with a **magic link** that opens your **admin board**. (In development, a "Dev: Open admin" link may also be shown on the play page.)

### 2. Share the play link

- On your admin board you'll see the **share URL**: `https://yoursite.com/play/XXXXXXXX` (the slug is unique to your pool).
- Send this link to everyone who can pick squares. **Only this link** is needed for players; they do not create accounts.

### 3. Run the board

- **Squares per player:** You can change how many squares each person can claim (e.g. 1, 2, 4, 5, 10) from the admin board.
- **When the board is full:** Use **"Assign Random Numbers"**. The app will assign random 0-9 to the row and column headers. Optionally, if some squares are still empty, you can **"Distribute remaining squares"** first so those get assigned to existing players, then assign numbers.
- **Global game:** If the global admin has set game scores at **`/admin`**, your board will show that game's name, quarter scores, and **quarter winners** (each winning cell is labeled e.g. Q1, Q2).

### 4. After the game

Winners are determined by the **last digit** of the two teams' scores at the end of each quarter. The grid shows which square won each quarter. You can pay out per quarter (e.g. Q1, Q2, Q3, Q4) however you agreed with your group.

---

## For players

You only need the **play link** from the pool runner (e.g. `https://yoursite.com/play/abc12xyz`).

### 1. Open the link and join

- Open the link. You'll see the pool and an option to **join**.
- Enter **your name** and pick an **icon** (emoji or symbol). Then click **Join pool**. You're in; no account or password.

### 2. Pick your squares

- The board is a 10x10 grid. **Tap a square** to claim it. You can claim up to the limit set by the pool (e.g. 5 squares).
- To change a pick: if there are still **open** squares, tap **your** square again to release it, then tap another empty square.
- The board shows who claimed each square (name + icon). You'll see how many picks you have left.

### 3. After the pool runner assigns numbers

- The pool runner will **assign random numbers** to the rows and columns. Once that's done, you'll see digits 0-9 on the row and column headers.
- You don't pick numbers; they're random and the same for everyone.

### 4. During and after the game

- If the **global admin** has entered game scores, the app shows the **game name** and **quarter scores** above or near the grid.
- **Winning squares** for each quarter are highlighted and labeled (e.g. Q1, Q2). The winner for a quarter is the cell whose row and column match the last digit of the two teams' scores at the end of that quarter.
- Check the board to see if your square won any quarter.

---

## Summary

| Role            | Main actions |
|-----------------|--------------|
| **Global admin** | Set `GLOBAL_ADMIN_SECRET` in Vercel and Convex; use `/admin` to manage scores, test ESPN feed, and force updates. |
| **Pool runner**  | Create pool on homepage, get magic link by email, share `/play/{slug}`, assign numbers when board is full. |
| **Player**       | Open `/play/{slug}`, join with name and icon, claim squares, see quarter winners when game scores are set. |

---

## Tech and development

- **Stack:** Next.js (App Router), Convex (backend + realtime), Tailwind.
- **Convex:** Pools, participants, squares, admin tokens, and the global **games** table (one current game with quarter scores). ESPN cron for automatic score updates every minute.
- **Env:** See `.env.example`. `GLOBAL_ADMIN_SECRET` must be set in both Vercel env vars and the Convex dashboard (same value).
- **Secrets:** Do not commit `.env.local` or any real API keys or passcodes; they are gitignored.
- **E2E:** `pnpm test:e2e` runs the full suite; the app starts via Playwright and waits for Convex (`/api/ready`) before tests run.

For Convex function details and local dev, see `convex/README.md` and the Convex docs.
