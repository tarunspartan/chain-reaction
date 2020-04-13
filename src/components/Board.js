import React, { useEffect, useState } from 'react'
import './Board.css'

const Board = () => {

    const [ BoardArray, setBoardArray ] = useState([])
    const [ BoardColumns, setBoardColumns ] = useState('')
    const [ BoardRows, setBoardRows ] = useState('')
    const [ Player, setPlayer ] = useState('red')

    useEffect(() => {
        start()
    },[])

    const start = () => {
        let columns = ~~(window.innerWidth/50)
        setBoardColumns(columns)
        let rows = ~~(window.innerHeight/50)
        setBoardRows(rows)
        let a = new Array(rows).fill(0)
        let b = a.map(i => a[i] = new Array(columns).fill(0))
        setBoardArray(b)
    }

    const blockClickHandler = (x,y,d) => {
        if(d === 'user'){
            changeUser()
        }
        // console.log(x,y)
        // console.log('BoardRows',BoardRows-1)
        // console.log('BoardColumns',BoardColumns-1)
        if((x === 0 && y === 0) || (x === 0 && y === BoardColumns-1) || (y === 0 && x === BoardRows-1) || (x === BoardRows-1 && y === BoardColumns-1)){
            // console.log('Corner')
            return BoardArray[x][y] === 1 ? splitHandler(x,y,'corner') : incrementHandler(x,y)
        }else if(x === 0 || y === 0 || x === BoardRows-1 || y === BoardColumns-1){
            // console.log('Side')
            return BoardArray[x][y] === 2 ? splitHandler(x,y,'side') : incrementHandler(x,y)
        }else{  
            // console.log('Center')
            return BoardArray[x][y] === 3 ? splitHandler(x,y,'center') : incrementHandler(x,y)
        }
    }

    const changeUser = () => {
        Player === 'red' ? setPlayer('green') : setPlayer('red')
    }

    const incrementHandler = (x,y) => {
        // console.log('Increment Handler')
        BoardArray[x][y] += 1
        setBoardArray([...BoardArray])
    }

    const setToZeroHandler = (x,y) => {
        BoardArray[x][y] = 0
        setBoardArray([...BoardArray])
    }

    const splitHandler = (x,y,position) => {
        // console.log('Split Handler')
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
                            <div className='block' style={Player === 'red' ? {border:'1px solid red'} : {border:'1px solid green'}}
                                onClick={() => blockClickHandler(rowindex,colindex,'user')}>
                                <div className={BoardArray[rowindex][colindex] === 1 ? 'one common' : BoardArray[rowindex][colindex] === 2 ? 'two common' : BoardArray[rowindex][colindex] === 3 ? 'three common' : 'empty'}>

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
