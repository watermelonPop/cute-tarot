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
}

function SpreadsPanel({ setLoading, CardIcon }: SpreadsPanelProps) {
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
                <div className='outerDeckGrid'>
                    {spreads.map((spread) => (
                        <MiniSpread spread={spread} CardIcon={CardIcon}></MiniSpread>
                    ))}
                </div>
            </div>
            <Modal title="Info" showModal={showInfoModal} setShowModal={setShowInfoModal}>
                <InfoPage infoMessages={[
                    `Welcome to the Spreads Page! `,
                    `These are the tarot reading spreads available in the readings page. Each spread has a number of pulls, and a concept that aligns with each pull. Ex: For the Past, Present, Future spread, there are 3 pulls, one representing past, another representing present, and the last representing future.`,
                    `Click on a spread to see more information in the larger Spread page.`,
                    `This is by no means an exhaustive list, there are plenty of other tarot spreads out there! These are just the easiest and most common ones I've found. `
                ]} />
            </Modal>
        </>
    )
}

export default SpreadsPanel