import { useState, useEffect } from 'react'
import { useAuthStore } from './stores/useAuthStore'
import { PinEntry } from './components/shared/PinEntry'
import { OrderScreen } from './screens/OrderScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { AdminMenuScreen } from './screens/AdminMenuScreen'
import { AdminSettingsScreen } from './screens/AdminSettingsScreen'
import { TablesScreen } from './screens/TablesScreen'
import { LiveOrdersScreen } from './screens/LiveOrdersScreen'
import { ManageOrdersScreen } from './screens/ManageOrdersScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { useOrderStore } from './stores/useOrderStore'

import { useNotificationStore } from './stores/useNotificationStore'
import { NotificationPanel } from './components/shared/NotificationPanel'

type Route = 'dashboard' | 'tables' | 'order' | 'live-orders' | 'manage-orders' | 'history' | 'admin/menu' | 'admin/settings'

export default function App() {
  const { isAuthenticated, logout, cashier } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [clock, setClock] = useState(() => {
    const now = new Date()
    return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  })

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setClock(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const globalShortcuts = [
    { label: 'Sales Reports', route: 'dashboard' as Route, icon: 'monitoring', roles: ['admin'] },
    { label: 'Tables', route: 'tables' as Route, icon: 'grid_view', roles: ['admin', 'cashier', 'server'] },
    { label: 'New Order', route: 'order' as Route, icon: 'add_shopping_cart', roles: ['admin', 'cashier', 'server'] },
    { label: 'Kitchen Screen', route: 'live-orders' as Route, icon: 'restaurant', roles: ['admin', 'cashier', 'server', 'kitchen'] },
    { label: 'Active Orders', route: 'manage-orders' as Route, icon: 'assignment', roles: ['admin', 'cashier', 'server'] },
    { label: 'Past Bills', route: 'history' as Route, icon: 'history', roles: ['admin', 'cashier'] },
    { label: 'Edit Menu', route: 'admin/menu' as Route, icon: 'edit_note', roles: ['admin', 'cashier'] },
    { label: 'Settings', route: 'admin/settings' as Route, icon: 'badge', roles: ['admin'] },
  ] as const;

  const filteredShortcuts = searchQuery.trim() === '' 
    ? [] 
    : globalShortcuts.filter(s => 
        s.label.toLowerCase().includes(searchQuery.toLowerCase()) && 
        (cashier ? (s.roles as readonly string[]).includes(cashier.role) : false)
      );

  const handleSearchShortcut = (item: typeof globalShortcuts[number]) => {
    setRoute(item.route);
    setSearchQuery('');
    setIsSearchOpen(false);
  }
  const [notifOpen, setNotifOpen] = useState(false)

  const { init, unreadCount } = useNotificationStore()

  // Set initial route based on role
  const [route, setRoute] = useState<Route>('tables')

  useEffect(() => {
    if (isAuthenticated && cashier) {
      if (cashier.role === 'kitchen') setRoute('live-orders')
      else if (cashier.role === 'admin') setRoute('dashboard')
      else setRoute('tables')

      const unsub = init()
      return () => unsub()
    }
  }, [isAuthenticated, cashier, init])

  if (!isAuthenticated) {
    return <PinEntry />
  }

  return (
    <div className="bg-surface font-body text-on-surface h-screen overflow-hidden flex flex-col">
      {/* TopAppBar - Deep Slate Navy matches sidebar */}
      <header className="fixed top-0 w-full z-50 bg-[#1a2633] border-b border-white/5 flex justify-between items-center px-4 md:px-6 h-16 shadow-lg">
        <div className="flex items-center gap-3 md:gap-8 flex-1 max-w-sm lg:max-w-md">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 -ml-2 text-white hover:bg-white/10 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <span className="material-symbols-outlined">{sidebarOpen ? 'close' : 'menu'}</span>
          </button>
          <span className="text-lg md:text-xl font-bold text-white font-headline tracking-tighter uppercase truncate mr-4 shrink-0">Snap Serve</span>
          
          {/* Global Search Bar */}
          <div className="hidden md:block relative flex-1 group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg opacity-60">search</span>
            <input 
              type="text" 
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search pages or actions..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white/10 focus:border-white/20 transition-all font-medium"
            />

            {/* Global Search Results Dropdown - Light Mode for better clarity */}
            {isSearchOpen && filteredShortcuts.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-3 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]">
                <div className="p-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Go to</p>
                </div>
                <div className="max-h-[350px] overflow-y-auto py-2 custom-scrollbar">
                  {filteredShortcuts.map((item, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleSearchShortcut(item)}
                      className="w-full flex items-center gap-4 px-5 py-3 hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 group-hover:text-primary text-sm transition-colors">{item.label}</p>
                        <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mt-0.5 opacity-80">Go to this page</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-sm">arrow_forward</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Search Backdrop Overlay */}
            {isSearchOpen && (
              <div 
                className="fixed inset-0 z-[-1]" 
                onClick={() => setIsSearchOpen(false)}
              ></div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-4">
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 hover:bg-white/10 transition-colors rounded-full text-slate-300 relative group"
            >
              <span className="material-symbols-outlined text-xl group-active:scale-95 transition-transform">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-error text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-slate-50 dark:border-slate-900 shadow-sm animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
          </div>
          {cashier?.role === 'admin' && (
            <button onClick={() => setRoute('admin/settings')} title="Settings" className="p-2 hover:bg-white/10 transition-colors rounded-full text-slate-300">
              <span className="material-symbols-outlined">settings</span>
            </button>
          )}
          <button onClick={() => logout()} title="Logout" className="p-2 hover:bg-error/20 text-error-container transition-colors rounded-full">
            <span className="material-symbols-outlined">logout</span>
          </button>
          <div className="hidden sm:flex w-8 h-8 rounded-full bg-primary text-on-primary items-center justify-center font-bold text-xs uppercase overflow-hidden border border-outline-variant/30">
            {cashier?.name.substring(0, 2)}
          </div>
        </div>
      </header>

      {/* App Body Frame */}
      <div className="flex flex-1 mt-16 h-[calc(100vh-64px)] overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* SideNavBar - High contrast dark slate for clear differentiation */}
        <aside className={`
          fixed md:static inset-y-0 left-0 w-64 bg-[#1a2633] flex flex-col p-4 gap-2 z-40 border-r border-white/5 overflow-y-auto
          transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="mb-6 px-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant</span>
              </div>
              <div>
                <h3 className="font-headline font-black text-white text-lg leading-none">Snap Serve</h3>
                <p className="text-xs text-slate-400 font-mono tracking-widest mt-1">{clock}</p>
              </div>
            </div>
            {(cashier?.role === 'admin' || cashier?.role === 'cashier') && (
              <button
                onClick={() => {
                  const store = useOrderStore.getState();
                  store.clearOrder();
                  store.setOrderType('takeaway');
                  store.setPlatformOrderId(`TKW-${Math.floor(Math.random() * 10000)}`);
                  setRoute('order');
                  setSidebarOpen(false);
                }}
                className="w-full bg-gradient-to-br from-primary to-primary-dim text-white font-semibold py-3 px-4 rounded-md shadow-sm hover:opacity-90 transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">shopping_bag</span>
                New Takeaway Order
              </button>
            )}
          </div>

          <nav className="flex flex-col gap-1 flex-1 font-body text-sm font-medium">
            {cashier?.role === 'admin' && (
              <NavBtn route={route} target="dashboard" icon="monitoring" onClick={() => { setRoute('dashboard'); setSidebarOpen(false); }}>Sales Reports</NavBtn>
            )}
            {(cashier?.role === 'admin' || cashier?.role === 'server' || cashier?.role === 'cashier') && (
              <NavBtn route={route} target="tables" icon="grid_view" onClick={() => { setRoute('tables'); setSidebarOpen(false); }}>Tables</NavBtn>
            )}
            {(cashier?.role === 'admin' || cashier?.role === 'cashier') && (
              <NavBtn route={route} target="order" icon="add_shopping_cart" onClick={() => {
                const store = useOrderStore.getState();
                store.clearOrder();
                store.setOrderType('takeaway');
                setRoute('order');
                setSidebarOpen(false);
              }}>New Order</NavBtn>
            )}
            {(cashier?.role === 'admin' || cashier?.role === 'kitchen' || cashier?.role === 'cashier' || cashier?.role === 'server') && (
              <NavBtn route={route} target="live-orders" icon="restaurant" onClick={() => { setRoute('live-orders'); setSidebarOpen(false); }}>Kitchen Screen</NavBtn>
            )}
            {(cashier?.role === 'admin' || cashier?.role === 'cashier' || cashier?.role === 'server') && (
              <NavBtn route={route} target="manage-orders" icon="assignment" onClick={() => { setRoute('manage-orders'); setSidebarOpen(false); }}>Active Orders</NavBtn>
            )}
            {(cashier?.role === 'admin' || cashier?.role === 'cashier') && (
              <NavBtn route={route} target="history" icon="history" onClick={() => { setRoute('history'); setSidebarOpen(false); }}>Past Bills</NavBtn>
            )}
            {(cashier?.role === 'admin' || cashier?.role === 'cashier') && (
              <NavBtn route={route} target="admin/menu" icon="edit_note" onClick={() => { setRoute('admin/menu'); setSidebarOpen(false); }}>Edit Menu</NavBtn>
            )}
            {cashier?.role === 'admin' && (
              <NavBtn route={route} target="admin/settings" icon="badge" onClick={() => { setRoute('admin/settings'); setSidebarOpen(false); }}>Settings</NavBtn>
            )}
          </nav>

          <div className="mt-auto border-t border-white/10 pt-4 flex flex-col gap-1 shrink-0">
            <button className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-white/5 rounded-md transition-colors w-full text-left font-medium text-sm">
              <span className="material-symbols-outlined">help</span>
              Get Help
            </button>
            <button onClick={logout} className="flex items-center gap-3 px-4 py-3 text-error-container hover:bg-error/10 rounded-md transition-colors w-full text-left font-medium text-sm">
              <span className="material-symbols-outlined">logout</span>
              Log Out
            </button>
            <div className="px-4 py-4 mt-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">
                Built by SpecNavigator <span className="text-error">❤️</span>
              </p>
            </div>
          </div>
        </aside>

        {/* Main Canvas Context */}
        <main className="flex-1 flex overflow-hidden bg-surface relative min-w-0">
          {route === 'dashboard' && (cashier?.role === 'admin' ? <DashboardScreen /> : <TablesScreen onStartOrder={() => setRoute('order')} />)}
          {route === 'tables' && <TablesScreen onStartOrder={() => setRoute('order')} />}
          {route === 'order' && <OrderScreen />}
          {route === 'live-orders' && <LiveOrdersScreen />}
          {route === 'manage-orders' && (cashier?.role !== 'kitchen' ? <ManageOrdersScreen onEdit={() => setRoute('order')} /> : <LiveOrdersScreen />)}
          {route === 'history' && <HistoryScreen />}
          {route === 'admin/menu' && (cashier?.role === 'admin' || cashier?.role === 'cashier' ? <AdminMenuScreen /> : <TablesScreen onStartOrder={() => setRoute('order')} />)}
          {route === 'admin/settings' && (cashier?.role === 'admin' ? <AdminSettingsScreen /> : <TablesScreen onStartOrder={() => setRoute('order')} />)}
        </main>
      </div>
    </div>
  )
}

function NavBtn({ route, target, icon, onClick, children }: {
  route: Route,
  target: Route,
  icon: string,
  onClick: () => void,
  children: React.ReactNode
}) {
  const active = route === target
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-md transition-all font-semibold ${active
        ? 'bg-primary text-white shadow-lg shadow-black/20'
        : 'text-slate-300 hover:bg-white/5'
        }`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      {children}
    </button>
  )
}
