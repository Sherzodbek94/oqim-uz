import { Routes, Route } from 'react-router'
import Layout from '@/components/Layout'
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
      {/* Game page stands alone — it has its own top bar (design.md §9.1) */}
      <Route path="/game" element={<Game />} />
      {/* v19: Onlayn multiplayer — alohida sahifa, lokal o'yinga ta'sir qilmaydi */}
      <Route path="/onlayn" element={<Online />} />
    </Routes>
  )
}
