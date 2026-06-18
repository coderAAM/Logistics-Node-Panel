import React, { useState } from "react";
import { Search, Package, MapPin, Calendar, Clock, ArrowRight, UserCheck, CheckCircle2, ChevronRight, CornerDownRight } from "lucide-react";
import { motion } from "motion/react";
import { Shipment, TrackingLog } from "../types.js";

interface PublicTrackingProps {
  onSearchTrack?: (trackingId: string) => void;
}

export default function PublicTracking({ onSearchTrack }: PublicTrackingProps) {
  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ shipment: Shipment; history: TrackingLog[]; warehouse?: any } | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/shipments/track/${trackingId.trim()}`);
      if (!res.ok) {
        throw new Error(res.status === 404 ? "Tracking ID not found in database registry. Try TZ-492810 or TZ-910283." : "An error occurred while retrieving tracking details.");
      }
      const data = await res.json();
      setResult(data);
      if (onSearchTrack) {
        onSearchTrack(trackingId.trim());
      }
    } catch (err: any) {
      setError(err.message || "Failed to search shipment state");
    } finally {
      setLoading(false);
    }
  };

  const statusWorkflow = [
    { key: "created", label: "Booked", description: "Shipment registered" },
    { key: "picked_up", label: "Picked Up", description: "In-transit to hub" },
    { key: "in_warehouse", label: "In Warehouse", description: "Processed at hub" },
    { key: "out_for_delivery", label: "Out For Delivery", description: "Dispatched locally" },
    { key: "delivered", label: "Delivered", description: "Signed & closed" }
  ];

  const getStatusIndex = (currentStatus: string) => {
    return statusWorkflow.findIndex(step => step.key === currentStatus);
  };

  const activeIndex = result ? getStatusIndex(result.shipment.status) : -1;

  return (
    <div className="bg-[#161616] rounded-2xl border border-[#262626] p-6 md:p-8">
      <div className="max-w-2xl mx-auto text-center mb-8">
        <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
          <Package className="w-6 h-6 text-emerald-400" id="icon-public-package" />
          Real-Time Shipment Tracking Portal
        </h2>
        <p className="text-sm text-gray-400 mt-2">
          Track packages instantaneously without registration. Enter any valid booking number (e.g. <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded text-xs font-semibold">TZ-492810</span> or <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded text-xs font-semibold">TZ-910283</span>).
        </p>
      </div>

      <form onSubmit={handleTrack} className="max-w-xl mx-auto flex gap-2 mb-8" id="form-public-track">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" id="icon-public-search" />
          <input
            type="text"
            placeholder="Enter Tracking ID (e.g. TZ-492810)"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            className="w-full bg-[#0D0D0D] text-white placeholder-gray-500 border border-[#262626] rounded-xl pl-10 pr-4 py-3 text-sm font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500"
            id="input-public-tracking-id"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-[#202020] disabled:text-gray-500 text-black font-extrabold px-6 py-3 rounded-xl transition-all text-sm flex items-center gap-1.5 shrink-0"
          id="btn-public-track-submit"
        >
          {loading ? "Searching..." : "Track Now"}
          <ArrowRight className="w-4 h-4" id="icon-arrow-right-track" />
        </button>
      </form>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 text-rose-400 text-sm flex items-start gap-2.5 mb-2"
          id="block-error-track"
        >
          <span className="font-bold text-base mt-px">⚠️</span>
          <div>
            <p className="font-medium">Lookup Unsuccessful</p>
            <p className="text-rose-400/90 text-xs mt-0.5">{error}</p>
          </div>
        </motion.div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 md:space-y-8"
          id="block-tracking-container"
        >
          {/* Card Summary info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0D0D0D] rounded-xl p-5 border border-[#262626]">
            <div>
              <p className="text-xs text-gray-550 font-medium uppercase tracking-wider">Tracking ID</p>
              <p className="font-mono font-bold text-white text-lg">{result.shipment.trackingId}</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 mt-1.5 capitalize">
                {result.shipment.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-550 font-medium uppercase tracking-wider">Destination Address</p>
              <p className="text-sm font-semibold text-gray-300 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                {result.shipment.deliveryAddress}
              </p>
              <p className="text-xs text-gray-400 mt-1">Package Type: {result.shipment.packageType} ({result.shipment.weight} kg)</p>
            </div>
            <div>
              <p className="text-xs text-gray-550 font-medium uppercase tracking-wider">Current Location</p>
              <p className="text-sm font-semibold text-gray-300 mt-1">
                {result.warehouse ? result.warehouse.name : "Sorting In-Transit"}
              </p>
              <p className="text-xs text-gray-400 mt-1">Booked on: {new Date(result.shipment.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Workflow progress line */}
          <div className="overflow-x-auto pb-4">
            <div className="min-w-[640px] flex justify-between items-center relative px-2">
              <div className="absolute left-10 right-10 h-0.5 bg-[#262626] top-5 -z-10" />
              <div 
                className="absolute left-10 h-0.5 bg-emerald-500 top-5 -z-10 transition-all duration-500" 
                style={{ width: `${(activeIndex / (statusWorkflow.length - 1)) * 100}%` }}
              />
              
              {statusWorkflow.map((step, idx) => {
                const isPassed = idx <= activeIndex;
                const isCurrent = idx === activeIndex;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center w-24">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        isPassed 
                          ? "bg-emerald-500 border-emerald-500 text-black font-extrabold shadow-sm shadow-emerald-500/20" 
                          : "bg-[#0D0D0D] border-[#262626] text-gray-500"
                      } ${isCurrent ? "ring-4 ring-emerald-500/20" : ""}`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="w-5 h-5 text-black stroke-[3]" />
                      ) : (
                        <span className="text-xs font-bold">{idx + 1}</span>
                      )}
                    </div>
                    <p className={`text-xs font-bold mt-2 ${isPassed ? "text-white" : "text-gray-500"}`}>{step.label}</p>
                    <p className="text-[10px] text-gray-450 mt-0.5 leading-tight">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed timeline and proof of delivery */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-12">
              <h3 className="font-display font-bold text-white text-sm tracking-wider uppercase mb-4 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                Detailed Consignment Tracking History Logs
              </h3>

              <div className="relative pl-6 border-l border-[#262626] space-y-5">
                {result.history.map((log, idx) => {
                  const isLatest = idx === result.history.length - 1;
                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={log.id} 
                      className="relative"
                    >
                      {/* Circle Indicator on the line */}
                      <span className={`absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full border-2 bg-[#161616] flex items-center justify-center ${
                        isLatest ? "border-emerald-500 scale-110" : "border-[#262626]"
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isLatest ? "bg-emerald-500 animate-pulse" : "bg-[#333]"}`} />
                      </span>

                      <div>
                        <div className="flex flex-wrap items-center gap-x-2">
                          <span className="text-xs font-bold text-white font-display">
                            {log.status.toUpperCase().replace('_', ' ')}
                          </span>
                          <span className="text-[10px] bg-[#262626] text-emerald-400 border border-[#262626] px-1.5 py-0.5 rounded font-mono">
                            {log.actorName}
                          </span>
                          <span className="text-[10px] text-gray-500 ml-auto flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mt-1 flex items-start gap-1 leading-relaxed decoration-emerald-800">
                          <CornerDownRight className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                          {log.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Delivery Proof Card */}
              {result.shipment.status === 'delivered' && result.shipment.deliveryProof && (
                <div className="mt-6 bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 flex items-start gap-3">
                  <UserCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" id="icon-proof-user" />
                  <div>
                    <h4 className="font-semibold text-emerald-400 text-sm">Delivery Audit Verification (Proof of Delivery)</h4>
                    <p className="text-emerald-300/90 text-xs mt-1 font-mono italic">
                      "{result.shipment.deliveryProof}"
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-500/80">
                      <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      Audited Securely against Teyzix core logistics standards
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
