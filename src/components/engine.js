// pure chain-reaction engine — no React, usable by the UI, the AI and tests

export const criticalMass = (x, y, rows, cols, capDrop = 0) => {
    const onRowEdge = x === 0 || x === rows - 1
    const onColEdge = y === 0 || y === cols - 1
    const cap = onRowEdge && onColEdge ? 2 : onRowEdge || onColEdge ? 3 : 4
    return Math.max(1, cap - capDrop)
}

export const neighbours = (x, y, rows, cols) =>
    [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b]) => a >= 0 && a < rows && b >= 0 && b < cols)

export const cloneBoard = (board) => board.map(row => row.map(cell => [...cell]))

export const findUnstable = (board, rows, cols, capDrop = 0) => {
    const unstable = []
    board.forEach((row,i) => row.forEach((cell,j) => {
        if (cell[0] >= criticalMass(i, j, rows, cols, capDrop)) unstable.push([i, j])
    }))
    return unstable
}

export const orbCounts = (board) => {
    const counts = {}
    board.forEach(row => row.forEach(([n, owner]) => {
        if (owner) counts[owner] = (counts[owner] || 0) + n
    }))
    return counts
}

export const legalMoves = (board, color) => {
    const moves = []
    board.forEach((row,i) => row.forEach((cell,j) => {
        if (cell[1] === null || cell[1] === color) moves.push([i, j])
    }))
    return moves
}

// apply one explosion wave in place; returns the next unstable set
export const applyWave = (board, unstable, color, rows, cols, capDrop = 0) => {
    unstable.forEach(([i,j]) => {
        board[i][j][0] -= criticalMass(i, j, rows, cols, capDrop)
        if (board[i][j][0] <= 0) { board[i][j][0] = 0; board[i][j][1] = null }
    })
    unstable.forEach(([i,j]) => {
        neighbours(i, j, rows, cols).forEach(([a,b]) => {
            board[a][b][0] += 1
            board[a][b][1] = color
        })
    })
    return findUnstable(board, rows, cols, capDrop)
}

// fully resolve a move with no animation; returns null if the move is illegal
export const resolveMove = (board, x, y, color, rows, cols, capDrop = 0) => {
    const owner = board[x][y][1]
    if (owner !== null && owner !== color) return null
    const b = cloneBoard(board)
    b[x][y] = [b[x][y][0] + 1, color]
    let unstable = findUnstable(b, rows, cols, capDrop)
    let waves = 0
    while (unstable.length > 0) {
        unstable = applyWave(b, unstable, color, rows, cols, capDrop)
        waves += 1
        // a saturated single-owner board chains forever — the game is already won
        if (waves > 200 || Object.keys(orbCounts(b)).length <= 1) break
    }
    return { board: b, waves }
}
