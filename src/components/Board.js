import React, { useEffect, useState } from 'react'
import './Board.css'
import drop from './drop.mp3'
let clickable = true
let flag = 0
const sound = new Audio(drop)
sound.playbackRate = 1.5 

const Board = () => {

    let letMeIn = true

    const [ BoardArray, setBoardArray ] = useState([])
    const [ BoardColumns, setBoardColumns ] = useState('')
    const [ BoardRows, setBoardRows ] = useState('')
    const [ Player, setPlayer ] = useState('red')
    const [ soundStatus, setSoundStatus ] = useState(localStorage.getItem('sound') || 'on')

    useEffect(() => {
        localStorage.setItem('sound',soundStatus)
    },[soundStatus])

    useEffect(() => {
        setBoardColumns(~~(window.innerWidth/50))
        setBoardRows(~~((window.innerHeight)/50))
        let a = new Array(BoardRows).fill(0)
        let b = a.map(i => a[i] = new Array(BoardColumns).fill([0,null]))
        setBoardArray(b)
    },[BoardRows,BoardColumns])

    const blockClickHandler = (x,y,Player) => {
        flag+=1
        if(Player){
            changeUser()
            playSound()
                if((x === 0 && y === 0) || (x === 0 && y === BoardColumns-1) || (y === 0 && x === BoardRows-1) || (x === BoardRows-1 && y === BoardColumns-1)){
                    return BoardArray[x][y][0] === 1 ? splitHandler(x,y,'corner') : incrementHandler(x,y)
                }else if(x === 0 || y === 0 || x === BoardRows-1 || y === BoardColumns-1){
                    return BoardArray[x][y][0] === 2 ? splitHandler(x,y,'side') : incrementHandler(x,y)
                }else{  
                    return BoardArray[x][y][0] === 3 ? splitHandler(x,y,'center') : incrementHandler(x,y)
                }
            }else{
                setTimeout(() => {
                    if((x === 0 && y === 0) || (x === 0 && y === BoardColumns-1) || (y === 0 && x === BoardRows-1) || (x === BoardRows-1 && y === BoardColumns-1)){
                        return BoardArray[x][y][0] === 1 ? splitHandler(x,y,'corner') : incrementHandler(x,y)
                    }else if(x === 0 || y === 0 || x === BoardRows-1 || y === BoardColumns-1){
                        return BoardArray[x][y][0] === 2 ? splitHandler(x,y,'side') : incrementHandler(x,y)
                    }else{  
                        return BoardArray[x][y][0] === 3 ? splitHandler(x,y,'center') : incrementHandler(x,y)
                    }
                }, 200);
            }
    }

    const playSound = () => {
        return soundStatus && soundStatus === 'on' ? sound.play() : null
    }

    const checkWinningStats = () => {
        if(flag >= 2){
            let reds = null
            let greens = null
            BoardArray.map(row => {
                return row.map(block => block[1] !== null ? block[1] === 'red' ? reds+=1 : block[1] === 'green' ? greens+=1 : null : null)
            })
            if((reds === null || greens === null) && letMeIn){
                letMeIn = false
                clickable = false
                document.getElementById('winBoard').style.display = 'block'
            }
        }
    }

    const changeUser = () => {
        Player === 'red' ? setPlayer('green') : setPlayer('red')
    }

    const soundButtonHandler = () => {
        localStorage.getItem('sound') === 'on' ? localStorage.setItem('sound','off') : localStorage.setItem('sound','on')
        setSoundStatus(localStorage.getItem('sound'))
    }

    const winBoard = () => {
        return (
            <div className='winBoard' id='winBoard'>
                <div style={{textAlign:'center'}}>
                <div style={{margin:'20px',opacity:'0.9'}}><span role='img' aria-label="celeb">🥳&nbsp;</span><span style={{color:`${Player  === 'red' ? 'green' : 'red'}`}}>Player {Player  === 'red' ? 'green' : 'red'} Won</span><span role='img' aria-label="celeb">&nbsp;🥳</span></div>
                <div className='replay' onClick={() => window.location.reload()}>R e p l a y <span role='img' aria-label="reload">🔃</span></div>
                <div onClick={() => soundButtonHandler()}>
                    {<span role='img' aria-label='sound'>{soundStatus && soundStatus === 'on' ? '🔊' : '🔇'}</span>}
                </div>
                </div>
            </div>
        )
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
                                onClick={((BoardArray[rowindex][colindex][1] === Player || BoardArray[rowindex][colindex][1] === null) && clickable) ? () => blockClickHandler(rowindex,colindex,Player) : null}
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
            {winBoard()}
        </div>
    )
}

export default Board
