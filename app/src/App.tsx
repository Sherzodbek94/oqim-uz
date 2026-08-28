import { Routes, Route } from 'react-router'
import Layout from '@/components/Layout'
import AuthGuard from '@/components/AuthGuard'
import Home from '@/pages/Home'
import Game from '@/pages/Game'
import Rules from '@/pages/Rules'
import Profile from '@/pages/Profile'
import Online from '@/pages/Online'

export default function App() {
  return (
    <Routes>
      {/* Content pages share Navbar + Footer via Layout (nested-route pattern) */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="rules" element={<Rules />} />
        <Route path="profil" element={<Profile />} />
      </Route>
      {/* Game pages require authentication */}
      <Route path="/game" element={<AuthGuard><Game /></AuthGuard>} />
      <Route path="/onlayn" element={<AuthGuard><Online /></AuthGuard>} />
    </Routes>
  )
}
