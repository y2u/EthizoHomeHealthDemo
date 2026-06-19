import { MetricCard, StatusLight } from './components/ui'
import type { ModuleName } from './domain/workflow'
import { useEthizoAppController } from './hooks/useEthizoAppController'
import { AdminModule } from './modules/AdminModule'
import { BillingModule } from './modules/BillingModule'
import { ClinicianModule } from './modules/ClinicianModule'
import { EpisodesModule } from './modules/EpisodesModule'
import { OverviewModule } from './modules/OverviewModule'
import { PatientsModule } from './modules/PatientsModule'
import { QaModule } from './modules/QaModule'
import { ReferralsModule } from './modules/ReferralsModule'

const MODULES = ['Overview', 'Patients', 'Referrals', 'Episodes', 'Clinician', 'Billing', 'QA', 'Admin'] as const
function App() {
  const controller = useEthizoAppController()
  const {
    user,
    mode,
    activeModule,
    setActiveModule,
    dataset,
    sidebarCollapsed,
    setSidebarCollapsed,
    isBrowserOnline,
    toastMessages,
    syncOfflineActions,
    selectedPatient,
    connectionLightTone,
    syncLightTone,
    connectionLightLabel,
    syncLightLabel,
    nameForPatient,
  } = controller

  return (
    <div className={sidebarCollapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}>
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toastMessages.map((toast) => (
          <div key={toast.id} className={`toast-message ${toast.tone}`}>
            {toast.text}
          </div>
        ))}
      </div>
      <aside className={sidebarCollapsed ? 'sidebar collapsed' : 'sidebar'}>
        <div className="sidebar-toggle-row">
          <button
            className="secondary-button sidebar-toggle-button"
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
            aria-label={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {sidebarCollapsed ? '>>' : '<<'}
          </button>
        </div>
        <div className="brand-card">
          {!sidebarCollapsed ? <p className="eyebrow">Ethizo Home Health Care</p> : null}
          <h1>{sidebarCollapsed ? 'Ethizo' : 'Ethizo Home Health Care'}</h1>
          {!sidebarCollapsed ? <p className="brand-support">Responsive home health operations</p> : null}
        </div>

        <div className="sidebar-utility-row">
          {!sidebarCollapsed ? <p className="sidebar-user-name">Signed in as {user?.full_name ?? 'Loading'}.</p> : null}
          <div className="sidebar-indicator-group">
            <StatusLight label="Connectivity" value={connectionLightLabel} tone={connectionLightTone} compact={sidebarCollapsed} />
            <StatusLight label="Sync" value={syncLightLabel} tone={syncLightTone} compact={sidebarCollapsed} />
            <button className="secondary-button sync-compact-button" type="button" onClick={() => void syncOfflineActions()} title="Sync offline actions">
              {sidebarCollapsed ? 'S' : 'Sync'}
            </button>
          </div>
        </div>

        <nav className="module-list">
          {MODULES.map((moduleName) => (
            <button
              key={moduleName}
              className={moduleName === activeModule ? 'module-button active' : 'module-button'}
              onClick={() => setActiveModule(moduleName)}
              title={moduleName}
              aria-label={moduleName}
            >
              <span className="module-button-content">
                <ModuleIcon moduleName={moduleName} />
                {!sidebarCollapsed ? <span className="module-button-label">{moduleName}</span> : null}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Ethizo responsive workspace</p>
            <h2>Ethizo Home Health Care keeps intake, clinical, QA, billing, and admin work aligned in one workspace</h2>
            <p className="hero-support">A responsive home health operations platform designed for office teams and field clinicians.</p>
          </div>
          <div className="hero-grid">
            <MetricCard label="Patients" value={dataset.metrics.patients} />
            <MetricCard label="Referrals" value={dataset.metrics.referrals} />
            <MetricCard label="Episodes" value={dataset.metrics.episodes} />
            <MetricCard label="Visits Today" value={dataset.metrics.visitsToday} />
            <MetricCard label="Open QA" value={dataset.metrics.qaTasks} />
            <MetricCard label="Claims on Hold" value={dataset.metrics.claimsOnHold} />
          </div>
        </section>

        {activeModule === 'Overview' && <OverviewModule controller={controller} />}

        {activeModule === 'Patients' && <PatientsModule controller={controller} />}

        {activeModule === 'Referrals' && <ReferralsModule controller={controller} />}

        {activeModule === 'Episodes' && <EpisodesModule controller={controller} />}

        {activeModule === 'Clinician' && <ClinicianModule controller={controller} />}

        {activeModule === 'Billing' && <BillingModule controller={controller} />}

        {activeModule === 'QA' && <QaModule controller={controller} />}

        {activeModule === 'Admin' && <AdminModule controller={controller} />}

        <footer className="footer-panel">
          <div>
            <strong>Selected patient</strong>
            <p className="muted">{selectedPatient ? `${nameForPatient(selectedPatient)} · ${selectedPatient.payer_type}` : 'No patient loaded'}</p>
          </div>
          <div>
            <strong>Workspace</strong>
            <p className="muted">{activeModule} · {mode === 'api' && isBrowserOnline ? 'Live API' : mode === 'api' ? 'Browser offline' : 'Demo mode'}</p>
          </div>
        </footer>
      </main>
    </div>
  )
}

function ModuleIcon({ moduleName }: { moduleName: ModuleName }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (moduleName) {
    case 'Overview':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="6" height="6" rx="1.5" {...common} />
          <rect x="14" y="4" width="6" height="10" rx="1.5" {...common} />
          <rect x="4" y="14" width="6" height="6" rx="1.5" {...common} />
          <rect x="14" y="16" width="6" height="4" rx="1.5" {...common} />
        </svg>
      )
    case 'Patients':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" {...common} />
          <path d="M5.5 19c1.8-3 4.1-4.5 6.5-4.5s4.7 1.5 6.5 4.5" {...common} />
        </svg>
      )
    case 'Referrals':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 5.5h12v13H6z" {...common} />
          <path d="M9 9h6M9 12h6M9 15h4" {...common} />
          <path d="M15 5.5v4h4" {...common} />
        </svg>
      )
    case 'Episodes':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v16" {...common} />
          <path d="M7 8h10" {...common} />
          <path d="M7 12h10" {...common} />
          <path d="M7 16h10" {...common} />
        </svg>
      )
    case 'Clinician':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14" {...common} />
          <path d="M8 9h8" {...common} />
          <path d="M9 19h6" {...common} />
          <path d="M9.5 5h5" {...common} />
        </svg>
      )
    case 'Billing':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6h12v12H6z" {...common} />
          <path d="M9 10.5c.7-.7 1.6-1 2.7-1 1.8 0 3.3.9 3.3 2.5 0 2.8-4.5 2-4.5 4.2 0 .3 0 .5.1.8" {...common} />
          <path d="M12 7.5v2M12 16.5v1" {...common} />
        </svg>
      )
    case 'QA':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 12.5l3 3 7-7" {...common} />
          <circle cx="12" cy="12" r="8" {...common} />
        </svg>
      )
    case 'Admin':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.5l1.7 2.1 2.7.5.5 2.7 2.1 1.7-2.1 1.7-.5 2.7-2.7.5-1.7 2.1-1.7-2.1-2.7-.5-.5-2.7-2.1-1.7 2.1-1.7.5-2.7 2.7-.5z" {...common} />
          <circle cx="12" cy="12" r="2.5" {...common} />
        </svg>
      )
  }
}

export default App
