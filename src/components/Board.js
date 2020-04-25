import React, { useEffect, useState } from 'react'
import './Board.css'
import drop from './drop.mp3'
import one from './1f-min.jpg'
import two from './2f-min.jpg'
import three from './3f-min.jpg'
import four from './4f-min.jpg'
import five from './5f-min.jpg'
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
                <div className='restart' onClick={() => window.location.reload()} style={{cursor:'pointer'}}>R e s t a r t</div>
                <div className='restart' onClick={() => openTutorial()} style={{cursor:'pointer'}}>T u t o r i a l</div>
                <div id="devLine">Designed & Built with <span role='img' aria-label="love">💙</span> by @tarunspartan</div>
                {navigator.share && <span className='share' onClick={() => share()}>SHARE</span>}
                </div>
            </div>
        )
    }

    const tutorial = () => {
        return (
            <div id="tutorial">
                <div style={{textAlign:'center'}}>
                    <div id="tuturialHeader">Tutorial</div>
                    <br />
                    <span>Chain Reaction is a 2-player Game.&nbsp;Player Red and Green.&nbsp;Player's need to eliminate each other.</span>
                    <br/>
                    <hr/>
                    Corner blocks holds only one ball.&nbsp;Adding another ball splits into sides.
                    <center><img id="tutImage" src={one} alt="image"/></center>
                    <br/>
                    <hr/>
                    Blocks which are sticks to walls can hold upto two balls but,&nbsp;third one makes it splits it into three sides.
                    <center><img id="tutImage" src={two} alt="image"/></center>
                    <br/>
                    <hr/>
                    Remaining center blocks can hold upto three balls and splits into all four sides by adding one more.
                    <center><img id="tutImage" src={three} alt="image"/></center>
                    <br/>
                    <hr/>
                    Here comes the fun,&nbsp;Player can eliminate opponent player balls by adding more balls to their block,&nbsp;makes it split and consume their balls.
                    <center><img id="tutImage" src={four} alt="image"/></center>
                    ⬇ ⬇ ⬇
                    <center><img id="tutImage" src={five} alt="image"/></center>
                    <br/>
                    <hr/>
                    <div style={{textAlign:"left",paddingLeft:'5px'}}>
                    <div>▶The color of Grid shows which player turn it is.</div>
                    <div>▶Player's can't add balls to blocks which are already consumed by opponent.</div>
                    <div>▶Whoever first eliminates other player all balls wins(<span id="booyah">BOOYAH!</span>).</div>
                    </div>
                    <div id="divButtons">
                        <button id="tutButtons" onClick={() => closeTutorial()}>This was helpful 👍🏼</button>
                        {/* {localStorage.getItem('tutorial') === 'on' && <button id="tutButtons" onClick={() => closeTutorialonLS()}>I know how to play, just skip 😏</button>} */}
                    </div>
                </div>
            </div>
        )
    }

    const openTutorial = () => {
        document.getElementById('tutorial').style.display = 'block'
    }

    const closeTutorial = () => {
        document.getElementById('tutorial').style.display = 'none'
        document.getElementById('settings').style.display = 'none'
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
            <div id="footer">C H A I N <span id="dot">•</span> R E A C T I <span id="face"><div id="one"></div><div id="two"></div><span id="three"></span></span> N</div>
            <div id="settingsIcon" onClick={() => settingsHandler()}>&#x2699;</div>
        </div>
        </div>
        </div>  
            {winBoard()}
            {settings()}
            {tutorial()}
        </div>
    )
}

export default Board
