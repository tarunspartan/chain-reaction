import React, { useEffect, useState } from 'react'
import './Board.css'
import drop from './drop.mp3'
let clickable = true
let flag = 0
// const sound = new Audio(drop)
// sound.playbackRate = 1.75s

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
        setBoardRows(~~((window.innerHeight-40)/50))
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
                clickable = false   
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
        return soundStatus && soundStatus === 'on' ? new Audio(drop).play() : null
    }

    const checkWinningStats = () => {
        if((flag >= 2)  && letMeIn){
            clickable = false
            let reds = null
            let greens = null
            BoardArray.map(row => {
                return row.map(block => block[1] !== null ? block[1] === 'red' ? reds+=1 : block[1] === 'green' ? greens+=1 : null : null)
            })
            if((reds === null || greens === null)){
                letMeIn = false
                clickable = false
                document.getElementById('winBoard').style.display = 'block'
            }else{
                clickable = true
            }
        }
    }

    const changeUser = () => {
        Player === 'red' ? setPlayer('green') : setPlayer('red')
    }

    const soundButtonHandler = () => {
        if(soundStatus === 'off'){
            new Audio(drop).play()
        }
        localStorage.getItem('sound') === 'on' ? localStorage.setItem('sound','off') : localStorage.setItem('sound','on')
        setSoundStatus(localStorage.getItem('sound'))
    }

    const winBoard = () => {
        return (
            <div className='winBoard' id='winBoard'>
                <div style={{textAlign:'center'}}>
                <div style={{margin:'20px',opacity:'0.9'}}><span role='img' aria-label="celeb">&#x1F60E;&nbsp;</span><span style={{color:`${Player  === 'red' ? 'green' : 'red'}`}}>Player {Player  === 'red' ? 'green' : 'red'} Won</span><span role='img' aria-label="celeb">&nbsp;&#x1F60E;</span></div>
                
                <div className='replay' onClick={() => window.location.reload()}>R e p l a y&nbsp;<span role='img' aria-label="reload">&#x1F504;</span></div>
                </div>
            </div>
        )
    }

    const settings = () => {
        return (
            <div className='settings' id='settings'>
                <div style={{textAlign:'center'}}>
                <div style={{margin:'5px',opacity:'0.8'}}><span style={{color:'black',textShadow:'1px 1px 0px grey'}}>Settings</span></div>
                <div>
                    {<span onClick={() => soundButtonHandler()} role='img' aria-label='sound'>{soundStatus && soundStatus === 'on' ? '🔊' : '🔇'}</span>}
                </div>
                <div className='restart' onClick={() => window.location.reload()}>R e s t a r t</div>
                <div id="devLine">Designed & Built with <span role='img' aria-label="love">💙</span> by TARUN</div>
                {navigator.share && <span className='share' onClick={() => share()}>SHARE</span>}
                </div>
            </div>
        )
    }

    const share = () => {
        if (navigator.share) {
            navigator.share({
              title: 'Chain Reaction',
              text: 'Check out this new Fun 2-Player Game called Chain Reaction 😮',
              url: 'https://tarunspartan.github.io/chain-reaction',
            })
              .then(() => console.log('Successful share'))
              .catch((error) => console.log('Error sharing', error));
          }
    }

    const settingsHandler = () => {
        return document.getElementById('settings').style.display === 'block' ? document.getElementById('settings').style.display = 'none' : document.getElementById('settings').style.display = 'block'
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
        clickable = false
        BoardArray[x][y][0] = 0
        BoardArray[x][y][1] = null
        setBoardArray([...BoardArray])
    }

    const splitHandler = (x,y,position) => {
        clickable = false
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
        <div style={{marginTop:'10px'}}>
            <div style={{display:'flex',alignItems:'center'}}>
            <div id="footer">C H A I N <span id="dot">•</span> R E A C T I <span id="face"><span id="one"></span><span id="two"></span><span id="three"></span></span> N</div>
            <div id="settingsIcon" onClick={() => settingsHandler()}>&#x2699;</div>
        </div>
        </div>
        </div>  
            {winBoard()}
            {settings()}
        </div>
    )
}

export default Board
