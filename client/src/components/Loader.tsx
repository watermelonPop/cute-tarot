import { useEffect } from 'react'
import './Loader.css'

interface LoaderProps {
    setLoading: (loading: boolean) => void
}

export default function Loader({ setLoading }: LoaderProps) {

  return (
    <div className='loaderBackground'>
      <div className="starLoader">
        {[0, 1, 2, 3, 4, 5].map((i) => (
            <svg
            key={i}
            viewBox="0 0 96 96"
            className="loaderStar"
            style={{ '--i': i } as React.CSSProperties}
            >
            <path
                d="M93.781 51.578C95 50.969 96 49.359 96 48c0-1.375-1-2.969-2.219-3.578
                0 0-22.868-1.514-31.781-10.422-8.915-8.91-10.438-31.781-10.438-31.781
                C50.969 1 49.375 0 48 0s-2.969 1-3.594 2.219
                c0 0-1.5 22.87-10.406 31.781-8.908 8.913-31.781 10.422-31.781 10.422
                C1 45.031 0 46.625 0 48c0 1.359 1 2.969 2.219 3.578
                0 0 22.873 1.51 31.781 10.422 8.906 8.911 10.406 31.781 10.406 31.781
                C45.031 95 46.625 96 48 96s2.969-1 3.562-2.219
                c0 0 1.523-22.871 10.438-31.781 8.913-8.908 31.781-10.422 31.781-10.422Z"
                fill="currentColor"
            />
            </svg>
        ))}
        </div>
    </div>
  )
}
