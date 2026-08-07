import { useState, useEffect } from 'react'
import '../App.css'
import './panel.css'
import './SpreadsPanel.css'
import MiniSpread from '../components/MiniSpread'
import type { Spread} from '../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import Modal from '../components/Modal'
import InfoPage from '../components/InfoPage'

interface SpreadsPanelProps {
    setLoading: (loading: boolean) => void
    CardIcon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
    isMobile: () => boolean
}

function SpreadsPanel({ setLoading, CardIcon, isMobile }: SpreadsPanelProps) {
    const [spreads, setSpreads] = useState<Spread[]>([]);
    const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

    useEffect(() => {
        setLoading(true);
        fetch('/api/spreads')
        .then(res => res.json())
        .then(data => {
            setSpreads(data);
            setLoading(false);
        })
    }, []);

    return (
        <>
            <div className='panel'>
                <div className='panelTitle'>
                    <button className='infoBtn' onClick={()=>setShowInfoModal(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
                    <h2>Spreads</h2>
                    <span className='infoBtn' style={{backgroundColor: "transparent"}}></span>
                </div>
                <div className={isMobile() ? "outerDeckGrid" : "modalOuterCardsGrid"}>
                    {spreads.map((spread) => (
                        <MiniSpread spread={spread} CardIcon={CardIcon}></MiniSpread>
                    ))}
                </div>
            </div>
            <Modal title="Info" showModal={showInfoModal} setShowModal={setShowInfoModal}>
                <InfoPage infoMessages={[
                    `Welcome to the Spreads Page!`,
                    `These are the tarot spreads available on the Readings page. Each spread has a set number of pulls, with each pull tied to a specific concept. EX: a Past, Present, Future spread has 3 pulls, one for each.`,
                    `Click a spread to see more information on its full page.`,
                    `This is by no means an exhaustive list. There are plenty of other tarot spreads out there, these are just the most common ones I've found.`
                ]} />
            </Modal>
        </>
    )
}

export default SpreadsPanel