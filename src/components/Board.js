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
        let rows = ~~(window.innerHeight/50)
        setBoardRows(rows)
        let a = new Array(rows).fill(0)
        let b = a.map(i => a[i] = new Array(columns).fill([0,'red']))
        setBoardArray(b)
    },[])

    const blockClickHandler = (x,y,Player) => {
        setTimeout(() => {
            if(Player)
            changeUser()
            // console.log(x,y)
            // console.log('BoardRows',BoardRows-1)
            // console.log('BoardColumns',BoardColumns-1)
            if((x === 0 && y === 0) || (x === 0 && y === BoardColumns-1) || (y === 0 && x === BoardRows-1) || (x === BoardRows-1 && y === BoardColumns-1)){
                // console.log('Corner')
                return BoardArray[x][y][0] === 1 ? splitHandler(x,y,'corner') : incrementHandler(x,y)
            }else if(x === 0 || y === 0 || x === BoardRows-1 || y === BoardColumns-1){
                // console.log('Side')
                return BoardArray[x][y][0] === 2 ? splitHandler(x,y,'side') : incrementHandler(x,y)
            }else{  
                // console.log('Center')
                return BoardArray[x][y][0] === 3 ? splitHandler(x,y,'center') : incrementHandler(x,y)
            }
        }, 100); 
    }

    const changeUser = () => {
        Player === 'red' ? setPlayer('green') : setPlayer('red')
    }

    const incrementHandler = (x,y) => {
        // console.log('Increment Handler')
        let items = [...BoardArray]
        let item = [...items[x][y]]
        item[0] += 1
        items[x][y] = item
        setBoardArray(items)
    }

    const setToZeroHandler = (x,y) => {
        BoardArray[x][y][0] = 0
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
                            <div className='block' 
                            // style={Player === 'red' ? {border:'1px solid red'} : {border:'1px solid green'}}
                                style={{border:`1px solid ${Player}`}}
                                onClick={() => blockClickHandler(rowindex,colindex,Player)}>
                                <div className={BoardArray[rowindex][colindex][0] === 1 ? 
                                                    'one common' : 
                                                BoardArray[rowindex][colindex][0] === 2 ? 
                                                    'two common' : BoardArray[rowindex][colindex][0] === 3 ?
                                                    'three common' : 'empty'}>

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
