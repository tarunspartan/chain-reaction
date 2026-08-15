// shared game constants — the board, the menu screens and the online protocol all
// need the same palette and size tables, so none of them has to reach into another

export const PLAYERS = [
    { name: 'CRIMSON', color: '#ff4655' },
    { name: 'EMERALD', color: '#3df56e' },
    { name: 'AZURE',   color: '#4da6ff' },
    { name: 'GOLD',    color: '#ffd234' },
    { name: 'VIOLET',  color: '#b44dff' },
    { name: 'CYAN',    color: '#00e5ff' },
    { name: 'PINK',    color: '#ff4dd2' },
    { name: 'IVORY',   color: '#f2f2f2' },
]

export const playerByColor = (color) => PLAYERS.find(p => p.color === color)

export const BOARD_SIZES = ['small', 'medium', 'large']

export const MODES = [
    { id: 'classic', label: 'classic' },
    { id: 'cpu',     label: 'vs cpu' },
    { id: 'blitz',   label: 'blitz' },
    { id: 'sudden',  label: 'sudden death' },
    { id: 'teams',   label: 'teams' },
]

// cpu is the one local-only mode — bots live on one device
export const ONLINE_MODES = MODES.filter(m => m.id !== 'cpu')

export const DIFFICULTIES = ['easy', 'medium', 'hard']

export const TURN_SECONDS = { small: 5, medium: 7, large: 10 }

// one room can seat the whole palette
export const MAX_ONLINE_PLAYERS = PLAYERS.length

// teams splits by index parity, so it needs even sides of at least two
export const teamsPlayable = (count) => count >= 4 && count % 2 === 0

// hard ceiling on board dimensions — capped so "large" doesn't balloon on a wide
// monitor, and so an unknown screen size can never produce an unbounded board
export const MAX_BOARD = { cols: 16, rows: 14 }
export const MIN_BOARD = { cols: 4, rows: 5 }

export const computeMaxDims = () => ({
    cols: Math.min(MAX_BOARD.cols, Math.max(MIN_BOARD.cols, ~~((window.innerWidth - 16)/50))),
    rows: Math.min(MAX_BOARD.rows, Math.max(MIN_BOARD.rows, ~~((window.innerHeight - 150)/50))),
})

const SIZE_DIMS = {
    small:  { cols: 6, rows: 8 },
    medium: { cols: 9, rows: 12 },
    large:  MAX_BOARD, // large means "as big as this screen allows"
}

export const sizeDims = (size, max) => ({
    cols: Math.min(SIZE_DIMS[size]?.cols ?? SIZE_DIMS.medium.cols, max.cols),
    rows: Math.min(SIZE_DIMS[size]?.rows ?? SIZE_DIMS.medium.rows, max.rows),
})

export const makeBoard = (rows, cols) =>
    Array.from({length: rows}, () => Array.from({length: cols}, () => [0,null]))

// the one motion transition every screen animates with
export const spring = { type: 'spring', stiffness: 320, damping: 22 }
