import React, { useEffect, useState } from 'react'
import './Board.css'

const Board = () => {

    const [ BoardArray, setBoardArray ] = useState([])
    const [ BoardColumns, setBoardColumns ] = useState('')
    const [ BoardRows, setBoardRows ] = useState('')
    const [ Player, setPlayer ] = useState('red')

    useEffect(() => {
        let columns = ~~(window.innerWidth/50)
        setBoardColumns(columns)
        let rows = ~~((window.innerHeight)/50)
        setBoardRows(rows)
        let a = new Array(rows).fill(0)
        let b = a.map(i => a[i] = new Array(columns).fill([0,null]))
        setBoardArray(b)
    },[])

    const blockClickHandler = (x,y,Player) => {
        checkWinningStats()
        setTimeout(() => {
            if(Player)
            changeUser()
            if((x === 0 && y === 0) || (x === 0 && y === BoardColumns-1) || (y === 0 && x === BoardRows-1) || (x === BoardRows-1 && y === BoardColumns-1)){
                return BoardArray[x][y][0] === 1 ? splitHandler(x,y,'corner') : incrementHandler(x,y)
            }else if(x === 0 || y === 0 || x === BoardRows-1 || y === BoardColumns-1){
                return BoardArray[x][y][0] === 2 ? splitHandler(x,y,'side') : incrementHandler(x,y)
            }else{  
                return BoardArray[x][y][0] === 3 ? splitHandler(x,y,'center') : incrementHandler(x,y)
            }
        }, 150);
    }

    const checkWinningStats = () => {
        let reds = 0
        let greens = 0
        BoardArray.map(row => {
            return row.map(block => block[1] === 'red' ? reds+=1 : block[1] === 'green' ? greens+=1 : null)
        })
        console.log(`reds${reds} greens${greens}`)
    }

    const changeUser = () => {
        Player === 'red' ? setPlayer('green') : setPlayer('red')
    }

    const incrementHandler = (x,y) => {
        let items = [...BoardArray]
        let item = [...items[x][y]]
        item[0] += 1
        item[1] = Player
        items[x][y] = item
        setBoardArray(items)
    }

    const setToZeroHandler = (x,y) => {
        BoardArray[x][y][0] = 0
        BoardArray[x][y][1] = null
        setBoardArray([...BoardArray])
    }

    const splitHandler = (x,y,position) => {
        switch (position) {
            case 'corner':
                return x === 0 && y === 0 ? 
                        
                        (setToZeroHandler(x,y),  blockClickHandler(x,y+1), blockClickHandler(x+1,y)) : 
                        
                        x === 0 && y === BoardColumns-1 ? 

                        (setToZeroHandler(x,y),  blockClickHandler(x,y-1), blockClickHandler(x+1,y)) : 

                        y === 0 && x === BoardRows-1 ? 

                        (setToZeroHandler(x,y),  blockClickHandler(x-1,y), blockClickHandler(x,y+1)) :

                        x === BoardRows-1 && y === BoardColumns-1 ? 

                        (setToZeroHandler(x,y),  blockClickHandler(x-1,y), blockClickHandler(x,y-1)) :

                        null

            case 'side':
                return x === 0 ? 

                        (setToZeroHandler(x,y), blockClickHandler(x,y-1), blockClickHandler(x,y+1), blockClickHandler(x+1,y)) :

                        y === 0 ?

                        (setToZeroHandler(x,y), blockClickHandler(x+1,y), blockClickHandler(x-1,y), blockClickHandler(x,y+1)) :

                        x === BoardRows-1 ? 

                        (setToZeroHandler(x,y), blockClickHandler(x,y+1), blockClickHandler(x,y-1), blockClickHandler(x-1,y)) :
                        
                        y === BoardColumns-1 ? 

                        (setToZeroHandler(x,y), blockClickHandler(x+1,y), blockClickHandler(x-1,y), blockClickHandler(x,y-1)) :

                        null

            case 'center':
                return (setToZeroHandler(x,y), blockClickHandler(x,y+1), blockClickHandler(x+1,y), blockClickHandler(x,y-1), blockClickHandler(x-1,y))

            default:
            break;
        }
    }

    return (
        <div className='container'>
            <div className='centerDiv'>
            {
                BoardArray.map((row,rowindex) => {
                    return <div key={rowindex} style={{height:'50px'}}>
                    {row.map((col,colindex) => {
                        return <React.Fragment key={rowindex+colindex}>
                            <div className='block' 
                                style={{border:`1px solid ${Player}`}}
                                onClick={BoardArray[rowindex][colindex][1] === Player || BoardArray[rowindex][colindex][1] === null ? () => blockClickHandler(rowindex,colindex,Player) : null}
                                >
                                <div className={BoardArray[rowindex][colindex][0] === 1 ? 
                                                    'one common' : 
                                                BoardArray[rowindex][colindex][0] === 2 ? 
                                                    'two common' : BoardArray[rowindex][colindex][0] === 3 ?
                                                    'three common' : 'empty'}
                                        style={{backgroundColor:BoardArray[rowindex][colindex][1]}}
                                    >

                                </div>
                            </div>
                        </React.Fragment>
                    
                    })}
                    </div>
                })
            }
        </div>
        </div>
    )
}

export default Board
