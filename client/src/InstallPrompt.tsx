import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';
import "./InstallPrompt.css";

interface InstallPromptProps {
  setShowInstallPrompt: (show: boolean) => void
}

export default function InstallPrompt({ setShowInstallPrompt }: InstallPromptProps) {
  
  return (
    <div className="install-overlay">
      <div className="install-modal">
        <h2>Install Cute Tarot</h2>

        <ol>
          <li>Tap the <strong>Share</strong> button</li>
          <li>Scroll down</li>
          <li>Tap <strong>"Add to Home Screen"</strong></li>
        </ol>

        <div className="share-icon"><FontAwesomeIcon icon={faArrowUp}></FontAwesomeIcon></div>

        <button
          /*className="install-close"*/
          className="goOnBtn"
          onClick={()=>setShowInstallPrompt(false)}
        >
          Got it
        </button>
      </div>
    </div>
  );
}