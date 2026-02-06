# GameSquares.live

Run a **Super Bowl squares** (or any game) pool: 10×10 grid, row and column numbers drawn at game time, winners each quarter by last digit of the two teams’ scores.

This README is for the **global admin** who runs the site and the game scores, plus **pool runners** and **players** who use it.

---

## For the global admin (you)

You run the app and control the **one global game** whose scores drive quarter winners for every pool.

### 1. Set a passcode

In your [Convex dashboard](https://dashboard.convex.dev): open your deployment → **Settings** → **Environment Variables**. Add:

- **Name:** `GLOBAL_ADMIN_SECRET`  
- **Value:** a simple passcode only you know (e.g. a number or phrase)

You’ll type this same passcode on the global admin page to update scores.

### 2. Enter or update game scores

- Open **`/admin/scores`** (e.g. `https://yoursite.com/admin/scores`).
- Enter:
  - **Game name** (e.g. “Super Bowl LIX”).
  - **Passcode** (the value you set as `GLOBAL_ADMIN_SECRET`).
  - **Quarter scores**: for each quarter (Q1–Q4), the **row team score** and **column team score** (e.g. row = AFC, col = NFC).
- Click **Save scores**.

Scores are stored as the single “current” game. All pools use this game to show quarter winners (last digit of row score = row index 0–9, last digit of col score = column index 0–9).

### 3. Optional: automatic scores (ESPN)

The app can fetch NFL scores from ESPN on a schedule (e.g. every 2 minutes). That is configured in Convex (cron + `nflScores` action). For a one-off Super Bowl pool, many operators prefer updating scores manually at **`/admin/scores`** so they stay in control.

---

## For the pool runner

You create a pool and send the play link to friends. You’re the only one who can assign numbers and see the admin board.

### 1. Create a pool

- Go to the **homepage** of the site.
- Click the main CTA to create a pool.
- Enter:
  - **Pool title** (e.g. “Smith Family Super Bowl”).
  - **Your email** (you’ll get the admin link here).
  - **Squares per person** (e.g. 5 → 20 players for a full board, or 10 → 10 players).
- Submit. You’ll get an email with a **magic link** that opens your **admin board**. (In development, a “Dev: Open admin” link may also be shown on the play page.)

### 2. Share the play link

- On your admin board you’ll see the **share URL**: `https://yoursite.com/play/XXXXXXXX` (the slug is unique to your pool).
- Send this link to everyone who can pick squares. **Only this link** is needed for players; they do not create accounts.

### 3. Run the board

- **Squares per player:** You can change how many squares each person can claim (e.g. 1, 2, 4, 5, 10) from the admin board.
- **When the board is full:** Use **“Assign Random Numbers”**. The app will assign random 0–9 to the row and column headers. Optionally, if some squares are still empty, you can **“Distribute remaining squares”** first so those get assigned to existing players, then assign numbers.
- **Global game:** If the global admin has set game scores at **`/admin/scores`**, your board will show that game’s name, quarter scores, and **quarter winners** (each winning cell is labeled e.g. Q1, Q2).

### 4. After the game

Winners are determined by the **last digit** of the two teams’ scores at the end of each quarter. The grid shows which square won each quarter. You can pay out per quarter (e.g. Q1, Q2, Q3, Q4) however you agreed with your group.

---

## For players

You only need the **play link** from the pool runner (e.g. `https://yoursite.com/play/abc12xyz`).

### 1. Open the link and join

- Open the link. You’ll see the pool and an option to **join**.
- Enter **your name** and pick an **icon** (emoji or symbol). Then click **Join pool**. You’re in; no account or password.

### 2. Pick your squares

- The board is a 10×10 grid. **Tap a square** to claim it. You can claim up to the limit set by the pool (e.g. 5 squares).
- To change a pick: if there are still **open** squares, tap **your** square again to release it, then tap another empty square.
- The board shows who claimed each square (name + icon). You’ll see how many picks you have left.

### 3. After the pool runner assigns numbers

- The pool runner will **assign random numbers** to the rows and columns. Once that’s done, you’ll see digits 0–9 on the row and column headers.
- You don’t pick numbers; they’re random and the same for everyone.

### 4. During and after the game

- If the **global admin** has entered game scores, the app shows the **game name** and **quarter scores** above or near the grid.
- **Winning squares** for each quarter are highlighted and labeled (e.g. Q1, Q2). The winner for a quarter is the cell whose row and column match the last digit of the two teams’ scores at the end of that quarter.
- Check the board to see if your square won any quarter.

---

## Summary

| Role            | Main actions |
|-----------------|--------------|
| **Global admin** | Set a passcode in Convex (`GLOBAL_ADMIN_SECRET`); use `/admin/scores` to enter it and set game name and quarter scores. |
| **Pool runner**  | Create pool on homepage → get magic link by email → share `/play/{slug}` → assign numbers when board is full (and optionally distribute remaining squares). |
| **Player**       | Open `/play/{slug}` → join with name and icon → claim squares → after numbers are assigned, see quarter winners when the game scores are set. |

---

## Tech and development

- **Stack:** Next.js (App Router), Convex (backend + realtime), Tailwind.
- **Convex:** Pools, participants, squares, admin tokens, and the global **games** table (one current game with quarter scores). Optional ESPN cron for automatic score updates.
- **Env:** See `.env.example`. Convex env (e.g. `GLOBAL_ADMIN_SECRET`) is set in the Convex dashboard, not in `.env.local`.
- **Secrets:** Do not commit `.env.local` or any real API keys or passcodes; they are gitignored.
- **E2E:** `pnpm test:e2e` runs the full suite; the app starts via Playwright and waits for Convex (`/api/ready`) before tests run.

For Convex function details and local dev, see `convex/README.md` and the Convex docs.
