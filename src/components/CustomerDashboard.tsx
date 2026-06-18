import React, { useState, useEffect } from "react";
import { Package, Plus, Calculator, ChevronRight, FileText, ShoppingBag, MapPin, Search } from "lucide-react";
import { Shipment, TrackingLog } from "../types.js";
import { motion, AnimatePresence } from "motion/react";

interface CustomerDashboardProps {
  onSearchTrack: (id: string) => void;
}

export default function CustomerDashboard({ onSearchTrack }: CustomerDashboardProps) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Booking Form State fields
  const [senderName, setSenderName] = useState("Hassan Ali");
  const [senderPhone, setSenderPhone] = useState("+92 300 1234567");
  const [senderAddress, setSenderAddress] = useState("DHA Phase 6, Karachi");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [packageType, setPackageType] = useState("Electronics");
  const [weight, setWeight] = useState("1.5");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Live price estimation logic
  const calculatedFreight = Number((150 + parseFloat(weight || "0") * 20).toFixed(2));

  const fetchCustomerShipments = async () => {
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
      console.error("Failed to load customer shipments", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(false);

    const token = localStorage.getItem("teyzix_token");
    if (!token) return;

    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          senderName, senderPhone, senderAddress,
          receiverName, receiverPhone, receiverAddress,
          packageType, weight: parseFloat(weight), deliveryAddress
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create shipment reservation.");
      }

      setBookingSuccess(true);
      // Reset non-static fields
      setReceiverName("");
      setReceiverPhone("");
      setReceiverAddress("");
      setDeliveryAddress("");
      setWeight("1.5");
      
      // Reload lists
      fetchCustomerShipments();
      
      // Auto close after delayed success notification
      setTimeout(() => {
        setShowBookingModal(false);
        setBookingSuccess(false);
      }, 1800);

    } catch (err: any) {
      setBookingError(err.message || "An error occurred.");
    } finally {
      setBookingLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerShipments();
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "created": return "bg-[#262626] text-gray-300 border-[#262626]";
      case "picked_up": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "in_warehouse": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "out_for_delivery": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "delivered": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default: return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] rounded-2xl p-6 text-white border border-[#262626]">
        <div>
          <h2 className="font-display font-extrabold text-2xl tracking-tight">Assalam-o-Alaikum, Hassan!</h2>
          <p className="text-gray-400 text-sm mt-1">
            Book or track your consignments and monitor sorting centers locations.
          </p>
        </div>
        <button
          onClick={() => setShowBookingModal(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm px-5 py-3 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 focus:outline-none self-start md:self-auto"
          id="btn-customer-new-booking"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          Book New Shipment
        </button>
      </div>

      {/* Shipment Inventory table */}
      <div className="bg-[#161616] rounded-2xl border border-[#262626] p-5">
        <div className="flex items-center justify-between pb-4 border-b border-[#262626] mb-5">
          <h3 className="font-display font-bold text-white text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" id="icon-heading-shopping" />
            Your Registered Consignments Bookings
          </h3>
          <span className="text-xs bg-[#262626] text-gray-400 px-2.5 py-1 rounded-full font-semibold">
            Count: {shipments.length}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-sm font-medium">Loading your logistics orders...</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#262626] rounded-2xl">
            <Package className="w-12 h-12 text-gray-650 mx-auto mb-3" />
            <p className="text-gray-300 font-semibold">No Bookings Found</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              You haven't booked any packages in this session. Tap the green 'Book New Shipment' button above to register.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#202020]">
            {shipments.map((s) => (
              <div 
                key={s.id} 
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-white text-base group-hover:text-emerald-400 transition-all">
                      {s.trackingId}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(s.status)}`}>
                      {s.status.replace("_", " ")}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                      Type: {s.packageType} ({s.weight} kg)
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      Deliver to: {s.receiverDetails.name} ({s.deliveryAddress})
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t border-[#262626] md:border-t-0 pt-2.5 md:pt-0">
                  <div className="text-left md:text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Logistics dues</p>
                    <p className="font-mono text-sm font-bold text-white">PKR {s.cost.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => onSearchTrack(s.trackingId)}
                    className="border border-[#262626] hover:bg-[#262626] text-gray-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 focus:outline-none"
                    id={`btn-customer-track-${s.trackingId}`}
                  >
                    Track Live
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Form Overlay Modal Dialog */}
      <AnimatePresence>
        {showBookingModal && (
          <div className="fixed inset-0 bg-[#000]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161616] rounded-2xl w-full max-w-2xl overflow-hidden border border-[#262626] flex flex-col max-h-[90vh]"
              id="box-customer-booking-modal"
            >
              {/* Modal header */}
              <div className="flex justify-between items-center bg-[#0D0D0D] text-white px-6 py-4 border-b border-[#262626]">
                <div>
                  <h3 className="font-display font-bold text-lg">Consignment Hub Reservation Form</h3>
                  <p className="text-[11px] text-emerald-400">Register a shipment securely with dynamic cargo logistics</p>
                </div>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-gray-400 hover:text-white hover:bg-[#262626] rounded-lg p-1.5 transition-all text-sm focus:outline-none"
                >
                  ✕
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleCreateShipment} className="p-6 overflow-y-auto space-y-5 flex-1" id="form-create-shipment">
                {bookingSuccess ? (
                  <motion.div 
                    initial={{ scale: 0.9 }} 
                    animate={{ scale: 1 }} 
                    className="text-center py-8 space-y-2"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto text-emerald-400 border border-emerald-500/25">
                      ✓
                    </div>
                    <h4 className="font-bold text-white text-lg">Parcel Registered Successfully</h4>
                    <p className="text-xs text-gray-400">Redirecting to monitoring boards...</p>
                  </motion.div>
                ) : (
                  <>
                    {bookingError && (
                      <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs p-3.5 rounded-xl">
                        {bookingError}
                      </div>
                    )}

                    {/* Sender and receiver grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Sender block */}
                      <div className="space-y-4 bg-[#0D0D0D] p-4 rounded-xl border border-[#262626]">
                        <h4 className="font-semibold text-xs text-gray-400 uppercase tracking-wider block border-b border-[#262626] pb-1">Sender details (Hassan Profile)</h4>
                        
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Sender Name</label>
                          <input 
                            type="text" 
                            disabled 
                            value={senderName} 
                            className="w-full bg-[#161616]/60 text-gray-450 border border-[#262626] rounded-lg px-3 py-1.5 text-xs font-medium"
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Sender Phone</label>
                            <input 
                              type="text" 
                              disabled 
                              value={senderPhone} 
                              className="w-full bg-[#161616]/60 text-gray-450 border border-[#262626] rounded-lg px-3 py-1.5 text-xs font-medium"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Sender Address</label>
                          <textarea 
                            rows={2} 
                            disabled 
                            value={senderAddress} 
                            className="w-full bg-[#161616]/60 text-gray-450 border border-[#262626] rounded-lg p-2 text-xs font-medium resize-none"
                          />
                        </div>
                      </div>

                      {/* Receiver block */}
                      <div className="space-y-4 bg-[#0D0D0D] p-4 rounded-xl border border-[#262626]">
                        <h4 className="font-semibold text-xs text-gray-400 uppercase tracking-wider block border-b border-[#262626] pb-1">Receiver details (Consignee)</h4>
                        
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Receiver Name *</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="Full name of receiver"
                            value={receiverName} 
                            onChange={(e) => setReceiverName(e.target.value)}
                            className="w-full bg-[#161616] text-white placeholder-gray-505 border border-[#262626] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            id="input-receiver-name"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Receiver Phone *</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="+92 3XX XXXXXXX"
                            value={receiverPhone} 
                            onChange={(e) => setReceiverPhone(e.target.value)}
                            className="w-full bg-[#161616] text-white placeholder-gray-505 border border-[#262626] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            id="input-receiver-phone"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Receiver Address *</label>
                          <textarea 
                            rows={2} 
                            required 
                            placeholder="Street, Block and Area"
                            value={receiverAddress} 
                            onChange={(e) => setReceiverAddress(e.target.value)}
                            className="w-full bg-[#161616] text-white placeholder-gray-505 border border-[#262626] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                            id="input-receiver-address"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cargo weight and calculation details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-4 bg-[#0D0D0D] p-4 rounded-xl border border-[#262626]">
                        <h4 className="font-semibold text-xs text-gray-400 uppercase tracking-wider block border-b border-[#262626] pb-1">Cargo description</h4>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Package Type</label>
                            <select 
                              value={packageType} 
                              onChange={(e) => setPackageType(e.target.value)}
                              className="w-full bg-[#161616] text-white border border-[#262626] rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                            >
                              <option value="Electronics" className="bg-[#161616] text-white">Electronics</option>
                              <option value="Documents" className="bg-[#161616] text-white">Documents</option>
                              <option value="Apparel & Garments" className="bg-[#161616] text-white">Apparel & Garments</option>
                              <option value="Perishables" className="bg-[#161616] text-white">Perishables</option>
                              <option value="Fragile Items" className="bg-[#161616] text-white">Fragile Items</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Weight (kg) *</label>
                            <input 
                              type="number" 
                              step="0.1" 
                              min="0.1"
                              required 
                              value={weight} 
                              onChange={(e) => setWeight(e.target.value)}
                              className="w-full bg-[#161616] text-white border border-[#262626] rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                              id="input-cargo-weight"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Delivery Address *</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="Complete destination city and state"
                            value={deliveryAddress} 
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            className="w-full bg-[#161616] text-white placeholder-gray-505 border border-[#262626] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            id="input-delivery-address"
                          />
                        </div>
                      </div>

                      {/* Fare details and real-time calculator */}
                      <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 flex flex-col justify-between">
                        <div>
                          <span className="font-display font-semibold text-xs text-gray-300 uppercase tracking-wide flex items-center gap-1">
                            <Calculator className="w-4 h-4 text-emerald-400" />
                            Live Freight Calculator
                          </span>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Formula: PKR 150 base handling + PKR 20 per kilogram freight fee. Handled by scheduled Regional Distribution Nodes.
                          </p>

                          <div className="space-y-2 mt-4 text-xs">
                            <div className="flex justify-between border-b border-[#262626] pb-1 text-gray-400">
                              <span>Base Freight handling</span>
                              <span className="font-mono">PKR 150.00</span>
                            </div>
                            <div className="flex justify-between border-b border-[#262626] pb-1 text-gray-400">
                              <span>Weight Freight ({weight} kg x 20)</span>
                              <span className="font-mono">PKR {(parseFloat(weight || "0") * 20).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#262626] pt-3 mt-4">
                          <span className="text-sm font-bold text-white">Total Due Estimate</span>
                          <span className="font-mono font-extrabold text-emerald-400 text-lg">
                            PKR {calculatedFreight.toLocaleString()}
                          </span>
                        </div>
                      </div>

                    </div>

                    <div className="flex justify-end gap-2 border-t border-[#262626] pt-4">
                      <button
                        type="button"
                        onClick={() => setShowBookingModal(false)}
                        className="bg-[#262626] hover:bg-[#333] text-gray-300 text-xs font-semibold px-4 py-2.5 rounded-lg focus:outline-none"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={bookingLoading}
                        className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-[#202020] disabled:text-gray-500 text-black font-extrabold text-xs px-5 py-2.5 rounded-lg flex items-center gap-1 focus:outline-none"
                        id="btn-confirm-booking-payload"
                      >
                        {bookingLoading ? "Registering..." : "Confirm & Save Booking"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
