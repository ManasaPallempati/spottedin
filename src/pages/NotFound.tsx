import { Link } from 'react-router-dom'
import './notfound.css'

export default function NotFound() {
  return (
    <div className="notfound-page">
      <p className="notfound-code" aria-hidden="true">
        404
      </p>
      <h1 className="notfound-title">Page not found</h1>
      <p className="notfound-copy">
        We couldn&apos;t spot that page. It may have moved or never existed.
      </p>
      <div className="notfound-actions">
        <Link to="/home" className="btn btn-primary">
          Back to home
        </Link>
        <Link to="/search" className="btn btn-outline">
          Search
        </Link>
      </div>
    </div>
  )
}
