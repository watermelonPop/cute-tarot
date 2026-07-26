import './InfoPage.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

interface InfoCardProps {
    infoText?: string
}

export function InfoCard({ infoText }: InfoCardProps) {
    return (
        <div className="infoModalPt">
            <div className="infoModalIcon">
                <FontAwesomeIcon
                    icon={faCircleInfo}
                />
            </div>
            <p className="infoModalText">
                {infoText}
            </p>
        </div>
    );
}


interface InfoPageProps {
    infoMessages: string[]
}

export default function InfoPage({ infoMessages }: InfoPageProps) {
    return (
        <div className='infoModals'>
            {infoMessages.map((msg, index) => (
                <InfoCard key={index} infoText={msg} />
            ))}
        </div>
    )
}