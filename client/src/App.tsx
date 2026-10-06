import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Link2 } from 'lucide-react'
import HomePage from './pages/HomePage'
import UrlDetailPage from './pages/UrlDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: { borderRadius: '12px', fontSize: '14px' },
        }}
      />

      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 font-semibold text-gray-800">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Link2 className="w-4 h-4 text-white" />
            </div>
            Shrtnr
          </NavLink>
          <nav className="flex items-center gap-4 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-800 transition'
              }
            >
              My URLs
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="min-h-[calc(100vh-3.5rem)] bg-gray-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/urls/:idOrCode" element={<UrlDetailPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
