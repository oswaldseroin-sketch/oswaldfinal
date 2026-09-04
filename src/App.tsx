import { useEffect, useRef, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import LoginScreen from './components/LoginScreen'
import HomeTab from './tabs/HomeTab'
import ApplicationsTab from './tabs/ApplicationsTab'
import PredictionsTab from './tabs/PredictionsTab'
import ArticlesTab from './tabs/ArticlesTab'
import SecretTab from './tabs/SecretTab'
import FludilkaTab from './tabs/FludilkaTab'
import TestsTab from './tabs/TestsTab'
import TestsPanelTab from './tabs/TestsPanelTab'
import AdminPanel from './components/AdminPanel'
import NumbersPanel from './components/NumbersPanel'
import MiniGamesPanel from './components/MiniGamesPanel'
import SwipeBack from './components/SwipeBack'

type Tab = 'applications' | 'predictions' | 'articles' | 'secret' | 'fludilka' | 'tests' | 'testsPanel' | 'adminPanel' | 'numbers' | 'newSection'

function Shell() {
  const { currentUser } = useApp()
  const [tab, setTab] = useState<Tab | 'home'>('home')
  const homeScrollY = useRef(0)

  const goHome = () => {
    setTab('home')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, homeScrollY.current)
      })
    })
  }

  const openTab = (next: Tab) => {
    homeScrollY.current = window.scrollY
    setTab(next)
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
    })
  }

  return (
    <div className="relative min-h-screen w-full bg-transparent text-ink overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="animate-fog1 absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.12), transparent 70%)' }}
        />
        <div
          className="animate-fog2 absolute -bottom-40 -right-32 h-[32rem] w-[32rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255,43,214,0.10), transparent 70%)' }}
        />
        <div
          className="animate-fog3 absolute left-1/2 top-1/3 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(120,80,255,0.08), transparent 70%)' }}
        />
        <div className="dot-grid absolute inset-0" />
      </div>
      {!currentUser ? (
        <LoginScreen />
      ) : (
      <main className="relative z-10 min-h-screen">
        {tab === 'home' && <HomeTab onNavigate={openTab} />}
        {tab === 'applications' && (
          <SwipeBack onBack={goHome} innerClassName="mx-auto max-w-md px-6 pb-10 pt-10">
            <ApplicationsTab onBack={goHome} />
          </SwipeBack>
        )}
        {tab === 'predictions' && (
          <SwipeBack onBack={goHome} innerClassName="mx-auto max-w-md px-6 pb-10 pt-10">
            <PredictionsTab onBack={goHome} />
          </SwipeBack>
        )}
        {tab === 'articles' && (
          <SwipeBack onBack={goHome} innerClassName="mx-auto max-w-md px-6 pb-10 pt-10">
            <ArticlesTab onBack={goHome} />
          </SwipeBack>
        )}
        {tab === 'secret' && (
          <SwipeBack onBack={goHome} innerClassName="mx-auto min-h-screen max-w-md px-4 pb-32 pt-6 overflow-y-auto">
            <SecretTab onBack={goHome} />
          </SwipeBack>
        )}
        {tab === 'fludilka' && (
          <SwipeBack onBack={goHome} innerClassName="mx-auto max-w-md px-4 pb-4 pt-10">
            <FludilkaTab onBack={goHome} />
          </SwipeBack>
        )}
        {tab === 'tests' && (
          <TestsTab
            onOpenApplications={() => openTab('applications')}
            onOpenArticles={() => openTab('articles')}
            onOpenTests={() => openTab('testsPanel')}
            onOpenAdmin={() => openTab('adminPanel')}
            onOpenNumbers={() => openTab('numbers')}
            onBack={goHome}
          />
        )}
        {tab === 'testsPanel' && (
          <TestsPanelTab onBack={() => openTab('tests')} />
        )}
        {tab === 'adminPanel' && (
          <AdminPanel onBack={() => openTab('tests')} />
        )}
        {tab === 'numbers' && (
          <SwipeBack onBack={() => openTab('tests')} innerClassName="mx-auto max-w-md px-4 pb-10 pt-6">
            <NumbersPanel onBack={() => openTab('tests')} />
          </SwipeBack>
        )}
        {tab === 'newSection' && (
          <SwipeBack onBack={goHome} innerClassName="mx-auto max-w-md px-4 pb-10 pt-6">
          <div>TEST</div>
          </SwipeBack>
        )}
      </main>
      )}
    </div>
  )
}

export default function App() {
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = document.getElementById('splash-screen')
      if (el) {
        el.style.transition = 'opacity 0.6s ease-out'
        el.style.opacity = '0'
        setTimeout(() => el.remove(), 700)
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

return (
  <AppProvider>
    <Shell />
  </AppProvider>
)
}
