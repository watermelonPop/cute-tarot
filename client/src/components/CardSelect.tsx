import './InfoPage.css'
import '../panels/RelationsPanel.css'
import Sparkles from '../components/Sparkles'
import type { Card, Deck } from '../types'
import SparkleCheckbox from './SparkleCheckbox'

interface CardSelectProps {
    isAnimating?: boolean
    onSelect: () => void
    Icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
    selectedCard?: Card | null
    selectedDeck: Deck
    reversals: boolean
    reversalValue?: boolean
    setReversalValue?: () => void
    allowSetReversals: boolean
}

export default function CardSelect({ isAnimating, onSelect, Icon, selectedCard, selectedDeck, reversals, reversalValue, setReversalValue, allowSetReversals }: CardSelectProps) {

    return (
        <>
        <div className="cardImgInnerBorder">
            <div className="cardImageAspectWrapper">
                <div className="cardEffectLayer">
                    {isAnimating && <Sparkles />}
                    {selectedCard == null ? (
                        <div className="cardBackOverlayWrapper">
                            <div className="innerCardImg cardAspect" onClick={onSelect}></div>
                            <div className="cardBackTextWrapper">
                                <Icon className="cardBackLogo"/>
                                <div className="cardBackText">
                                    Click to select card
                                </div>
                            </div>
                        </div>
                    ):(
                        <img
                            src={`${selectedDeck?.images['card-front']}/${selectedCard?.type.replaceAll(" ", "")}/${selectedCard?.nameShort}.png`}
                            className={reversalValue ? "innerCardImg upside-down" : "innerCardImg"}
                            alt={`Deck card ${selectedCard?.name}`}
                            onClick={onSelect}
                        />
                    )}
                </div>
            </div>
            {
                reversals === true && reversalValue !== undefined && setReversalValue !== undefined && (
                    <div className='reversedInput'>
                        {allowSetReversals === true ? (
                            <>
                            <SparkleCheckbox checked={reversalValue} onChange={setReversalValue} unCheckedStyle={{backgroundColor: "var(--accent-background)", borderColor: "var(--accent-text)"}} checkedStyle={{backgroundColor: "var(--secondary-background)", borderColor: "var(--secondary-text)", color: "var(--main-background)"}}/>
                            <label htmlFor="reversedCardCheckbox">Reversed</label>
                            </>
                        ) : selectedCard !== null && (
                            <>
                            <label htmlFor="reversedCardCheckbox">{!reversalValue ? "Upright" : "Reversed"}</label>
                            </>
                        )}
                    </div>
                )
            }
        </div>
        </>
    )
}