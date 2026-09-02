import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Game from '@/pages/Game'
import ErrorBoundary from '@/components/ErrorBoundary'

const Rules = lazy(() => import('@/pages/Rules'))
const Profile = lazy(() => import('@/pages/Profile'))
const Leaderboard = lazy(() => import('@/pages/Leaderboard'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const Online = lazy(() => import('@/pages/Online'))

function PageLoader() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Content pages share Navbar + Footer via Layout (nested-route pattern) */}
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="rules" element={<Rules />} />
            <Route path="profil" element={<Profile />} />
            <Route path="reyting" element={<Leaderboard />} />
          </Route>
          {/* Game page stands alone — it has its own top bar (design.md §9.1) */}
          <Route path="/game" element={<Game />} />
          {/* v19: Onlayn multiplayer — alohida sahifa, lokal o'yinga ta'sir qilmaydi */}
          <Route path="/onlayn" element={<Online />} />
          {/* Noto'g'ri marshrutlar */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
