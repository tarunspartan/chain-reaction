import React, { useEffect, useState } from 'react'
import './Board.css'

const Board = () => {

    let flag = 0
    let clickable = true

    const [ BoardArray, setBoardArray ] = useState([])
    const [ BoardColumns, setBoardColumns ] = useState('')
    const [ BoardRows, setBoardRows ] = useState('')
    const [ Player, setPlayer ] = useState('red')
    const [ click, setClick ] = useState(true)

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
        if(clickable){
        flag+=1
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
    }

    const checkWinningStats = () => {
        if(flag >= 3){
        let reds = null
        let greens = null
        BoardArray.map(row => {
            return row.map(block => block[1] !== null ? block[1] === 'red' ? reds+=1 : block[1] === 'green' ? greens+=1 : null : null)
        })
        if(reds === null){
            setClick(!click)
            document.getElementById('container').style.filter = 'opacity(0.7)'
            clickable = false
            let div = document.createElement('div')
            div.style.width = '75%'
            div.style.position = 'absolute'
            div.style.top = '100px'
            div.innerHTML = `<center>Player Green Won<br /><span>Tap to play again</center>`
            document.getElementById('container').appendChild(div)
            document.getElementById('container').onclick = () => window.location.reload()
        }
        if(greens === null){
            setClick(!click)
            document.getElementById('container').style.filter = 'opacity(0.7)'
            clickable = false
            let div = document.createElement('div')
            div.style.width = '75%'
            div.style.position = 'absolute'
            div.style.top = '100px'
            div.innerHTML = `<center>Player Red Won<br /><span>Tap to play again</center>`
            document.getElementById('container').appendChild(div)
            document.getElementById('container').onclick = () => window.location.reload()
        }
        }
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
        checkWinningStats()
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
        <div className='container' id='container'>
            <div className='centerDiv'>
            {
                BoardArray.map((row,rowindex) => {
                    return <div key={rowindex} style={{height:'50px'}}>
                    {row.map((col,colindex) => {
                        return <React.Fragment key={rowindex+colindex}>
                            <div className='block'
                                style={{border:`1px solid ${Player}`}}
                                onClick={(click && (BoardArray[rowindex][colindex][1] === Player || BoardArray[rowindex][colindex][1] === null)) ? () => blockClickHandler(rowindex,colindex,Player) : null}
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
