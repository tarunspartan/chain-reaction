// CPU opponent for vs-CPU mode — easy / medium / hard
import { resolveMove, legalMoves, orbCounts, criticalMass, neighbours } from './engine'

const evaluate = (board, color, players) => {
    const counts = orbCounts(board)
    const mine = counts[color] || 0
    let enemy = 0
    players.forEach(p => { if (p.color !== color) enemy += counts[p.color] || 0 })
    if (mine === 0) return -1e6
    if (enemy === 0) return 1e6
    return mine - enemy
}

const scoreMoves = (board, color, players, rows, cols, capDrop) => {
    return legalMoves(board, color).map(([x, y]) => {
        const res = resolveMove(board, x, y, color, rows, cols, capDrop)
        let score = evaluate(res.board, color, players)
        const cap = criticalMass(x, y, rows, cols, capDrop)
        // corners and edges are cheaper to defend
        score += (4 - cap) * 0.6
        // quiet moves next to an enemy cell that is about to blow get eaten
        if (board[x][y][0] + 1 < cap) {
            let danger = 0
            neighbours(x, y, rows, cols).forEach(([a, b]) => {
                const [n, o] = board[a][b]
                if (o && o !== color && n === criticalMass(a, b, rows, cols, capDrop) - 1) danger += 1
            })
            score -= danger * 1.5
        }
        score += Math.random() * 0.3 // tie-break variety
        return { move: [x, y], score, after: res.board }
    }).sort((a, b) => b.score - a.score)
}

export const chooseMove = (board, playerIdx, players, rows, cols, difficulty, capDrop = 0) => {
    const color = players[playerIdx].color
    const moves = legalMoves(board, color)
    if (moves.length === 0) return null
    if (difficulty === 'easy') return moves[~~(Math.random() * moves.length)]

    const scored = scoreMoves(board, color, players, rows, cols, capDrop)
    if (difficulty === 'medium') return scored[0].move

    // hard: for the top candidates, assume the next surviving opponent
    // replies greedily, and pick the move with the best worst-case
    const top = scored.slice(0, 8)
    let bestMove = top[0].move
    let bestVal = -Infinity
    for (const cand of top) {
        if (cand.score >= 1e6) return cand.move // immediate win
        const counts = orbCounts(cand.after)
        let oppIdx = -1
        for (let step = 1; step < players.length; step++) {
            const idx = (playerIdx + step) % players.length
            if ((counts[players[idx].color] || 0) > 0) { oppIdx = idx; break }
        }
        let val = cand.score
        if (oppIdx >= 0) {
            const reply = scoreMoves(cand.after, players[oppIdx].color, players, rows, cols, capDrop)[0]
            if (reply) val = evaluate(reply.after, color, players)
        }
        if (val > bestVal) { bestVal = val; bestMove = cand.move }
    }
    return bestMove
}
