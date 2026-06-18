import React, { useState } from "react";
import { Play, Code, CheckCircle, Database, AlertCircle, RefreshCw, Key, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  summary: string;
  description: string;
  requiresAuth: boolean;
  defaultPayload?: string;
  rolesScope?: string[];
}

export default function ApiExplorer() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [responseCode, setResponseCode] = useState<number | null>(null);
  const [responsePayload, setResponsePayload] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [customBody, setCustomBody] = useState<string>("");
  const [customPathParams, setCustomPathParams] = useState<string>("");

  const endpoints: ApiEndpoint[] = [
    {
      method: "POST",
      path: "/api/auth/register",
      summary: "Register new user account",
      description: "Registers a new user inside the database with Role-Based Access controls (default: customer). Password is automatically hashed using bcryptjs.",
      requiresAuth: false,
      defaultPayload: JSON.stringify({
        email: `tester_${Math.floor(100 + Math.random() * 900)}@teyzix.com`,
        password: "password123",
        fullName: "Test Logistics User",
        role: "customer"
      }, null, 2)
    },
    {
      method: "POST",
      path: "/api/auth/login",
      summary: "User Login & Retrieve Session JWT Token",
      description: "Authenticates credentials and returns a secure JWT access token signed by the Teyzix backend.",
      requiresAuth: false,
      defaultPayload: JSON.stringify({
        email: "customer@teyzix.com",
        password: "customer123"
      }, null, 2)
    },
    {
      method: "GET",
      path: "/api/shipments",
      summary: "Search, filter, and paginate booked shipments list",
      description: "Fetches shipments list scoped to the logged-in user. Admins see all, Agents see assigned and unassigned, Customers see only their own bookings. Supports optional query parameters: ?search=TZ&status=created&page=1&limit=5",
      requiresAuth: true,
      rolesScope: ["customer", "agent", "admin"]
    },
    {
      method: "POST",
      path: "/api/shipments",
      summary: "Book an express freight shipment",
      description: "Books a physical cargo package for warehousing and transit. Automatically maps the package to the optimal warehouse based on calculated weight and volume capacity levels.",
      requiresAuth: true,
      rolesScope: ["customer", "admin"],
      defaultPayload: JSON.stringify({
        senderName: "Hassan Ali",
        senderPhone: "+92 300 1234567",
        senderAddress: "DHA Phase 6, Karachi",
        receiverName: "Zainab Yusuf",
        receiverPhone: "+92 345 5432101",
        receiverAddress: "F-11 Markaz, Islamabad",
        packageType: "Gift & Apparel",
        weight: 4.8,
        deliveryAddress: "F-11 Markaz, Islamabad, Pakistan"
      }, null, 2)
    },
    {
      method: "GET",
      path: "/api/shipments/track/:trackingId",
      summary: "Public tracking log verification",
      description: "Extracts physical transit histories (tracking status workflow timeline logs) directly. No JWT credentials required so consumers can check from bookmarks.",
      requiresAuth: false
    },
    {
      method: "PUT",
      path: "/api/shipments/:id/status",
      summary: "Update consignment status workflow block",
      description: "Transitions shipment status following strict workflows. Updates warehouse remaining volumes. (Requires Customer, Agent, or Admin authentication)",
      requiresAuth: true,
      rolesScope: ["agent", "admin"],
      defaultPayload: JSON.stringify({
        status: "picked_up",
        remarks: "Package sorted by agent at Saddar collection branch.",
        deliveryProof: "Recipient Waseem checked cargo label. Certified."
      }, null, 2)
    },
    {
      method: "GET",
      path: "/api/warehouses",
      summary: "Retrieve sorting centers capacities",
      description: "Provides listing, maximum physical payload ratings, current utilized metrics, and occupancy percentages.",
      requiresAuth: true,
      rolesScope: ["admin", "customer", "agent"]
    },
    {
      method: "GET",
      path: "/api/reports/stats",
      summary: "Retrieve admin business analytics dashboard logs",
      description: "Consolidates key operating business indicators: daily shipment totals, pending deliveries, sorting hubs capacities, and overall logistics speed performance charts.",
      requiresAuth: true,
      rolesScope: ["admin"]
    }
  ];

  const handleExecute = async () => {
    setLoading(true);
    setResponseCode(null);
    setResponsePayload("");

    const ep = endpoints[activeTab];
    let fetchPath = ep.path;

    // Substitute path params if needed
    if (ep.path.includes(":trackingId")) {
      const trackingValue = customPathParams.trim() || "TZ-492810";
      fetchPath = ep.path.replace(":trackingId", trackingValue);
    } else if (ep.path.includes(":id")) {
      const idValue = customPathParams.trim() || "shp_1";
      fetchPath = ep.path.replace(":id", idValue);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    // Append current JWT token if saved in localStorage
    const savedToken = localStorage.getItem("teyzix_token");
    if (ep.requiresAuth && savedToken) {
      headers["Authorization"] = `Bearer ${savedToken}`;
    }

    const options: RequestInit = {
      method: ep.method,
      headers
    };

    if (ep.method !== "GET" && customBody) {
      options.body = customBody;
    }

    try {
      const res = await fetch(fetchPath, options);
      setResponseCode(res.status);
      const data = await res.json();
      setResponsePayload(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResponseCode(500);
      setResponsePayload(JSON.stringify({ error: "Failed to communicate with API server.", details: err.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTab = (idx: number) => {
    setActiveTab(idx);
    setResponseCode(null);
    setResponsePayload("");
    setCustomBody(endpoints[idx].defaultPayload || "");
    if (endpoints[idx].path.includes(":trackingId")) {
      setCustomPathParams("TZ-492810");
    } else if (endpoints[idx].path.includes(":id")) {
      setCustomPathParams("shp_1");
    } else {
      setCustomPathParams("");
    }
  };

  // Initialize custom fields on first load
  React.useEffect(() => {
    setCustomBody(endpoints[0].defaultPayload || "");
  }, []);

  const activeEp = endpoints[activeTab];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#161616] rounded-2xl border border-[#262626] p-5 md:p-6">
      <div className="lg:col-span-12 flex justify-between items-center border-b border-[#262626] pb-4">
        <div>
          <h2 className="font-display font-semibold text-lg text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            Interactive Swagger API Client
          </h2>
          <p className="text-xs text-gray-400">
            View API specifications and execute real live requests against our active Express.js backend.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1 bg-[#262626] text-emerald-400 border border-[#262626] rounded-lg px-2.5 py-1 text-[10px] font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          JWT Bearer Auth: ACTIVE
        </div>
      </div>

      <div className="lg:col-span-4 space-y-2 max-h-[500px] overflow-y-auto pr-2">
        {endpoints.map((ep, idx) => {
          const isSelected = activeTab === idx;
          const methodColors = {
            GET: "bg-teal-500/10 border border-teal-500/25 text-teal-400",
            POST: "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400",
            PUT: "bg-amber-500/10 border border-amber-500/25 text-amber-400",
            DELETE: "bg-rose-500/10 border border-rose-500/25 text-rose-400"
          }[ep.method];

          return (
            <button
              key={idx}
              onClick={() => handleSelectTab(idx)}
              className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 focus:outline-none ${
                isSelected 
                  ? "bg-[#262626] border-emerald-500 text-white" 
                  : "bg-[#0D0D0D] hover:bg-[#202020] border-[#262626]"
              }`}
              id={`api-btn-${idx}`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${methodColors}`}>
                  {ep.method}
                </span>
                <span className="font-mono text-[11px] font-bold text-gray-300 overflow-ellipsis overflow-hidden whitespace-nowrap">
                  {ep.path}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium line-clamp-1">{ep.summary}</p>
            </button>
          );
        })}
      </div>

      <div className="lg:col-span-8 flex flex-col gap-4 bg-[#0D0D0D] rounded-xl border border-[#262626] p-5">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-gray-500">Path Spec Block</span>
            {activeEp.requiresAuth && (
              <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[10px] px-2 py-0.5 rounded font-medium">
                <Key className="w-3 h-3 text-amber-400" />
                Requires JWT Auth ({activeEp.rolesScope?.join(', ')})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 bg-[#161616] p-2.5 rounded-lg border border-[#262626]">
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
              activeEp.method === 'GET' ? 'bg-teal-500/15 text-teal-400 border-teal-500/25' :
              activeEp.method === 'POST' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' :
              activeEp.method === 'PUT' ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' : 'bg-rose-500/15 text-rose-400 border-rose-500/25'
            }`}>
              {activeEp.method}
            </span>
            <span className="font-mono font-bold text-white text-sm">{activeEp.path}</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed mt-2.5 font-sans font-medium">
            {activeEp.description}
          </p>
        </div>

        {/* Path parameters placeholder value */}
        {(activeEp.path.includes(":trackingId") || activeEp.path.includes(":id")) && (
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              Path Variable Value ({activeEp.path.includes(":trackingId") ? "trackingId" : "id"})
            </label>
            <input
              type="text"
              value={customPathParams}
              onChange={(e) => setCustomPathParams(e.target.value)}
              className="w-full bg-[#161616] text-white placeholder-gray-500 border border-[#262626] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              id="input-api-path-param"
            />
          </div>
        )}

        {/* Request Payload inputs */}
        {activeEp.method !== "GET" && (
          <div className="space-y-1.5 flex-1 flex flex-col">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              Request JSON Payload Body
            </label>
            <textarea
              rows={4}
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              className="w-full flex-1 bg-[#161616] text-white border border-[#262626] rounded-lg p-3 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              id="input-api-payload-body"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[#262626] pt-3">
          <button
            onClick={handleExecute}
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-[#202020] disabled:text-gray-500 text-black font-extrabold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all focus:outline-none"
            id="btn-api-execute"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Send Request Test
          </button>
        </div>

        {/* Live response block */}
        {(responseCode !== null || responsePayload) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1.5 mt-3 border-t border-[#262626] pt-3"
            id="block-api-response"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">API Execution Response</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono border ${
                  responseCode && responseCode >= 200 && responseCode < 300 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}>
                  Status: {responseCode}
                </span>
              </div>
            </div>
            
            <pre className="p-3.5 bg-[#0D0D0D] text-emerald-400 font-mono text-[11px] rounded-lg border border-[#262626] max-h-[180px] overflow-y-auto leading-relaxed">
              <code>{responsePayload || "{}"}</code>
            </pre>
          </motion.div>
        )}
      </div>
    </div>
  );
}
