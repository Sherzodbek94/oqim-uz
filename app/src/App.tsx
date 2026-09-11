import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import ErrorBoundary from '@/components/ErrorBoundary'

const Layout = lazy(() => import('@/components/Layout'))
const Home = lazy(() => import('@/pages/Home'))

const Rules = lazy(() => import('@/pages/Rules'))
const Profile = lazy(() => import('@/pages/Profile'))
const AccountHelp = lazy(() => import('@/pages/AccountHelp'))
const Leaderboard = lazy(() => import('@/pages/Leaderboard'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const Online = lazy(() => import('@/pages/Online'))
const Game = lazy(() => import('@/pages/Game'))
const Startup = lazy(() => import('@/pages/Startup'))

function PageLoader() {
  return (
    <div role="status" className="flex min-h-[50dvh] flex-col items-center justify-center gap-3">
      <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      <p>Sahifa yuklanmoqda…</p>
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
            <Route path="hisob" element={<AccountHelp />} />
            <Route path="reyting" element={<Leaderboard />} />
          </Route>
          {/* Game page stands alone — it has its own top bar (design.md §9.1) */}
          <Route path="/game" element={<Game />} />
          {/* v19: Onlayn multiplayer — alohida sahifa, lokal o'yinga ta'sir qilmaydi */}
          <Route path="/onlayn" element={<Online />} />
          {/* Startap Imperiyasi — tycoon rejimi, o'z HUD va tab-bari bilan (GDD v1.0) */}
          <Route path="/startap" element={<Startup />} />
          {/* Noto'g'ri marshrutlar */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
