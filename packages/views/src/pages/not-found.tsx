import { Link } from "react-router"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">Page not found.</p>
        <Link to="/" className="text-sm underline underline-offset-4">
          Go home
        </Link>
      </div>
    </div>
  )
}
