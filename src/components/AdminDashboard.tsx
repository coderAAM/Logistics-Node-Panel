import React, { useState, useEffect } from "react";
import { 
  Building, 
  Users, 
  MapPin, 
  Plus, 
  BarChart2, 
  Activity, 
  Sliders, 
  Search, 
  Filter, 
  Settings, 
  Calendar, 
  Package, 
  Truck 
} from "lucide-react";
import { Shipment, Warehouse, SystemStats, UserRole, ShipmentStatus } from "../types.js";
import { motion, AnimatePresence } from "motion/react";

interface AdminDashboardProps {
  onSearchTrack: (id: string) => void;
}

export default function AdminDashboard({ onSearchTrack }: AdminDashboardProps) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [agents, setAgents] = useState<{ id: string; fullName: string; email: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [whLoading, setWhLoading] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // New Warehouse form fields
  const [showWhModal, setShowWhModal] = useState(false);
  const [whName, setWhName] = useState("");
  const [whLocation, setWhLocation] = useState("");
  const [whCapacity, setWhCapacity] = useState("");
  const [whError, setWhError] = useState<string | null>(null);

  // Reassignment drawer / Modal elements
  const [selectShipment, setSelectShipment] = useState<Shipment | null>(null);
  const [reassignAgent, setReassignAgent] = useState("");
  const [reassignWh, setReassignWh] = useState("");
  const [reassignLoading, setReassignLoading] = useState(false);

  const fetchStatsAndWarehouses = async () => {
    const token = localStorage.getItem("teyzix_token");
    if (!token) return;

    try {
      // 1. Fetch Stats
      const resStats = await fetch("/api/reports/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resStats.ok) {
        const dStats = await resStats.json();
        setStats(dStats);
        if (dStats.agents) {
          setAgents(dStats.agents);
        }
      }

      // 2. Fetch Warehouses
      const resWh = await fetch("/api/warehouses", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resWh.ok) {
        const dWh = await resWh.json();
        setWarehouses(dWh.warehouses || []);
      }
    } catch (err) {
      console.error("Failed to gather administrative parameters", err);
    }
  };

  const fetchFilteredShipments = async () => {
    const token = localStorage.getItem("teyzix_token");
    if (!token) return;

    try {
      setLoading(true);
      const url = `/api/shipments?search=${searchQuery}&status=${statusFilter}&page=${currentPage}&limit=5`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setShipments(data.shipments || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch filtered shipments block", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhLoading(true);
    setWhError(null);

    const token = localStorage.getItem("teyzix_token");
    if (!token) return;

    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: whName.trim(),
          location: whLocation.trim(),
          capacity: parseFloat(whCapacity)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to establish warehouse location.");
      }

      // Reset
      setWhName("");
      setWhLocation("");
      setWhCapacity("");
      setShowWhModal(false);

      // Refresh
      fetchStatsAndWarehouses();
    } catch (err: any) {
      setWhError(err.message || "Failed to complete operational sorting deployment.");
    } finally {
      setWhLoading(false);
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectShipment) return;

    setReassignLoading(true);
    const token = localStorage.getItem("teyzix_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/shipments/${selectShipment.id}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          warehouseId: reassignWh || undefined,
          assignedAgentId: reassignAgent || undefined
        })
      });

      if (res.ok) {
        setSelectShipment(null);
        setReassignAgent("");
        setReassignWh("");
        fetchFilteredShipments();
        fetchStatsAndWarehouses();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to commit allocation changes.");
      }
    } catch (err) {
      console.error("Failed reassign", err);
    } finally {
      setReassignLoading(false);
    }
  };

  // Reload lists on change
  useEffect(() => {
    fetchStatsAndWarehouses();
  }, []);

  useEffect(() => {
    fetchFilteredShipments();
  }, [searchQuery, statusFilter, currentPage]);

  return (
    <div className="space-y-6">
      
      {/* Business KPIs statistics block */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#161616] rounded-2xl border border-[#262626] p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Booked Today</p>
                <p className="font-display font-black text-white text-3xl mt-1">{stats.dailyShipments}</p>
              </div>
              <span className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <Calendar className="w-5 h-5" />
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-3 pt-3 border-t border-[#262626]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active logistics channels live
            </div>
          </div>

          <div className="bg-[#161616] rounded-2xl border border-[#262626] p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Complete Deliveries</p>
                <p className="font-display font-black text-white text-3xl mt-1">{stats.deliveredOrders}</p>
              </div>
              <span className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <Package className="w-5 h-5" />
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-3 pt-3 border-t border-[#262626]">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Success delivery clearance rating
            </div>
          </div>

          <div className="bg-[#161616] rounded-2xl border border-[#262626] p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Active En-Route Loads</p>
                <p className="font-display font-black text-white text-3xl mt-1">{stats.pendingOrders}</p>
              </div>
              <span className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400">
                <Truck className="w-5 h-5" />
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-3 pt-3 border-t border-[#262626]">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              Awaiting delivery fulfillment agent
            </div>
          </div>

          <div className="bg-[#161616] rounded-2xl border border-[#262626] p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Teyzix Partners</p>
                <p className="font-display font-black text-white text-3xl mt-1">{agents.length}</p>
              </div>
              <span className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                <Users className="w-5 h-5" />
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-3 pt-3 border-t border-[#262626]">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Verifiable delivery agents network
            </div>
          </div>
        </div>
      )}

      {/* Bento Grid: Warehousing sorting hubs utilization metrics */}
      <div className="bg-[#161616] rounded-2xl border border-[#262626] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#262626] mb-5 gap-3">
          <div>
            <h3 className="font-display font-bold text-white text-base flex items-center gap-1.5">
              <Building className="w-5 h-5 text-emerald-400" id="icon-admin-wh-header" />
              Hub Warehousing capacity distribution levels
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Real-time occupancy calculation mapped directly to weight specifications.</p>
          </div>
          <button
            onClick={() => setShowWhModal(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs px-4.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1 focus:outline-none"
            id="btn-admin-add-hub"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add sorting Hub
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {warehouses.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-6 md:col-span-3">No active storage warehouses deployment.</p>
          ) : (
            warehouses.map(wh => {
              const utilPercent = Math.min(100, Number(((wh.utilizedCapacity / wh.capacity) * 100).toFixed(1)));
              
              const barColor = utilPercent > 85 ? "bg-rose-500" : utilPercent > 55 ? "bg-amber-500" : "bg-emerald-500";

              return (
                <div key={wh.id} className="p-4 bg-[#0D0D0D] border border-[#262626] rounded-xl flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm tracking-tight leading-tight">{wh.name}</h4>
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-1 font-semibold">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      {wh.location}
                    </span>
                  </div>

                  <div className="mt-5 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-semibold">
                      <span className="text-gray-400">Occupancy: {wh.utilizedCapacity} kg / {wh.capacity} kg</span>
                      <span className="font-mono text-white font-bold">{utilPercent}%</span>
                    </div>
                    {/* Visual Progress percentage */}
                    <div className="w-full bg-[#1b1b1b] h-2 rounded-full overflow-hidden">
                      <div className={`${barColor} h-full transition-all duration-500`} style={{ width: `${utilPercent}%` }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main system consignments control ledger */}
      <div className="bg-[#161616] rounded-2xl border border-[#262626] p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-[#262626] gap-4 mb-5">
          <div>
            <h3 className="font-display font-bold text-white text-lg flex items-center gap-1.5">
              <BarChart2 className="w-5 h-5 text-emerald-400" />
              Consolidated cargo shipments ledger
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Control reassignment channels across the entire logistics framework.</p>
          </div>

          {/* Ledger filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search tracking / Names"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0D0D0D] text-white placeholder-gray-550 border border-[#262626] rounded-lg pl-8.5 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0D0D0D] border border-[#262626] rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="created">Booked</option>
              <option value="picked_up">Picked Up</option>
              <option value="in_warehouse">In Warehouse</option>
              <option value="out_for_delivery">Out For Delivery</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>

        {/* ledger list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-sm font-medium">Scanning shipment records...</p>
          </div>
        ) : shipments.length === 0 ? (
          <p className="text-center text-xs text-gray-500 py-12">No records found matching filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Tracking ID</th>
                  <th className="py-2.5 px-3">Sender ➔ Consignee</th>
                  <th className="py-2.5 px-3">Payload (kg)</th>
                  <th className="py-2.5 px-3">Transit Status</th>
                  <th className="py-2.5 px-3">Assigned Agent</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020] text-xs">
                {shipments.map(s => {
                  const assignedAgent = agents.find(ag => ag.id === s.assignedAgentId);
                  
                  return (
                    <tr key={s.id} className="hover:bg-[#202020]/20">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-white">{s.trackingId}</span>
                        <p className="text-[9px] text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="py-3 px-3 w-48 max-w-xs overflow-hidden">
                        <p className="font-semibold text-gray-300">{s.senderDetails.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">➔ {s.receiverDetails.name} ({s.deliveryAddress})</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-gray-400">{s.packageType}</p>
                        <p className="text-[10px] text-gray-500">{s.weight} kg</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded capitalize bg-[#262626] border border-[#262626] ${
                          s.status === 'delivered' ? 'text-emerald-400' :
                          s.status === 'out_for_delivery' ? 'text-indigo-400' :
                          s.status === 'in_warehouse' ? 'text-amber-400' : 'text-gray-300'
                        }`}>
                          {s.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {assignedAgent ? (
                          <span className="text-gray-350 font-semibold text-[11px] block">{assignedAgent.fullName}</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => onSearchTrack(s.trackingId)}
                            className="text-[10px] border border-[#262626] hover:bg-[#262626] px-2 py-1 rounded font-semibold text-gray-300 transition-all cursor-pointer"
                          >
                            Track
                          </button>
                          <button
                            onClick={() => {
                              setSelectShipment(s);
                              setReassignWh(s.warehouseId || "");
                              setReassignAgent(s.assignedAgentId || "");
                            }}
                            className="text-[10px] bg-emerald-500 hover:bg-emerald-400 px-2 py-1 rounded font-extrabold text-black flex items-center gap-0.5 transition-all cursor-pointer"
                          >
                            <Sliders className="w-3 h-3 stroke-[2.5]" />
                            Dispatch
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination numbers */}
            {totalPages > 1 && (
              <div className="flex justify-end gap-2 border-t border-[#262626] pt-3 mt-4">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-2.5 py-1 text-xs border border-[#262626] disabled:bg-[#121212] disabled:text-gray-600 hover:bg-[#262626] text-gray-300 rounded transition-all cursor-pointer"
                >
                  Prev
                </button>
                <span className="text-xs text-gray-550 py-1 font-semibold">{currentPage} / {totalPages}</span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-2.5 py-1 text-xs border border-[#262626] disabled:bg-[#121212] disabled:text-gray-600 hover:bg-[#262626] text-gray-300 rounded transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Warehouse Modal */}
      <AnimatePresence>
        {showWhModal && (
          <div className="fixed inset-0 bg-[#000]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161616] rounded-2xl w-full max-w-md overflow-hidden border border-[#262626]"
            >
              <div className="bg-[#0D0D0D] text-white px-5 py-4 border-b border-[#262626]">
                <h3 className="font-display font-semibold text-base">Register sorting warehouse node</h3>
                <p className="text-[10px] text-gray-400">Expand regional capacity tracking immediately</p>
              </div>

              <form onSubmit={handleCreateWarehouse} className="p-5 space-y-4">
                {whError && (
                  <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs p-3.5 rounded-lg font-medium">
                    {whError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Warehouse Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Peshawar Central Sorting node"
                    value={whName}
                    onChange={(e) => setWhName(e.target.value)}
                    className="w-full bg-[#0D0D0D] text-white placeholder-gray-550 border border-[#262626] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    id="input-wh-name"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Geographical Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ring Road Link, Peshawar"
                    value={whLocation}
                    onChange={(e) => setWhLocation(e.target.value)}
                    className="w-full bg-[#0D0D0D] text-white placeholder-gray-550 border border-[#262626] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    id="input-wh-location"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Max Weight Capacity (kg) *</label>
                  <input
                    type="number"
                    required
                    min="100"
                    placeholder="e.g. 5000"
                    value={whCapacity}
                    onChange={(e) => setWhCapacity(e.target.value)}
                    className="w-full bg-[#0D0D0D] text-white border border-[#262626] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    id="input-wh-capacity"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-[#262626] pt-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowWhModal(false)}
                    className="bg-[#262626] hover:bg-[#333] text-gray-300 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={whLoading}
                    className="bg-emerald-500 hover:bg-emerald-400 text-ack disabled:bg-[#202020] text-black font-extrabold text-xs px-5 py-2 rounded-lg transition-all"
                  >
                    {whLoading ? "Establishing..." : "Deploy Hub Location"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reassign Agent / Warehouse Dialog Drawer Modal */}
      <AnimatePresence>
        {selectShipment && (
          <div className="fixed inset-0 bg-[#000]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161616] rounded-2xl w-full max-w-sm overflow-hidden border border-[#262626]"
            >
              <div className="bg-[#0D0D0D] text-white px-5 py-4 border-b border-[#262626]">
                <h3 className="font-display font-semibold text-base">Consignment Logistics Dispatch Control</h3>
                <p className="text-[10.5px] text-gray-400 mt-0.5">Shipment ID: {selectShipment.trackingId}</p>
              </div>

              <form onSubmit={handleReassign} className="p-5 space-y-4">
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Assigned sorting Hub</label>
                  <select
                    value={reassignWh}
                    onChange={(e) => setReassignWh(e.target.value)}
                    className="w-full bg-[#0D0D0D] text-white border border-[#262626] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="" className="bg-[#161616] text-white">Awaiting Hub Allocation</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id} className="bg-[#161616] text-white">{wh.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Assigned delivery Agent</label>
                  <select
                    value={reassignAgent}
                    onChange={(e) => setReassignAgent(e.target.value)}
                    className="w-full bg-[#0D0D0D] text-white border border-[#262626] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="" className="bg-[#161616] text-white">Awaiting Partner assignment</option>
                    {agents.map(ag => (
                      <option key={ag.id} value={ag.id} className="bg-[#161616] text-white">{ag.fullName} ({ag.email})</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 border-t border-[#262626] pt-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setSelectShipment(null)}
                    className="bg-[#262626] hover:bg-[#333] text-gray-300 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={reassignLoading}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs px-5 py-2 rounded-lg transition-all"
                    id="btn-confirm-reassign"
                  >
                    {reassignLoading ? "Saving..." : "Commit dispatch changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
