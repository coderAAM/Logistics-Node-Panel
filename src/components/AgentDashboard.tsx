import React, { useState, useEffect } from "react";
import { Truck, CheckSquare, ClipboardList, PenTool, ClipboardCheck, ArrowRight, UserCheck } from "lucide-react";
import { Shipment, ShipmentStatus } from "../types.js";
import { motion, AnimatePresence } from "motion/react";

interface AgentDashboardProps {
  onSearchTrack: (id: string) => void;
}

export default function AgentDashboard({ onSearchTrack }: AgentDashboardProps) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"assigned" | "unassigned">("assigned");

  // Selection state for state change
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [nextStatus, setNextStatus] = useState<ShipmentStatus>("picked_up");
  const [remarks, setRemarks] = useState("");
  const [deliveryProof, setDeliveryProof] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const fetchAgentShipments = async () => {
    setLoading(true);
    const token = localStorage.getItem("teyzix_token");
    if (!token) return;

    try {
      const res = await fetch("/api/shipments", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setShipments(data.shipments || []);
      }
    } catch (err) {
      console.error("Failed to load agent workloads", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    setUpdating(true);
    setUpdateError(null);

    const token = localStorage.getItem("teyzix_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/shipments/${selectedShipment.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: nextStatus,
          remarks: remarks.trim() || undefined,
          deliveryProof: nextStatus === "delivered" ? (deliveryProof.trim() || undefined) : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update shipment logistics status.");
      }

      // Reset
      setSelectedShipment(null);
      setRemarks("");
      setDeliveryProof("");
      fetchAgentShipments();
    } catch (err: any) {
      setUpdateError(err.message || "An error occurred.");
    } finally {
      setUpdating(false);
    }
  };

  // Quick self-assignment for unassigned parcels
  const handleClaimShipment = async (shp: Shipment) => {
    const token = localStorage.getItem("teyzix_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/shipments/${shp.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: shp.status, // KEEP current, but since agent is calling it, server assigns agent!
          remarks: `Shipment claimed by delivery agent Zeeshan Khan.`
        })
      });

      if (res.ok) {
        fetchAgentShipments();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to claim shipment.");
      }
    } catch (err) {
      console.error("Could not claim package", err);
    }
  };

  useEffect(() => {
    fetchAgentShipments();
  }, [activeTab]);

  const assignedShipments = shipments.filter(s => s.assignedAgentId === "usr_agent_1");
  const availableShipments = shipments.filter(s => !s.assignedAgentId && (s.status === 'created' || s.status === 'picked_up'));

  const getStatusTransitions = (status: ShipmentStatus): ShipmentStatus[] => {
    switch (status) {
      case "created": return ["picked_up"];
      case "picked_up": return ["in_warehouse", "out_for_delivery"];
      case "in_warehouse": return ["out_for_delivery"];
      case "out_for_delivery": return ["delivered", "in_warehouse"];
      default: return [];
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Overview stats block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#161616] rounded-2xl border border-[#262626] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Your Assigned Workloads</p>
            <p className="font-display font-extrabold text-white text-2xl">{assignedShipments.length} parcels</p>
          </div>
        </div>
        <div className="bg-[#161616] rounded-2xl border border-[#262626] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Undispatched Cargo in network</p>
            <p className="font-display font-extrabold text-white text-2xl">{availableShipments.length} awaiting</p>
          </div>
        </div>
        <div className="bg-[#161616] rounded-2xl border border-[#262626] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Personal completed deliveries</p>
            <p className="font-display font-extrabold text-white text-2xl">
              {assignedShipments.filter(s => s.status === 'delivered').length} parcels
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar selection */}
      <div className="flex border-b border-[#262626]">
        <button
          onClick={() => setActiveTab("assigned")}
          className={`px-5 py-3 text-xs font-semibold focus:outline-none tracking-wide flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'assigned' 
              ? 'border-emerald-500 text-emerald-400 font-bold' 
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
          id="btn-agent-tab-assigned"
        >
          My Assignments ({assignedShipments.length})
        </button>
        <button
          onClick={() => setActiveTab("unassigned")}
          className={`px-5 py-3 text-xs font-semibold focus:outline-none tracking-wide flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'unassigned' 
              ? 'border-emerald-500 text-emerald-400 font-bold' 
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
          id="btn-agent-tab-unassigned"
        >
          All Available network shipments ({availableShipments.length})
        </button>
      </div>

      <div className="bg-[#161616] border border-[#262626] rounded-2xl p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-sm font-medium">Reading courier dispatch books...</p>
          </div>
        ) : activeTab === 'assigned' ? (
          assignedShipments.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="w-12 h-12 text-gray-650 mx-auto mb-3" />
              <p className="text-gray-300 font-semibold">Clean Deliveries Sheet</p>
              <p className="text-xs text-gray-500 mt-1">You do not have any physical shipments assigned right now. You can claim parcels from the network grid tab.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#202020]">
              {assignedShipments.map(s => (
                <div key={s.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">{s.trackingId}</span>
                      <span className="text-[10px] bg-[#262626] text-gray-400 border border-[#262626] font-bold px-2 py-0.5 rounded capitalize">
                        {s.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1 font-semibold">Recipient: {s.receiverDetails.name} ({s.receiverDetails.phone})</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Route: {s.senderDetails.address} ➔ {s.deliveryAddress}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => onSearchTrack(s.trackingId)}
                      className="text-gray-300 bg-[#262626] border border-[#262626] text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#333] transition-all font-sans"
                    >
                      Audit Log
                    </button>
                    {s.status !== 'delivered' && (
                      <button
                        onClick={() => {
                          setSelectedShipment(s);
                          const transitions = getStatusTransitions(s.status);
                          if (transitions.length > 0) setNextStatus(transitions[0]);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all"
                        id={`btn-agent-update-${s.trackingId}`}
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        Update Status
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          availableShipments.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="w-12 h-12 text-gray-650 mx-auto mb-3" />
              <p className="text-gray-300 font-semibold">No Network Shipments</p>
              <p className="text-xs text-gray-500 mt-1">There are no unassigned packages awaiting courier picking operations.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#202020]">
              {availableShipments.map(s => (
                <div key={s.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">{s.trackingId}</span>
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded capitalize">
                        Status: {s.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1 font-semibold">Destination City: {s.deliveryAddress}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Payload details: {s.packageType} ({s.weight} kg)</p>
                  </div>
                  <button
                    onClick={() => handleClaimShipment(s)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs px-4 py-2 rounded-lg transition-all shrink-0 self-end md:self-center font-display"
                    id={`btn-agent-claim-${s.trackingId}`}
                  >
                    Self-Assign Parcel
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Update logistics actions modal */}
      <AnimatePresence>
        {selectedShipment && (
          <div className="fixed inset-0 bg-[#000]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161616] rounded-2xl w-full max-w-md overflow-hidden border border-[#262626]"
              id="box-agent-update-modal"
            >
              <div className="bg-[#0D0D0D] text-white px-5 py-4 border-b border-[#262626]">
                <h3 className="font-display font-semibold text-base">Modify Shipment Operations State</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Transition parcel {selectedShipment.trackingId} safely</p>
              </div>

              <form onSubmit={handleUpdateStatus} className="p-5 space-y-4">
                {updateError && (
                  <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs p-3.5 rounded-lg">
                    {updateError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Current Logistics Status</label>
                  <p className="text-xs font-mono font-bold text-white bg-[#0D0D0D] border border-[#262626] rounded px-2.5 py-1.5 capitalize">
                    {selectedShipment.status.replace('_', ' ')}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Target Logistics Status (Next State)</label>
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as ShipmentStatus)}
                    className="w-full bg-[#0D0D0D] text-white border border-[#262626] rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {getStatusTransitions(selectedShipment.status).map(status => (
                      <option key={status} value={status} className="capitalize bg-[#0D0D0D] text-white">
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Operational update Remarks *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Received cargo safely or Dispatched on flight..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-[#0D0D0D] text-white border border-[#262626] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    id="input-update-remarks"
                  />
                </div>

                {/* Delivery proof required if Status is 'delivered' */}
                {nextStatus === "delivered" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-1 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/15"
                  >
                    <label className="block text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      Recipient Signature / Delivery Proof *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Signed by Maryum Fahad, receiver verified."
                      value={deliveryProof}
                      onChange={(e) => setDeliveryProof(e.target.value)}
                      className="w-full bg-[#0D0D0D] text-white placeholder-gray-550 border border-[#262626] rounded-lg p-2 text-xs focus:outline-none"
                      id="input-delivery-proof"
                    />
                  </motion.div>
                )}

                <div className="flex justify-end gap-2 border-t border-[#262626] pt-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedShipment(null)}
                    className="bg-[#262626] hover:bg-[#333] text-gray-300 text-xs font-semibold px-4 py-2 rounded-lg"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs px-5 py-2 rounded-lg shadow-sm"
                    id="btn-confirm-agent-status"
                  >
                    {updating ? "Processing..." : "Publish Progress Update"}
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
