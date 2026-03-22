import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Users, 
  Settings, 
  LogOut, 
  Search, 
  Moon, 
  Sun,
  Smartphone,
  CheckCircle2,
  Clock,
  Wrench,
  MessageSquare,
  ChevronRight,
  ArrowLeft,
  IndianRupee,
  Phone,
  User,
  AlertCircle,
  Mail,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db,
  signIn,
  signUp,
  logOut, 
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  handleFirestoreError,
  OperationType,
  getDocFromServer
} from './firebase';
import { 
  User as FirebaseUser 
} from 'firebase/auth';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Repair, Shop, Customer, RepairStatus } from './types';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger', size?: 'sm' | 'md' | 'lg' }) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    outline: 'border border-slate-200 bg-transparent hover:bg-slate-50',
    ghost: 'bg-transparent hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg font-medium'
  };

  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, error, icon: Icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string, icon?: any }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />}
      <input 
        className={cn(
          "w-full px-4 py-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all",
          Icon && "pl-10",
          error && "border-red-500 focus:ring-red-500"
        )}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'info' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    info: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", variants[variant])}>
      {children}
    </span>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'repairs' | 'customers' | 'settings'>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('repair-centre-theme');
    return (saved as 'light' | 'dark') || 'light';
  });
  const [showAddRepair, setShowAddRepair] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Clear search when switching tabs
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);

  // Auth form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // --- Auth ---
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'shops', 'connection-test'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Logged in as:", user.email, "UID:", user.uid);
      }
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Theme ---
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('repair-centre-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // --- Auth Actions ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await signUp(email, password);
        // Create initial shop profile
        const shopData: Shop = {
          id: userCredential.user.uid,
          name: 'वैजनाथ रिपेर सेंटर',
          ownerEmail: userCredential.user.email || '',
          ownerUid: userCredential.user.uid,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'shops', userCredential.user.uid), shopData);
      } else {
        await signIn(email, password);
      }
    } catch (error: any) {
      if (isSignUp && error.code === 'auth/email-already-in-use') {
        setAuthError('User already exists. Please sign in');
      } else if (!isSignUp && (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password')) {
        setAuthError('Email or password is incorrect');
      } else {
        setAuthError(error.message);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // --- Firestore Data ---
  useEffect(() => {
    if (!user) {
      setRepairs([]);
      setCustomers([]);
      setShop(null);
      return;
    }

    // Listen to Shop
    const shopUnsubscribe = onSnapshot(doc(db, 'shops', user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        setShop(docSnap.data() as Shop);
      } else {
        // Fallback: Create shop if missing
        const shopData: Shop = {
          id: user.uid,
          name: 'वैजनाथ रिपेर सेंटर',
          ownerEmail: user.email || '',
          ownerUid: user.uid,
          createdAt: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, 'shops', user.uid), shopData);
        } catch (err) {
          console.error('Error creating fallback shop:', err);
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `shops/${user.uid}`));

    // Listen to Repairs
    const repairsQuery = query(collection(db, 'repairs'), where('shopId', '==', user.uid));
    const repairsUnsubscribe = onSnapshot(repairsQuery, (snapshot) => {
      const repairsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Repair));
      setRepairs(repairsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'repairs'));

    // Listen to Customers
    const customersQuery = query(collection(db, 'customers'), where('shopId', '==', user.uid));
    const customersUnsubscribe = onSnapshot(customersQuery, (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customersData);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'customers'));

    return () => {
      shopUnsubscribe();
      repairsUnsubscribe();
      customersUnsubscribe();
    };
  }, [user]);

  const handleStatusUpdate = async (id: string, status: RepairStatus) => {
    try {
      await updateDoc(doc(db, 'repairs', id), { 
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `repairs/${id}`);
    }
  };

  const handleNotify = (repair: Repair) => {
    const message = `Namaste ${repair.customerName}, your ${repair.deviceModel} is repaired. Final Bill: ₹${repair.estimatedCost}. You can collect it from ${shop?.name || 'our shop'}.`;
    const whatsappUrl = `https://wa.me/${repair.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleAddRepair = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setFormLoading(true);
    setFormError('');

    const formData = new FormData(e.currentTarget);
    const repairData = {
      customerName: formData.get('customerName') as string,
      customerPhone: formData.get('customerPhone') as string,
      deviceModel: formData.get('deviceModel') as string,
      issueDescription: formData.get('issueDescription') as string,
      estimatedCost: Number(formData.get('estimatedCost')),
      advancePaid: formData.get('advancePaid') === 'on',
      status: 'Received' as RepairStatus,
      shopId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Basic validation
    if (repairData.customerPhone.length < 10) {
      setFormError('Phone number must be at least 10 digits');
      setFormLoading(false);
      return;
    }

    try {
      await addDoc(collection(db, 'repairs'), repairData);
      
      // Update or create customer record using a deterministic ID to avoid composite index requirements
      const customerId = `${user.uid}_${repairData.customerPhone.replace(/\D/g, '')}`;
      const customerDocRef = doc(db, 'customers', customerId);
      const customerSnap = await getDoc(customerDocRef);
      
      if (!customerSnap.exists()) {
        await setDoc(customerDocRef, {
          name: repairData.customerName,
          phone: repairData.customerPhone,
          shopId: user.uid,
          lastRepairDate: new Date().toISOString()
        });
      } else {
        await updateDoc(customerDocRef, {
          lastRepairDate: new Date().toISOString()
        });
      }

      setShowAddRepair(false);
    } catch (err: any) {
      console.error('Error adding repair:', err);
      setFormError(err.message || 'Failed to create job sheet. Please check your connection.');
      // We don't call handleFirestoreError here because we want to handle it locally in the UI
    } finally {
      setFormLoading(false);
    }
  };

  const stats = {
    pending: repairs.filter(r => r.status !== 'Fixed').length,
    todayDeliveries: repairs.filter(r => {
      const today = new Date().toISOString().split('T')[0];
      const repairDate = new Date(r.updatedAt || r.createdAt).toISOString().split('T')[0];
      return r.status === 'Fixed' && repairDate === today;
    }).length,
    earnedToday: repairs.filter(r => {
      const today = new Date().toISOString().split('T')[0];
      const repairDate = new Date(r.updatedAt || r.createdAt).toISOString().split('T')[0];
      return r.status === 'Fixed' && repairDate === today;
    }).reduce((acc, curr) => acc + curr.estimatedCost, 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4 shadow-lg">
              <Smartphone size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">वैजनाथ रिपेर सेंटर</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Professional Job-Sheet Management</p>
          </div>
          
          <Card className="p-8">
            <h2 className="text-xl font-semibold mb-6 text-center">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="name@example.com" 
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
              <Input 
                label="Password" 
                type="password" 
                placeholder="••••••••" 
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
              
              {authError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {authError}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full py-3" 
                disabled={authLoading}
              >
                {authLoading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError('');
                }}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 lg:pb-0 lg:pl-64">
      {/* --- Sidebar (Desktop) --- */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 p-6 z-30">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
            <Smartphone size={20} />
          </div>
          <span className="font-bold text-lg leading-tight">वैजनाथ रिपेर सेंटर</span>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Wrench size={20} />} label="Repairs" active={activeTab === 'repairs'} onClick={() => setActiveTab('repairs')} />
          <NavItem icon={<Users size={20} />} label="Customers" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
          <NavItem icon={<Settings size={20} />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-slate-500 truncate">{shop?.name}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-3 text-slate-500" onClick={logOut}>
            <LogOut size={20} />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* --- Mobile Header --- */}
      <header className="lg:hidden sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Smartphone size={16} />
          </div>
          <span className="font-bold">{shop?.name || 'वैजनाथ रिपेर सेंटर'}</span>
        </div>
        <button onClick={toggleTheme} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      {/* --- Main Content --- */}
      <main className="p-4 lg:p-8 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-blue-600 dark:text-blue-400 mb-1">वैजनाथ रिपेर सेंटर</h1>
                  <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Dashboard</h2>
                  <p className="text-slate-500">Welcome back to your repair management system</p>
                </div>
                <Button onClick={() => setShowAddRepair(true)} className="gap-2">
                  <PlusCircle size={20} />
                  New Repair
                </Button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard 
                  icon={<Clock className="text-amber-500" />} 
                  label="Pending Repairs" 
                  value={stats.pending} 
                  color="amber"
                />
                <StatCard 
                  icon={<CheckCircle2 className="text-emerald-500" />} 
                  label="Today's Deliveries" 
                  value={stats.todayDeliveries} 
                  color="emerald"
                />
                <StatCard 
                  icon={<IndianRupee className="text-blue-500" />} 
                  label="Earned Today" 
                  value={`₹${stats.earnedToday}`} 
                  color="blue"
                />
              </div>

              {/* Recent Repairs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Recent Repairs</h3>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('repairs')}>View All</Button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {repairs.length > 0 ? (
                    repairs.slice(0, 5).map(repair => (
                      <RepairItem 
                        key={repair.id} 
                        repair={repair} 
                        onStatusUpdate={handleStatusUpdate}
                        onNotify={handleNotify}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <p className="text-slate-500">No repairs found. Add your first job sheet!</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'repairs' && (
            <motion.div 
              key="repairs"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Job Sheets</h2>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by device, customer or phone..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {repairs
                  .filter(r => 
                    r.deviceModel.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.customerPhone.includes(searchQuery)
                  )
                  .map(repair => (
                    <RepairItem 
                      key={repair.id} 
                      repair={repair} 
                      onStatusUpdate={handleStatusUpdate}
                      onNotify={handleNotify}
                    />
                  ))
                }
                {repairs.length === 0 && (
                  <div className="text-center py-20">
                    <Smartphone className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500">No repairs found.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'customers' && (
            <motion.div 
              key="customers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Customer Directory</h2>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by name or phone..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customers
                  .filter(c => 
                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    c.phone.includes(searchQuery)
                  )
                  .map(customer => (
                    <CustomerCard 
                      key={customer.id} 
                      customer={customer} 
                      repairs={repairs.filter(r => r.customerPhone === customer.phone)}
                      onViewHistory={() => setSelectedCustomerForHistory(customer)}
                    />
                  ))
                }
                {customers.length === 0 && (
                  <div className="col-span-full text-center py-20">
                    <Users className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500">No customers found.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">Settings</h2>
              
              <Card className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                      {theme === 'light' ? <Sun /> : <Moon />}
                    </div>
                    <div>
                      <p className="font-medium">Appearance</p>
                      <p className="text-sm text-slate-500">Switch between light and dark mode</p>
                    </div>
                  </div>
                  <button 
                    onClick={toggleTheme}
                    className="w-14 h-8 rounded-full bg-slate-200 dark:bg-slate-700 relative transition-colors"
                  >
                    <div className={cn(
                      "absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform",
                      theme === 'dark' && "translate-x-6"
                    )} />
                  </button>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="font-semibold mb-4">Account</h3>
                  <p className="text-sm text-slate-500 mb-4">Logged in as: <strong>{user.email}</strong></p>
                  <Button variant="danger" className="w-full" onClick={logOut}>
                    Sign Out
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- Add Repair Modal --- */}
      <AnimatePresence>
        {showAddRepair && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowAddRepair(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold">New Repair Job</h3>
                <button onClick={() => setShowAddRepair(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ArrowLeft size={20} />
                </button>
              </div>

              <form onSubmit={handleAddRepair} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {formError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Customer Name" name="customerName" placeholder="John Doe" required />
                  <Input label="Phone Number" name="customerPhone" placeholder="9876543210" required />
                </div>
                <Input label="Device Model" name="deviceModel" placeholder="iPhone 13 Pro" required />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Issue Description</label>
                  <textarea 
                    name="issueDescription"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[100px]"
                    placeholder="Screen cracked, battery draining fast..."
                    required
                  />
                </div>
                <div className="flex items-end gap-4">
                  <Input label="Estimated Cost (₹)" name="estimatedCost" type="number" placeholder="2500" required />
                  <div className="flex items-center gap-2 pb-3">
                    <input type="checkbox" id="advancePaid" name="advancePaid" className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <label htmlFor="advancePaid" className="text-sm font-medium text-slate-700 dark:text-slate-300">Advance Paid</label>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddRepair(false)} disabled={formLoading}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={formLoading}>
                    {formLoading ? 'Creating...' : 'Create Job Sheet'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Customer History Modal --- */}
      <AnimatePresence>
        {selectedCustomerForHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedCustomerForHistory(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-bold">{selectedCustomerForHistory.name}</h3>
                  <p className="text-sm text-slate-500">{selectedCustomerForHistory.phone}</p>
                </div>
                <button onClick={() => setSelectedCustomerForHistory(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ArrowLeft size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Total Jobs</p>
                    <p className="text-xl font-bold">{repairs.filter(r => r.customerPhone === selectedCustomerForHistory.phone).length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Total Value</p>
                    <p className="text-xl font-bold">₹{repairs.filter(r => r.customerPhone === selectedCustomerForHistory.phone).reduce((acc, curr) => acc + curr.estimatedCost, 0)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 col-span-2 sm:col-span-1">
                    <p className="text-xs text-slate-500 font-medium mb-1">Customer Since</p>
                    <p className="text-sm font-bold">{format(new Date(repairs.filter(r => r.customerPhone === selectedCustomerForHistory.phone).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]?.createdAt || new Date()), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock size={18} className="text-blue-600" />
                  Repair History
                </h4>

                <div className="space-y-3">
                  {repairs
                    .filter(r => r.customerPhone === selectedCustomerForHistory.phone)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(repair => (
                      <div key={repair.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{repair.deviceModel}</p>
                            <p className="text-xs text-slate-500">{format(new Date(repair.createdAt), 'MMMM d, yyyy • h:mm a')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-600">₹{repair.estimatedCost}</p>
                            <Badge variant={repair.status === 'Fixed' ? 'success' : repair.status === 'Working' ? 'info' : 'warning'}>
                              {repair.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Issue Reported</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{repair.issueDescription}"</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Mobile Nav --- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-2 flex justify-around items-center z-30">
        <MobileNavItem icon={<LayoutDashboard />} label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<Wrench />} label="Repairs" active={activeTab === 'repairs'} onClick={() => setActiveTab('repairs')} />
        <MobileNavItem icon={<Users />} label="Users" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
        <MobileNavItem icon={<Settings />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
}

// --- Sub-components ---

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
        active 
          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium" 
          : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileNavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all",
        active ? "text-blue-600" : "text-slate-400"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color: string }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={cn("p-3 rounded-2xl", {
        'bg-amber-50 dark:bg-amber-900/20': color === 'amber',
        'bg-emerald-50 dark:bg-emerald-900/20': color === 'emerald',
        'bg-blue-50 dark:bg-blue-900/20': color === 'blue',
      })}>
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </Card>
  );
}

interface RepairItemProps {
  repair: Repair;
  onStatusUpdate: (id: string, s: RepairStatus) => void | Promise<void>;
  onNotify: (r: Repair) => void;
  key?: any;
}

function RepairItem({ repair, onStatusUpdate, onNotify }: RepairItemProps) {
  const statusColors = {
    'Received': 'warning',
    'Working': 'info',
    'Fixed': 'success'
  } as const;

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
            <Smartphone size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold">{repair.deviceModel}</h4>
              <Badge variant={statusColors[repair.status]}>{repair.status}</Badge>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <User size={14} /> {repair.customerName} • <Phone size={14} /> {repair.customerPhone}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {format(new Date(repair.createdAt), 'MMM d, h:mm a')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {repair.status === 'Received' && (
            <Button size="sm" variant="outline" onClick={() => onStatusUpdate(repair.id, 'Working')}>Start Work</Button>
          )}
          {repair.status === 'Working' && (
            <Button size="sm" variant="primary" onClick={() => onStatusUpdate(repair.id, 'Fixed')}>Mark Fixed</Button>
          )}
          {repair.status === 'Fixed' && (
            <Button size="sm" variant="secondary" className="gap-2" onClick={() => onNotify(repair)}>
              <MessageSquare size={16} />
              Notify
            </Button>
          )}
          <div className="ml-2 text-right">
            <p className="text-sm font-bold">₹{repair.estimatedCost}</p>
            {repair.advancePaid && <p className="text-[10px] text-emerald-500 font-medium">Advance Paid</p>}
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800/50">
        <p className="text-sm text-slate-500 italic">"{repair.issueDescription}"</p>
      </div>
    </Card>
  );
}

interface CustomerCardProps {
  customer: Customer;
  repairs: Repair[];
  onViewHistory: () => void;
  key?: any;
}

function CustomerCard({ customer, repairs, onViewHistory }: CustomerCardProps) {
  const totalSpent = repairs.reduce((acc, curr) => acc + curr.estimatedCost, 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
            <User size={20} />
          </div>
          <div>
            <h4 className="font-bold">{customer.name}</h4>
            <p className="text-sm text-slate-500">{customer.phone}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Total Spent</p>
          <p className="font-bold text-blue-600">₹{totalSpent}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Repairs: {repairs.length}</span>
          <span>Last: {format(new Date(customer.lastRepairDate), 'MMM d, yyyy')}</span>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-center text-xs gap-2"
          onClick={onViewHistory}
        >
          <Clock size={14} />
          View Detailed History
        </Button>
      </div>
    </Card>
  );
}

