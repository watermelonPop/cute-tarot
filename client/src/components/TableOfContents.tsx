import './TableOfContents.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'

export interface TocItem {
  label: string
  targetId: string
  children?: TocItem[]
}

interface TableOfContentsProps {
  title?: string
  items: TocItem[]
}

function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (el !== null) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function TocEntry({ item, depth }: { item: TocItem; depth: number }) {
  return (
    <>
      <li
        className={`tocLevel${depth}`}
        onClick={() => scrollToId(item.targetId)}
      >
        <FontAwesomeIcon icon={faChevronRight} className="tocChevron" />
        <span className="tocLabel">{item.label}</span>
      </li>
      {item.children && item.children.length > 0 && (
        <ul>
          {item.children.map((child, i) => (
            <TocEntry key={`${child.targetId}-${i}`} item={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </>
  )
}

export default function TableOfContents({ title = 'Table of Contents', items }: TableOfContentsProps) {
  return (
    <div className='tableOfContentsOuter'>
        <div className='tableTitleWrapper'>
            <h3 className='tableContentsTitle'>{title}</h3>
        </div>
        <div className='tableWrapper'>
            <ul className='tableOfContents'>
                {items.map((item, i) => (
                <TocEntry key={`${item.targetId}-${i}`} item={item} depth={0} />
                ))}
            </ul>
        </div>
    </div>
  )
}