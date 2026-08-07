import '../components/MiniDeck.css'
import type { Spread } from '../types'
import SpreadTile from './SpreadTile'

interface SelectSpreadPageProps {
    showModal: boolean
    spreads: Spread[]
    setSpread: (spread: Spread) => void
    selectedSpread: Spread | null
    CardIcon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
}

export default function SelectSpreadPage({ showModal, spreads, setSpread, selectedSpread, CardIcon }: SelectSpreadPageProps) {
    if (!showModal) return null

    return (
        <div className='modalOuterCards'>
            <div className='outerCardSuit'>
                <div className="outerDeckGrid">
                    {spreads.map((spread) => (
                        <SpreadTile
                            key={spread.id}
                            spread={spread}
                            CardIcon={CardIcon}
                            isSelected={selectedSpread?.id === spread.id}
                            onSelect={() => setSpread(spread)}
                            showDescription={false}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
