// CPU opponent for vs-CPU mode — easy / medium / hard
import { resolveMove, legalMoves, orbCounts, criticalMass, neighbours } from './engine'

// each difficulty is a personality — lines shown in speech bubbles
export const PERSONAS = {
    easy: {
        name: 'BLOB',
        lines: {
            start: ["hi!! i'm blob! i press the shiny squares!", "ooh are we playing? yay!", "i picked my favorite color!!", "i ate three orbs before the game. is that bad?"],
            move: ["boop!", "that one looked tasty!", "i like this square. it's friendly.", "was that good? that felt good!", "i did a strategy! i think!", "this one. because it's round.", "hehe. circle go plop.", "my plan is: no plan!!"],
            bigChain: ["WHOA THE BOARD WENT BOOM!!", "did... did i do that??", "so many sparkles!!", "AGAIN AGAIN AGAIN!!"],
            humanBig: ["pretty colors!! wait. those were mine.", "owie.", "my orbs!! where did they go??", "that was loud and i respect it."],
            eliminated: ["aw. i was having fun :(", "bye bye orbs...", "i'll just watch. quietly. sadly.", "tell my orbs i loved them."],
            win: ["wait, I WON?? best day ever!!", "yippee!! can we go again??", "i'm gonna frame this moment!!"],
            lose: ["good game!! i had fun losing!", "you're really good at the boom game!", "can i be on your team next time??"],
        },
    },
    medium: {
        name: 'REX',
        lines: {
            start: ["oh look, a challenger. adorable.", "i'll try to make this quick.", "bring it, meatbag.", "i've beaten calculators smarter than you."],
            move: ["yawn.", "nice move. shame about the next one.", "this is me going easy on you.", "i've seen toasters play better. wait, i am one.", "wake me when it's challenging.", "tick tock. your orbs are on borrowed time.", "bold. wrong, but bold.", "i'd explain my strategy but you'd cry."],
            bigChain: ["BOOM. you're welcome.", "and THAT'S how it's done.", "cleanup on every aisle.", "your orbs work for me now."],
            humanBig: ["ok. lucky. whatever.", "i meant for you to do that.", "pfft. warm-up round.", "enjoy it. screenshot it. it won't happen again."],
            eliminated: ["this is rigged. rematch. now.", "error 404: dignity not found.", "i blame lag. there is no lag. i still blame lag."],
            win: ["gg. don't cry, it stains the keyboard.", "as foretold. by me. just now.", "want a rematch or do you bruise easily?"],
            lose: ["fine. enjoy your little victory, human.", "i let you win. obviously.", "best of three. i wasn't even warmed up."],
        },
    },
    hard: {
        name: 'VEGA',
        lines: {
            start: ["analyzing opponent... threat level: minimal.", "i have already seen how this ends.", "initiating endgame. yours.", "your opening move has a 0.2% survival rate. choose wisely."],
            move: ["calculated.", "predictable.", "your defeat is now 4.7% closer.", "every move you make, i counted on.", "this position appeared in 9,841 of my simulations.", "i am not playing the board. i am playing you.", "your pattern is... disappointingly human.", "noted. catalogued. countered."],
            bigChain: ["cascade complete. as simulated.", "observe: inevitability.", "the dominoes were placed twelve moves ago."],
            humanBig: ["...recalculating.", "anomaly detected. it will not matter.", "a statistical outlier. nothing more."],
            eliminated: ["impossible. re-running simulation...", "this outcome had probability 0.003.", "hardware failure. clearly."],
            win: ["conclusion reached. as computed.", "you lost in every simulated branch. this one included.", "do not feel bad. the math was never on your side."],
            lose: ["you have... exceeded projections. noted.", "updating model. you will not do that twice."],
        },
    },
}

// no-repeat memory: a line can't come back until the rest of its pool has been used
const recentLines = {}

export const speak = (difficulty, event) => {
    const persona = PERSONAS[difficulty]
    const lines = persona && persona.lines[event]
    if(!lines) return null
    const key = `${difficulty}:${event}`
    const used = recentLines[key] || []
    let candidates = lines.map((_, i) => i).filter(i => !used.includes(i))
    if(candidates.length === 0){
        recentLines[key] = []
        candidates = lines.map((_, i) => i)
    }
    const idx = candidates[~~(Math.random() * candidates.length)]
    recentLines[key] = [...(recentLines[key] || []), idx].slice(-(lines.length - 1) || -1)
    return lines[idx]
}

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
