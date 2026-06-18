import React, { useState, useEffect } from "react";
import { Bell, User, LogOut, ShieldAlert, ArrowLeftRight, CheckSquare, Key } from "lucide-react";
import { Notification, UserRole } from "../types.js";
import { motion, AnimatePresence } from "motion/react";

interface NavbarProps {
  currentRole: UserRole;
  userFullName: string;
  onRoleSwitch: (role: UserRole) => void;
  onLogout: () => void;
}

export default function Navbar({ currentRole, userFullName, onRoleSwitch, onLogout }: NavbarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const fetchNotifications = async () => {
    const token = localStorage.getItem("teyzix_token");
    if (!token) return;

    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount((data.notifications || []).filter((n: any) => !n.isRead).length);
      }
    } catch (err) {
      console.error("Failed to load user notifications", err);
    }
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem("teyzix_token");
    if (!token) return;

    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setUnreadCount(0);
        // Refresh local
        fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
    }
  };

  // Poll notifications periodically
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [currentRole]);

  const roleLabels: Record<UserRole, { label: string; color: string }> = {
    customer: { label: "Customer Portal", color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" },
    agent: { label: "Delivery Agent Group", color: "bg-blue-500/10 text-blue-400 border border-blue-500/25" },
    admin: { label: "System Administrator", color: "bg-rose-500/10 text-rose-400 border border-rose-500/25" }
  };

  return (
    <nav className="bg-[#161616] border-b border-[#262626] px-4 py-3.5 sticky top-0 z-30" id="main-navigation">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Brand visual and identity details */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl tracking-tight leading-none">
              TC
            </div>
            <div>
              <h1 className="font-display font-extrabold text-white text-lg tracking-tight leading-none">
                Teyzix Core
              </h1>
              <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mt-0.5 font-bold">
                Logistics Operations Hub
              </p>
            </div>
          </div>

          <div className="md:hidden flex items-center gap-2">
            {/* Bell trigger for small screen */}
            <button
              onClick={() => {
                fetchNotifications();
                setShowNotifDropdown(!showNotifDropdown);
              }}
              className="relative p-2 text-gray-400 hover:bg-[#202020] rounded-xl transition-all"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Middle quick tester auth bar */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#0D0D0D] rounded-xl p-1.5 border border-[#262626]">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold font-mono px-2 flex items-center gap-1">
            <ArrowLeftRight className="w-3 h-3 text-emerald-400 animate-pulse" />
            Sandbox Quick-Test Switching:
          </span>
          {(['customer', 'agent', 'admin'] as UserRole[]).map((r) => {
            const isSel = currentRole === r;
            return (
              <button
                key={r}
                onClick={async () => {
                  onRoleSwitch(r);
                }}
                className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all capitalize focus:outline-none ${
                  isSel 
                    ? "bg-[#262626] text-emerald-400 border border-[#333]" 
                    : "text-gray-400 hover:text-white hover:bg-[#202020]"
                }`}
                id={`navbar-role-btn-${r}`}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* Right side Profile controls */}
        <div className="hidden md:flex items-center gap-4">
          
          {/* Notifications bell component */}
          <div className="relative">
            <button
              onClick={() => {
                fetchNotifications();
                setShowNotifDropdown(!showNotifDropdown);
              }}
              className="relative p-2 text-gray-400 hover:bg-[#202020] rounded-xl transition-all focus:outline-none"
              id="navbar-notif-bell"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown details */}
            <AnimatePresence>
              {showNotifDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className="absolute right-0 mt-3 w-80 bg-[#161616] border border-[#262626] rounded-2xl shadow-xl overflow-hidden p-1 z-40"
                  id="navbar-notif-dropdown"
                >
                  <div className="flex justify-between items-center px-4 py-3 border-b border-[#262626]">
                    <span className="font-display font-bold text-white text-sm">Notifications Alert feed</span>
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-all font-semibold"
                    >
                      Clear alerts
                    </button>
                  </div>
                  
                  <div className="max-h-72 overflow-y-auto div-notif-scroller p-1.5 space-y-1">
                    {notifications.length === 0 ? (
                      <p className="text-center text-xs text-gray-500 py-6">No historical alerts found.</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl border flex flex-col gap-0.5 leading-tight ${
                            n.isRead ? "bg-[#161616] border-transparent" : "bg-[#202020] border-[#262626]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{n.title}</span>
                            <span className="text-[9px] text-gray-500">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-450">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-5 w-px bg-[#262626]" />

          {/* Profile user info */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end text-right">
              <span className="text-sm font-bold text-white">{userFullName}</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize ${roleLabels[currentRole].color}`}>
                {roleLabels[currentRole].label}
              </span>
            </div>
            
            <div className="w-9 h-9 rounded-full bg-[#202020] border border-[#262626] flex items-center justify-center">
              <User className="w-5 h-5 text-gray-400" />
            </div>

            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-xl transition-all focus:outline-none"
              title="Logout Session"
              id="navbar-logout-btn"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

        </div>

      </div>
    </nav>
  );
}
