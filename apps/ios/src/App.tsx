import { Suspense } from "react"
import { createHashRouter, RouterProvider } from "react-router"
import { routes } from "@workspace/views/routes/ios"

const router = createHashRouter(routes)

export function App() {
  return (
    <Suspense fallback={null}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
