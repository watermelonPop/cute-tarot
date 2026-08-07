import type { Spread } from '../types'
import { useNavigate } from 'react-router-dom'
import SpreadTile from './SpreadTile'

interface MiniSpreadProps {
    spread: Spread
    CardIcon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
}

function MiniSpread({ spread, CardIcon }: MiniSpreadProps) {
    const navigate = useNavigate();

    return (
        <SpreadTile
            spread={spread}
            CardIcon={CardIcon}
            onClick={() => navigate(`/spreads/${spread.id}`)}
        />
    )
}

export default MiniSpread
