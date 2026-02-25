import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleUp } from '@fortawesome/free-solid-svg-icons';

interface ScrollTopButtonProps {
    scrollToTop: () => void
}

function ScrollTopButton({ scrollToTop }: ScrollTopButtonProps) {
  return (
    <button
        className="scrollTopBtn"
        onClick={scrollToTop}
        aria-label="Scroll to top"
    >
        <FontAwesomeIcon icon={faAngleUp}></FontAwesomeIcon>
    </button>
  )
}

export default ScrollTopButton