# ⚛️ Chain Reaction

[![CI/CD](https://github.com/tarunspartan/chain-reaction/actions/workflows/ci.yml/badge.svg)](https://github.com/tarunspartan/chain-reaction/actions/workflows/ci.yml)

A fast, neon-arcade take on the classic **Chain Reaction** strategy game — 2 to 8 players on one device (or solo against the CPU), installable as a PWA, playable offline.

![Chain Reaction gameplay](docs/gameplay.png)

## 📸 Screenshots

| Start screen — pick mode, board size and players | vs CPU — REX talks trash |
| --- | --- |
| ![Start screen with game mode, board size and player count selection](docs/start-screen.png) | ![vs CPU game with REX speech bubble](docs/mode-cpu.png) |

| Blitz — beat the turn timer | Sudden Death — every fuse shortens |
| --- | --- |
| ![Blitz mode with countdown timer bar](docs/mode-blitz.png) | ![Sudden death banner active](docs/mode-sudden.png) |

| Teams — alpha vs omega | Win screen |
| --- | --- |
| ![Four-player teams game with grouped player dots](docs/mode-teams.png) | ![Win screen showing the winning color](docs/win-screen.png) |

## ✨ Features

- **2–8 players** (pass & play) — pick your own color; turn order follows your picks
- **Five game modes** (see below) including solo play against the CPU
- **Three board sizes** — Small (6×8), Medium (9×12), or Large (fills your screen)
- **Animated chain reactions** — explosion shockwaves resolve in accelerating waves with growing screen shake; orbs tremble when a cell is one orb from critical mass
- **Elimination play** — lose all your orbs and you're out; your turn is skipped; last player standing wins
- **Dark neon UI** — the board glow always shows whose turn it is
- **Synthesized sound** — explosions get louder and brighter as chains deepen (Web Audio, zero assets)
- **PWA** — install it on your phone or desktop and play offline
- In-game tutorial with live animated diagrams, `prefers-reduced-motion` support

## 🕹️ Game Modes

| Mode | What changes |
| --- | --- |
| **Classic** | Pass & play, last player standing wins |
| **vs CPU** | You play first; bots take the other colors. Three difficulties, each with its own personality and trash-talk speech bubbles — **BLOB** (easy, lovable chaos), **REX** (medium, sassy), **VEGA** (hard, coldly calculating) |
| **Blitz** | 5–10 seconds per turn (scales with board size) — run out and a random cell is played for you |
| **Sudden Death** | Long games go to overtime — when the countdown ends, whoever holds the most orbs wins (ties play on) |
| **Teams** | 4/6/8 players in two teams (odd picks vs even picks) — eliminate the whole other side |

## 🎮 How to Play

Players take turns placing orbs in empty cells or cells they already own. Every cell has a **critical mass** — 2 in corners, 3 on edges, 4 in the center. When a cell reaches it, it **explodes**, throwing one orb into each neighbouring cell and **capturing** any opponent orbs there. Captured cells can explode too, setting off massive chain reactions.

A player who loses every orb is eliminated. Outlast everyone to win.

## 🛠️ Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | [React 19](https://react.dev/) |
| Build tool | [Vite 8](https://vitejs.dev/) |
| Animation | [Motion](https://motion.dev/) (LazyMotion + CSS transforms for the board) |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox service worker) |
| Fonts | Bungee + Chakra Petch |

The chain-reaction engine resolves explosions in simultaneous waves on a copied board, with win-checks mid-chain so endgame cascades terminate cleanly.

## 🚀 Getting Started

```bash
npm install
npm run dev       # dev server with HMR → http://localhost:5173
```

### Other scripts

```bash
npm run build     # production build → dist/
npm run preview   # serve the production build locally
npm run deploy    # build + publish dist/ to GitHub Pages
```

## 🔁 CI/CD

Every push and pull request runs the [CI/CD workflow](.github/workflows/ci.yml) on GitHub Actions:

- **CI** — checks out the repo, installs dependencies with `npm ci` (Node 22, cached), and runs the production build.
- **CD** — on pushes to `master`, the built `dist/` folder is pushed to the **`gh-pages`** branch via `peaceiris/actions-gh-pages`, which GitHub Pages serves from.
- **PR previews** — every pull request gets its own build deployed to `gh-pages` under `preview/pr-<number>/`, viewable at `https://tarunspartan.github.io/chain-reaction/preview/pr-<number>/` (link printed in the run summary). The preview is removed automatically when the PR closes.

> One-time setup: in the repo's **Settings → Pages**, set the source to **Deploy from a branch** → `gh-pages`. The `npm run deploy` script still works as a manual fallback.

## 🗺️ Roadmap Ideas

- **Online multiplayer** — rooms & websockets for play across devices
- **Daily Puzzle** — fixed positions to crack in X moves
- **Stats & streaks** — local win tracking per color

## 🙏 Credits

Original game concept by Buddy-Matt Entertainment. Built with 💙 by [@tarunspartan](https://github.com/tarunspartan).
