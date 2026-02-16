import type { User, Deck, Spread } from '../types'
import { useNavigate } from 'react-router-dom'
import RiderWaiteIcon from '../assets/images/Rider-Waite/card-icon.svg?react'
import BunnyWaiteIcon from '../assets/images/Bunny-Waite/card-icon.svg?react'

interface MiniSpreadProps {
    user: User | null
    selectedDeck: Deck | null
    spread: Spread
}

function MiniSpread({ selectedDeck, spread }: MiniSpreadProps) {
    const navigate = useNavigate();
    const SpreadIcon =
      selectedDeck?.name?.replace(/[–—]/g, "-") === "Bunny-Waite"
        ? BunnyWaiteIcon
        : RiderWaiteIcon;

  return (
    <>
    <div
        className="spreadOuter"
        onClick={() => {
            navigate(`/spreads/${spread.id}`)
        }}
        >
        <div className='spreadImgOuter'>
            {Array.from({ length: spread.numPulls }).map((_) => (
                <div className='spreadImgBorder'>
                    <SpreadIcon className="spreadImg"/>
                </div>
            ))}
        </div>
        <h3 className="spreadTitle">{spread.name}</h3>
        <p className='spreadDesc'>{spread.description}</p>
      </div>
    </>
  )
}

export default MiniSpread
