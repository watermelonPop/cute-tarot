import type { User, Deck, Spread } from '../types'
import { useNavigate } from 'react-router-dom'

interface MiniSpreadProps {
    user: User | null
    selectedDeck: Deck | null
    spread: Spread
    CardIcon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
}

function MiniSpread({ selectedDeck, spread, CardIcon }: MiniSpreadProps) {
    const navigate = useNavigate();

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
                    <CardIcon className="spreadImg"/>
                </div>
            ))}
        </div>
        <h2 className="spreadTitle"><span className="spreadTitleClamp">{spread.name}</span></h2>
        <p className='spreadDesc'>{spread.description}</p>
      </div>
    </>
  )
}

export default MiniSpread
