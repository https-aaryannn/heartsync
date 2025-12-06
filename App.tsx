import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { auth, getActivePeriod, checkIsAdmin, onAuthStateChanged, User } from './services/firebase';
import { Period } from './types';

// Icons
import { Heart, Menu, X, LogOut, User as UserIcon, LayoutDashboard, ShieldAlert, Search } from 'lucide-react';

// Pages
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import SubmitCrush from './pages/SubmitCrush';
import Admin from './pages/Admin';
import Login from './pages/Login';

// Components
const Navbar = ({ user, isAdmin }: { user: User | null, isAdmin: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinkClass = (path: string) => 
    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      location.pathname === path 
        ? 'bg-brand-primary text-white' 
        : 'text-gray-300 hover:bg-brand-surface hover:text-white'
    }`;

  return (
    <nav className="bg-brand-dark/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="relative">
               <Heart className="h-8 w-8 text-brand-secondary fill-brand-secondary transition-transform group-hover:scale-110" />
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
               </div>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-secondary to-brand-primary">
              Heartsync
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link to="/" className={navLinkClass('/')}>Home</Link>
              {user && (
                <>
                  <Link to="/dashboard" className={navLinkClass('/dashboard')}>Dashboard</Link>
                  <Link to="/submit" className={navLinkClass('/submit')}>New Crush</Link>
                </>
              )}
              {isAdmin && (
                <Link to="/admin" className={navLinkClass('/admin')}>Admin</Link>
              )}
            </div>
          </div>

          {/* Auth / Mobile Menu Button */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center space-x-2 text-gray-400 bg-white/5 px-3 py-1.5 rounded-full">
                  <UserIcon className="h-4 w-4" />
                  <span className="text-sm">{user.displayName}</span>
                </div>
                <button 
                  onClick={() => auth.signOut()}
                  className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-white/5"
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
               <Link to="/login" className="hidden md:block text-sm font-medium text-brand-primary hover:text-brand-secondary">
                 Log In
               </Link>
            )}
            
            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-brand-surface border-b border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link to="/" onClick={() => setIsOpen(false)} className={navLinkClass('/')}>Home</Link>
            {user && (
              <>
                <Link to="/dashboard" onClick={() => setIsOpen(false)} className={navLinkClass('/dashboard')}>Dashboard</Link>
                <Link to="/submit" onClick={() => setIsOpen(false)} className={navLinkClass('/submit')}>New Crush</Link>
              </>
            )}
            {isAdmin && (
              <Link to="/admin" onClick={() => setIsOpen(false)} className={navLinkClass('/admin')}>Admin</Link>
            )}
            {!user ? (
              <Link to="/login" onClick={() => setIsOpen(false)} className={navLinkClass('/login')}>Log In</Link>
            ) : (
              <button onClick={() => auth.signOut()} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-gray-800">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-brand-dark border-t border-white/5 py-8">
    <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
      <p>&copy; {new Date().getFullYear()} Heartsync. All heartbeats reserved.</p>
      <div className="mt-2 space-x-4">
        <a href="#" className="hover:text-brand-primary">Privacy</a>
        <a href="#" className="hover:text-brand-primary">Terms</a>
      </div>
    </div>
  </footer>
);

// Global State wrapper for Period and Auth
const AppContent = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check admin status
        const adminStatus = await checkIsAdmin(currentUser.uid);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    // Load active period
    getActivePeriod().then(p => setActivePeriod(p));

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark text-white">
      <Navbar user={user} isAdmin={isAdmin} />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Landing activePeriod={activePeriod} />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard user={user} activePeriod={activePeriod} /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/submit" 
            element={user ? <SubmitCrush user={user} activePeriod={activePeriod} /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/admin" 
            element={user && isAdmin ? <Admin activePeriod={activePeriod} /> : <Navigate to="/" />} 
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}