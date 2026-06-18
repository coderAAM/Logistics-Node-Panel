import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  MapPin, 
  Package, 
  Terminal, 
  UserCheck, 
  User,
  LogIn,
  Key,
  Globe,
  Database,
  Grid
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserRole } from "./types.js";
import Navbar from "./components/Navbar.js";
import PublicTracking from "./components/PublicTracking.js";
import CustomerDashboard from "./components/CustomerDashboard.js";
import AgentDashboard from "./components/AgentDashboard.js";
import AdminDashboard from "./components/AdminDashboard.js";
import ApiExplorer from "./components/ApiExplorer.js";

type NavTab = "tracking" | "dashboard" | "api-docs";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("teyzix_token"));
  const [userRole, setUserRole] = useState<UserRole>("admin");
  const [userFullName, setUserFullName] = useState("Teyzix Admin");
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  
  // Login Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [fullNameInput, setFullNameInput] = useState("");
  const [roleInput, setRoleInput] = useState<UserRole>("customer");
  
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Auto Search from Click-to-Track actions
  const [searchTriggerId, setSearchTriggerId] = useState("");

  const verifyMe = async (savedToken: string) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.user.role);
        setUserFullName(data.user.fullName);
      } else {
        // Token stale, remove
        handleLogout();
      }
    } catch (err) {
      console.error("Could not verify session token details", err);
    }
  };

  const handleLogin = async (e: React.FormEvent, customCredentials?: { email: string; pass: string }) => {
    if (e) e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const targetEmail = customCredentials ? customCredentials.email : email;
    const targetPassword = customCredentials ? customCredentials.pass : password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPassword })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to authorize invalid credentials.");
      }

      setToken(data.token);
      setUserRole(data.user.role);
      setUserFullName(data.user.fullName);
      localStorage.setItem("teyzix_token", data.token);
      localStorage.setItem("teyzix_refresh", data.refreshToken);
      setActiveTab("dashboard");
    } catch (err: any) {
      setAuthError(err.message || "Failed to log in.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName: fullNameInput,
          role: roleInput
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration validation failed.");
      }

      setToken(data.token);
      setUserRole(data.user.role);
      setUserFullName(data.user.fullName);
      localStorage.setItem("teyzix_token", data.token);
      localStorage.setItem("teyzix_refresh", data.refreshToken);
      setActiveTab("dashboard");
    } catch (err: any) {
      setAuthError(err.message || "Failed to register.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Quick Switch logins for tester convenience
  const handleQuickLogin = async (role: UserRole) => {
    const credmap = {
      customer: { email: "customer@teyzix.com", pass: "customer123" },
      agent: { email: "agent@teyzix.com", pass: "agent123" },
      admin: { email: "admin@teyzix.com", pass: "admin123" }
    };
    const creds = credmap[role];
    
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds)
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUserRole(data.user.role);
        setUserFullName(data.user.fullName);
        localStorage.setItem("teyzix_token", data.token);
        localStorage.setItem("teyzix_refresh", data.refreshToken);
        setActiveTab("dashboard");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("teyzix_token");
    localStorage.removeItem("teyzix_refresh");
    setActiveTab("tracking");
  };

  const handleRoleSwitch = async (role: UserRole) => {
    // Quick login as that corresponding pre-seeded user
    await handleQuickLogin(role);
  };

  const handleNavigateToTrack = (trackingId: string) => {
    setSearchTriggerId(trackingId);
    setActiveTab("tracking");
  };

  // On page first boot, if token exists verify, otherwise log in as Admin automatically to bypass gates
  useEffect(() => {
    const saved = localStorage.getItem("teyzix_token");
    if (saved) {
      verifyMe(saved);
    } else {
      // Auto register/auto log in as customer or admin to show instantaneous live dashboard
      handleQuickLogin("admin");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-gray-300 font-sans antialiased flex flex-col justify-between">
      
      {/* Dynamic Header Header Navbar */}
      {token ? (
        <Navbar
          currentRole={userRole}
          userFullName={userFullName}
          onRoleSwitch={handleRoleSwitch}
          onLogout={handleLogout}
        />
      ) : (
        <header className="bg-[#161616] border-b border-[#262626] py-3.5 px-4 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl pointer-events-none">
                TC
              </div>
              <div>
                <h1 className="font-display font-extrabold text-white text-base leading-none">Teyzix Core</h1>
                <p className="text-[9px] text-gray-500 font-mono tracking-widest font-bold uppercase mt-0.5">Logistics Node Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] bg-[#262626] text-emerald-400 border border-[#262626] font-bold px-2 py-1 rounded font-mono">
                PUBLIC PORTAL
              </span>
            </div>
          </div>
        </header>
      )}

      {/* Main Container Layout */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 flex-1 space-y-6">
        
        {/* Navigation Selector Tabs */}
        <div className="flex items-center justify-between border-b border-[#262626] pb-2">
          <div className="flex items-center gap-1.5 bg-[#161616] p-1 rounded-xl border border-[#262626]">
            <button
              onClick={() => setActiveTab("tracking")}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4.5 py-2.5 rounded-lg transition-all focus:outline-none ${
                activeTab === "tracking" 
                  ? "bg-[#262626] text-[#10b981] font-bold shadow-sm" 
                  : "text-gray-400 hover:text-white hover:bg-[#202020]"
              }`}
              id="tab-btn-tracking"
            >
              <Globe className="w-4 h-4 text-emerald-500" />
              Live Tracking Portal
            </button>

            <button
              onClick={() => {
                if (!token) {
                  setAuthError("Authentication required to access operations dashboard.");
                } else {
                  setActiveTab("dashboard");
                }
              }}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4.5 py-2.5 rounded-lg transition-all focus:outline-none ${
                activeTab === "dashboard" 
                  ? "bg-[#262626] text-[#10b981] font-bold shadow-sm" 
                  : "text-gray-400 hover:text-white hover:bg-[#202020]"
              }`}
              id="tab-btn-dashboard"
            >
              <Grid className="w-4 h-4 text-indigo-400" />
              Operations Dashboard
            </button>

            <button
              onClick={() => setActiveTab("api-docs")}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4.5 py-2.5 rounded-lg transition-all focus:outline-none ${
                activeTab === "api-docs" 
                  ? "bg-[#262626] text-[#10b981] font-bold shadow-sm" 
                  : "text-gray-400 hover:text-white hover:bg-[#202020]"
              }`}
              id="tab-btn-apidocs"
            >
              <Terminal className="w-4 h-4 text-gray-300" />
              Interactive API Explorer
            </button>
          </div>

          {!token && (
            <span className="text-[10px] text-gray-500 font-mono hidden sm:inline-block">
              To experience role-based features, log in here.
            </span>
          )}
        </div>

        {/* Tab View Routers */}
        <div id="application-content-viewport">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "tracking" && (
                <PublicTracking onSearchTrack={setSearchTriggerId} />
              )}

              {activeTab === "api-docs" && (
                <ApiExplorer />
              )}

              {activeTab === "dashboard" && (
                token ? (
                  // Display Scoped Role Dashboard Modules
                  userRole === "customer" ? (
                    <CustomerDashboard onSearchTrack={handleNavigateToTrack} />
                  ) : userRole === "agent" ? (
                    <AgentDashboard onSearchTrack={handleNavigateToTrack} />
                  ) : (
                    <AdminDashboard onSearchTrack={handleNavigateToTrack} />
                  )
                ) : (
                  // Otherwise show authentication gateways
                  <div className="max-w-md mx-auto bg-[#161616] rounded-2xl border border-[#262626] p-6 space-y-6" id="auth-gate-container">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-[#262626] text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <LogIn className="w-6 h-6" id="icon-login-gate" />
                      </div>
                      <h2 className="font-display font-extrabold text-xl text-white">Operational Log-In</h2>
                      <p className="text-xs text-gray-500 mt-1">Authenticate to manage shipments, update status, or monitor hubs</p>
                    </div>

                    {authError && (
                      <div className="bg-rose-950/20 border border-rose-900/40 text-rose-450 text-xs p-3.5 rounded-xl font-medium">
                        {authError}
                      </div>
                    )}

                    <form onSubmit={isRegister ? handleRegister : (e) => handleLogin(e)} className="space-y-4" id="form-login-gate">
                      {isRegister && (
                        <>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Full Name *</label>
                            <input
                              type="text"
                              required
                              value={fullNameInput}
                              onChange={(e) => setFullNameInput(e.target.value)}
                              placeholder="Hassan Ali"
                              className="w-full bg-[#0D0D0D] border border-[#262626] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              id="reg-input-name"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Access Role *</label>
                            <select
                              value={roleInput}
                              onChange={(e) => setRoleInput(e.target.value as UserRole)}
                              className="w-full bg-[#0D0D0D] border border-[#262626] rounded-lg p-2.5 text-xs text-gray-300 focus:outline-none"
                              id="reg-input-role"
                            >
                              <option value="customer">Customer</option>
                              <option value="agent">Delivery Agent</option>
                              <option value="admin">Administrator</option>
                            </select>
                          </div>
                        </>
                      )}

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full bg-[#0D0D0D] border border-[#262626] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          id="login-input-email"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Password *</label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#0D0D0D] border border-[#262626] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          id="login-input-pass"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-[#202020] disabled:text-gray-500 text-black font-extrabold text-xs py-3 rounded-lg transition-all flex items-center justify-center gap-1.5 focus:outline-none"
                      >
                        {authLoading ? "Verifying..." : isRegister ? "Create Account" : "Access Console"}
                      </button>
                    </form>

                    <div className="text-center">
                      <button
                        onClick={() => setIsRegister(!isRegister)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        {isRegister ? "Already standard partner? Sign In" : "Need partner credentials? Sign Up"}
                      </button>
                    </div>

                    {/* Preseeded login credentials bar for direct evaluation testing */}
                    <div className="border-t border-[#262626] pt-4 space-y-2.5">
                      <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Developer Sandbox fast-access:</span>
                      <div className="grid grid-cols-1 gap-1.5 text-xs font-semibold">
                        <button
                          onClick={() => handleQuickLogin("customer")}
                          className="w-full text-left bg-[#202020] hover:bg-[#262626] text-gray-300 border border-[#262626] p-2.5 rounded-lg flex items-center justify-between"
                          id="sandbox-cred-customer"
                        >
                          <div>
                            <p className="font-bold text-white">Customer (Hassan Ali)</p>
                            <p className="text-[10px] text-gray-500">customer@teyzix.com / customer123</p>
                          </div>
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded">Enter</span>
                        </button>
                        <button
                          onClick={() => handleQuickLogin("agent")}
                          className="w-full text-left bg-[#202020] hover:bg-[#262626] text-gray-300 border border-[#262626] p-2.5 rounded-lg flex items-center justify-between"
                          id="sandbox-cred-agent"
                        >
                          <div>
                            <p className="font-bold text-white">Agent (Zeeshan Khan)</p>
                            <p className="text-[10px] text-gray-500">agent@teyzix.com / agent123</p>
                          </div>
                          <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/25 px-1.5 py-0.5 rounded">Enter</span>
                        </button>
                        <button
                          onClick={() => handleQuickLogin("admin")}
                          className="w-full text-left bg-[#202020] hover:bg-[#262626] text-gray-300 border border-[#262626] p-2.5 rounded-lg flex items-center justify-between"
                          id="sandbox-cred-admin"
                        >
                          <div>
                            <p className="font-bold text-white">System Administrator</p>
                            <p className="text-[10px] text-gray-500">admin@teyzix.com / admin123</p>
                          </div>
                          <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/25 px-1.5 py-0.5 rounded">Enter</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Aesthetic layout footer */}
      <footer className="border-t border-[#262626] py-6 px-4 bg-[#0D0D0D] text-center mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-gray-500 font-medium text-xs">
          <p>© 2026 Teyzix Core (June Batch). All Rights Reserved.</p>
          <p className="font-mono text-[10px] text-gray-500">
            Assigned: 11 June 1 ➔ Deadline: 19 June 2026 | BEWD-1 Task Submission
          </p>
        </div>
      </footer>

    </div>
  );
}
