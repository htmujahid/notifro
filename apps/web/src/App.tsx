import { Suspense } from "react"
import { createBrowserRouter, RouterProvider } from "react-router"
import { routes } from "@workspace/views/routes/web"

const router = createBrowserRouter(routes)

export function App() {
  return (
    <Suspense fallback={null}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
