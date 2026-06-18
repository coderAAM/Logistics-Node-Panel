import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import { 
  User, 
  Shipment, 
  TrackingLog, 
  Warehouse, 
  Notification, 
  UserRole, 
  ShipmentStatus 
} from "./src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const JWT_SECRET = "teyzix_core_logistics_secret_key_192837";
const JWT_REFRESH_SECRET = "teyzix_core_refresh_secret_key_584736";
const DATA_FILE = path.join(process.cwd(), "logistics_db.json");

// Middleware Augmentation for Request
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
  };
}

// -------------------------------------------------------------
// Database Persistence Layer & Seed Data
// -------------------------------------------------------------
interface DatabaseSchema {
  users: any[];
  shipments: Shipment[];
  trackingLogs: TrackingLog[];
  warehouses: Warehouse[];
  notifications: Notification[];
}

function initSeedData(): DatabaseSchema {
  // Seed Users: Hash standard passwords
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync("admin123", salt);
  const customerPasswordHash = bcrypt.hashSync("customer123", salt);
  const agentPasswordHash = bcrypt.hashSync("agent123", salt);

  const users = [
    {
      id: "usr_admin_1",
      email: "admin@teyzix.com",
      fullName: "Teyzix Admin",
      role: 'admin',
      password: adminPasswordHash,
      createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: "usr_cust_1",
      email: "customer@teyzix.com",
      fullName: "Hassan Ali",
      role: 'customer',
      password: customerPasswordHash,
      createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: "usr_agent_1",
      email: "agent@teyzix.com",
      fullName: "Zeeshan Khan",
      role: 'agent',
      password: agentPasswordHash,
      createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    }
  ];

  const warehouses: Warehouse[] = [
    {
      id: "wh_khi_1",
      name: "Karachi Port Hub (HQ)",
      location: "West Wharf, Karachi",
      capacity: 5000,
      utilizedCapacity: 120,
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: "wh_lhr_1",
      name: "Lahore Distribution Center",
      location: "M2 Ring Road Outlet, Lahore",
      capacity: 3500,
      utilizedCapacity: 45,
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: "wh_isb_1",
      name: "Islamabad Express Sorting Node",
      location: "Blue Area, Islamabad",
      capacity: 2000,
      utilizedCapacity: 0,
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    }
  ];

  // Seed Initial Shipments
  const shipments: Shipment[] = [
    {
      id: "shp_1",
      trackingId: "TZ-492810",
      senderDetails: { name: "Hassan Ali", phone: "+92 300 1234567", address: "DHA Phase 6, Karachi" },
      receiverDetails: { name: "Maryum Fahad", phone: "+92 321 9876543", address: "Gulberg III, Lahore" },
      packageType: "Electronics",
      weight: 12.5,
      deliveryAddress: "Gulberg III, Lahore, Pakistan",
      status: "in_warehouse",
      customerId: "usr_cust_1",
      assignedAgentId: "usr_agent_1",
      warehouseId: "wh_khi_1",
      createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      cost: 450 // base 200 + 20 per kg
    },
    {
      id: "shp_2",
      trackingId: "TZ-910283",
      senderDetails: { name: "Anas Ahmed", phone: "+92 333 5552121", address: "Saddar, Karachi" },
      receiverDetails: { name: "Waseem Shah", phone: "+92 312 4443232", address: "F-10, Islamabad" },
      packageType: "Documents",
      weight: 1.2,
      deliveryAddress: "House 45, Street 12, F-10, Islamabad, Pakistan",
      status: "delivered",
      customerId: "usr_cust_1",
      assignedAgentId: "usr_agent_1",
      warehouseId: "wh_khi_1",
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      cost: 150,
      deliveryProof: "Handed over directly to receiver. Signed by Waseem."
    }
  ];

  const trackingLogs: TrackingLog[] = [
    {
      id: "log_1",
      shipmentId: "shp_1",
      status: "created",
      description: "Shipment registered successfully in our network.",
      timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      actorName: "Hassan Ali"
    },
    {
      id: "log_2",
      shipmentId: "shp_1",
      status: "picked_up",
      description: "Shipment picked up by Courier Agent Zeeshan Khan.",
      timestamp: new Date(Date.now() - 3.8 * 24 * 3600 * 1000).toISOString(),
      actorName: "Zeeshan Khan"
    },
    {
      id: "log_3",
      shipmentId: "shp_1",
      status: "in_warehouse",
      description: "Shipment reached and processed at Karachi Port Hub (HQ).",
      timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      actorName: "Teyzix Admin"
    },
    {
      id: "log_4",
      shipmentId: "shp_2",
      status: "created",
      description: "Shipment booked for express delivery.",
      timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      actorName: "Anas Ahmed"
    },
    {
      id: "log_5",
      shipmentId: "shp_2",
      status: "picked_up",
      description: "Picked up from Saddar office.",
      timestamp: new Date(Date.now() - 4.5 * 24 * 3600 * 1000).toISOString(),
      actorName: "Zeeshan Khan"
    },
    {
      id: "log_6",
      shipmentId: "shp_2",
      status: "in_warehouse",
      description: "Consolidation completed at Karachi Port Hub.",
      timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      actorName: "Teyzix Admin"
    },
    {
      id: "log_7",
      shipmentId: "shp_2",
      status: "out_for_delivery",
      description: "Dispatched out for delivery to F-10, Islamabad.",
      timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      actorName: "Zeeshan Khan"
    },
    {
      id: "log_8",
      shipmentId: "shp_2",
      status: "delivered",
      description: "Delivered successfully. Proof of delivery uploaded.",
      timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      actorName: "Zeeshan Khan"
    }
  ];

  const notifications: Notification[] = [
    {
      id: "not_1",
      userId: "usr_cust_1",
      title: "Shipment Created",
      message: "Your shipment to Maryum Fahad (TZ-492810) has been registered.",
      type: "created",
      isRead: false,
      timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: "not_2",
      userId: "usr_cust_1",
      title: "Shipment Update",
      message: "Shipment TZ-492810 status changed to 'In Warehouse'.",
      type: "status_change",
      isRead: true,
      timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
    }
  ];

  return { users, shipments, trackingLogs, warehouses, notifications };
}

let db: DatabaseSchema;

function loadDatabase() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      db = JSON.parse(content);
      // Guarantee arrays exist
      db.users = db.users || [];
      db.shipments = db.shipments || [];
      db.trackingLogs = db.trackingLogs || [];
      db.warehouses = db.warehouses || [];
      db.notifications = db.notifications || [];
    } catch (e) {
      console.error("Failed to read DB file. Initializing defaults.", e);
      db = initSeedData();
      saveDatabase();
    }
  } else {
    db = initSeedData();
    saveDatabase();
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write DB file.", e);
  }
}

// Ensure database is initialized
loadDatabase();

// -------------------------------------------------------------
// Authentication Helpers
// -------------------------------------------------------------
function generateAccessToken(user: any) {
  return jwt.sign(
    { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    JWT_SECRET,
    { expiresIn: "1d" } // long-lived for sandbox applet testing comfort
  );
}

function generateRefreshToken(user: any) {
  return jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
}

function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Access denied. No authorization header provided." });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Access token missing format Bearer <token>" });
    return;
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as any;
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid, expired, or tampered access token." });
  }
}

function requireRole(roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized. Authentication is required." });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Forbidden. Role '${req.user.role}' lacks sufficient privileges.` });
      return;
    }

    next();
  };
}

// -------------------------------------------------------------
// Express Server Setup
// -------------------------------------------------------------
const app = express();
app.use(express.json());

// Logger Middleware for API Operations
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.path}`);
  next();
});

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// -- 1. AUTHENTICATION & AUTHORIZATION CLIENT APIS --

// Register User
app.post("/api/auth/register", (req, res) => {
  const { email, password, fullName, role } = req.body;

  if (!email || !password || !fullName) {
    res.status(400).json({ error: "Missing required registration parameters (email, password, fullName)." });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const userExists = db.users.find(u => u.email === normalizedEmail);
  if (userExists) {
    res.status(400).json({ error: "User registration failed. An account already exists with this email address." });
    return;
  }

  const userRole: UserRole = (role && ['customer', 'agent', 'admin'].includes(role)) ? role : 'customer';

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newUser: any = {
    id: `usr_${Math.random().toString(36).substr(2, 9)}`,
    email: normalizedEmail,
    fullName: fullName.trim(),
    role: userRole,
    password: passwordHash,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDatabase();

  const token = generateAccessToken(newUser);
  const refreshToken = generateRefreshToken(newUser);

  res.status(201).json({
    message: "Registration completed successfully.",
    token,
    refreshToken,
    user: {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      createdAt: newUser.createdAt
    }
  });
});

// User Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Missing email or password credentials." });
    return;
  }

  const user = db.users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
  if (!user) {
    res.status(401).json({ error: "Invalid credentials. Unable to authorize." });
    return;
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    res.status(401).json({ error: "Invalid credentials. Unable to authorize." });
    return;
  }

  const token = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.json({
    message: "Authentication successful.",
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt
    }
  });
});

// Token Refresh
app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: "Refresh token is missing from request body." });
    return;
  }

  try {
    const verified = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    const user = db.users.find(u => u.id === verified.id);
    if (!user) {
      res.status(404).json({ error: "User associated with refresh token not found." });
      return;
    }

    const token = generateAccessToken(user);
    res.json({ token });
  } catch (err) {
    res.status(403).json({ error: "Invalid, expired, or revoked refresh token." });
  }
});

// Retrieve Authorized Subject Me Details
app.get("/api/auth/me", authenticateJWT, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});


// -- 2. SHIPMENT MANAGEMENT APIS --

// Create Shipment (Customers / Admins)
app.post("/api/shipments", authenticateJWT, requireRole(['customer', 'admin']), (req: AuthenticatedRequest, res) => {
  const { 
    senderName, senderPhone, senderAddress, 
    receiverName, receiverPhone, receiverAddress, 
    packageType, weight, deliveryAddress 
  } = req.body;

  if (!senderName || !senderPhone || !senderAddress || 
      !receiverName || !receiverPhone || !receiverAddress || 
      !packageType || !weight || !deliveryAddress) {
    res.status(400).json({ error: "Missing required shipment booking details." });
    return;
  }

  const parsedWeight = parseFloat(weight);
  if (isNaN(parsedWeight) || parsedWeight <= 0) {
    res.status(400).json({ error: "Package weight must be a valid number greater than zero." });
    return;
  }

  // 1. Determine optimal warehouse allocation based on lowest remaining capacity constraints
  // Find warehouse with adequate remaining capacity
  let allocatedWarehouse = db.warehouses.find(wh => (wh.capacity - wh.utilizedCapacity) >= parsedWeight);
  if (!allocatedWarehouse && db.warehouses.length > 0) {
    // If no warehouse fits nicely, place in Karachi Headquarters as fallback or return error if completely full
    allocatedWarehouse = db.warehouses[0];
  }

  if (allocatedWarehouse) {
    allocatedWarehouse.utilizedCapacity = Number((allocatedWarehouse.utilizedCapacity + parsedWeight).toFixed(2));
  }

  const trackingId = `TZ-${Math.floor(100000 + Math.random() * 900000)}`;
  const cost = Number((150 + parsedWeight * 20).toFixed(2)); // basic logistics freight formula

  const newShipment: Shipment = {
    id: `shp_${Math.random().toString(36).substr(2, 9)}`,
    trackingId,
    senderDetails: { name: senderName, phone: senderPhone, address: senderAddress },
    receiverDetails: { name: receiverName, phone: receiverPhone, address: receiverAddress },
    packageType,
    weight: parsedWeight,
    deliveryAddress,
    status: 'created',
    customerId: req.user!.id,
    warehouseId: allocatedWarehouse?.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cost
  };

  db.shipments.push(newShipment);

  // 2. Add System Tracking Log File
  const initLog: TrackingLog = {
    id: `log_${Math.random().toString(36).substr(2, 9)}`,
    shipmentId: newShipment.id,
    status: 'created',
    description: `Shipment booked successfully by ${req.user!.fullName}. Tracking ID is registered. Scheduled warehouse: ${allocatedWarehouse?.name || 'UnassignedWarehouse'}.`,
    timestamp: new Date().toISOString(),
    actorName: req.user!.fullName
  };
  db.trackingLogs.push(initLog);

  // 3. Dispatch Alarm Notifications
  const initNotification: Notification = {
    id: `not_${Math.random().toString(36).substr(2, 9)}`,
    userId: req.user!.id,
    title: "Shipment Registered",
    message: `Your booking ${trackingId} has been registered securely. Allocated hub: ${allocatedWarehouse?.name || 'Awaiting assignment'}.`,
    type: 'created',
    isRead: false,
    timestamp: new Date().toISOString()
  };
  db.notifications.push(initNotification);

  saveDatabase();

  res.status(201).json({
    message: "Shipment registered & scheduled into warehousing center.",
    shipment: newShipment,
    log: initLog
  });
});

// View and Track shipments with filters, searching, and pagination
app.get("/api/shipments", authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { search, status, page, limit } = req.query;
  const user = req.user!;

  let filteredShipments = [...db.shipments];

  // Role Separation
  if (user.role === 'customer') {
    filteredShipments = filteredShipments.filter(s => s.customerId === user.id);
  } else if (user.role === 'agent') {
    // Agents view shipments assigned to them, or awaiting pickup/delivery operations
    filteredShipments = filteredShipments.filter(s => s.assignedAgentId === user.id || s.status === 'created' || s.status === 'picked_up');
  }

  // Filtering by Status
  if (status) {
    filteredShipments = filteredShipments.filter(s => s.status === status);
  }

  // Multi-field search functionality
  if (search) {
    const term = String(search).toLowerCase();
    filteredShipments = filteredShipments.filter(s => 
      s.trackingId.toLowerCase().includes(term) ||
      s.senderDetails.name.toLowerCase().includes(term) ||
      s.receiverDetails.name.toLowerCase().includes(term) ||
      s.packageType.toLowerCase().includes(term) ||
      s.deliveryAddress.toLowerCase().includes(term)
    );
  }

  // Sorting: newest shipments first
  filteredShipments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Pagination constraints
  const currPage = parseInt(String(page)) || 1;
  const currLimit = parseInt(String(limit)) || 10;
  const startIndex = (currPage - 1) * currLimit;
  const paginatedShipments = filteredShipments.slice(startIndex, startIndex + currLimit);

  res.json({
    totalCount: filteredShipments.length,
    totalPages: Math.ceil(filteredShipments.length / currLimit),
    currentPage: currPage,
    shipments: paginatedShipments
  });
});

// Tracking details based directly on trackingId (No login required - public tracking!)
app.get("/api/shipments/track/:trackingId", (req, res) => {
  const { trackingId } = req.params;
  const shipment = db.shipments.find(s => s.trackingId.trim().toUpperCase() === trackingId.trim().toUpperCase());

  if (!shipment) {
    res.status(404).json({ error: "Tracking ID not found in system registers." });
    return;
  }

  const logs = db.trackingLogs
    .filter(l => l.shipmentId === shipment.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const currentWarehouse = db.warehouses.find(wh => wh.id === shipment.warehouseId);

  res.json({
    shipment,
    history: logs,
    warehouse: currentWarehouse
  });
});

// Update Shipment Status and logs (Customer/Agent/Admin depending on rule)
app.put("/api/shipments/:id/status", authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status, remarks, deliveryProof } = req.body;
  const user = req.user!;

  const shipmentIndex = db.shipments.findIndex(s => s.id === id);
  if (shipmentIndex === -1) {
    res.status(404).json({ error: "Shipment record not found." });
    return;
  }

  const shipment = db.shipments[shipmentIndex];

  // Authorization verification (Only delivery agent or admins can update logistics state)
  if (user.role === 'customer' && status !== 'created') {
    res.status(403).json({ error: "Customers can not modify logistics statuses directly." });
    return;
  }

  const allowedStatuses: ShipmentStatus[] = ['created', 'picked_up', 'in_warehouse', 'out_for_delivery', 'delivered'];
  if (!allowedStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status code '${status}'. Value must be one of: ${allowedStatuses.join(', ')}` });
    return;
  }

  // Workflows Transitions Constraint Model
  const statusCycle: Record<ShipmentStatus, ShipmentStatus[]> = {
    'created': ['picked_up'],
    'picked_up': ['in_warehouse', 'out_for_delivery'],
    'in_warehouse': ['out_for_delivery'],
    'out_for_delivery': ['delivered', 'in_warehouse'], // can fail back to warehouse or succeed
    'delivered': [] // final state
  };

  const nextAllowed = statusCycle[shipment.status];
  if (!nextAllowed.includes(status) && user.role !== 'admin') { // Admins can override, agents must follow lifecycle
    res.status(400).json({ error: `Violates tracking lifecycle. Cannot transit directly from '${shipment.status}' to '${status}'.` });
    return;
  }

  // Handle Capacity changes: once package is delivered, remove utilizedCapacity from warehouse
  if (status === 'delivered' && shipment.status !== 'delivered' && shipment.warehouseId) {
    const warehouse = db.warehouses.find(wh => wh.id === shipment.warehouseId);
    if (warehouse) {
      warehouse.utilizedCapacity = Number(Math.max(0, warehouse.utilizedCapacity - shipment.weight).toFixed(2));
    }
  }

  // Set Agent Id: if Agent is executing status change, automatically assign them to this parcel
  if (user.role === 'agent' && !shipment.assignedAgentId) {
    shipment.assignedAgentId = user.id;
  }

  // Update properties
  shipment.status = status;
  shipment.updatedAt = new Date().toISOString();
  if (deliveryProof && status === 'delivered') {
    shipment.deliveryProof = deliveryProof;
  }

  // Add Tracking Logs Entry and persist
  const newLog: TrackingLog = {
    id: `log_${Math.random().toString(36).substr(2, 9)}`,
    shipmentId: shipment.id,
    status,
    description: remarks || `Package state updated to [${status.toUpperCase().replace('_', ' ')}] by ${user.fullName}.`,
    timestamp: new Date().toISOString(),
    actorName: user.fullName
  };
  db.trackingLogs.push(newLog);

  // Dispatch Customer Notification Alert
  const updateNotification: Notification = {
    id: `not_${Math.random().toString(36).substr(2, 9)}`,
    userId: shipment.customerId,
    title: `Shipment Status Changed: ${status.toUpperCase().replace('_', ' ')}`,
    message: `Your package with tracking ID ${shipment.trackingId} was updated. Status: ${status.replace('_', ' ')}. Action performed by: ${user.fullName}.`,
    type: status === 'delivered' ? 'delivery' : 'status_change',
    isRead: false,
    timestamp: new Date().toISOString()
  };
  db.notifications.push(updateNotification);

  saveDatabase();

  res.json({
    message: "Shipment status tracking log updated.",
    shipment,
    log: newLog
  });
});

// Admin manual re-assignment of Warehouses or Agents
app.put("/api/shipments/:id/assign", authenticateJWT, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { warehouseId, assignedAgentId } = req.body;

  const shipment = db.shipments.find(s => s.id === id);
  if (!shipment) {
    res.status(404).json({ error: "Shipment not found." });
    return;
  }

  if (warehouseId) {
    const oldWarehouse = db.warehouses.find(w => w.id === shipment.warehouseId);
    const newWarehouse = db.warehouses.find(w => w.id === warehouseId);
    
    if (!newWarehouse) {
      res.status(400).json({ error: "The provided warehouse ID does not match any operational centers." });
      return;
    }

    // Transfer utilized capacity
    if (oldWarehouse) {
      oldWarehouse.utilizedCapacity = Number(Math.max(0, oldWarehouse.utilizedCapacity - shipment.weight).toFixed(2));
    }
    newWarehouse.utilizedCapacity = Number((newWarehouse.utilizedCapacity + shipment.weight).toFixed(2));
    shipment.warehouseId = warehouseId;
  }

  if (assignedAgentId) {
    const agent = db.users.find(u => u.id === assignedAgentId && u.role === 'agent');
    if (!agent) {
      res.status(400).json({ error: "Agent ID is invalid or does not correspond to an active Delivery Agent." });
      return;
    }
    shipment.assignedAgentId = assignedAgentId;
  }

  shipment.updatedAt = new Date().toISOString();
  saveDatabase();

  res.json({
    message: "Shipment resource assignment completed.",
    shipment
  });
});


// -- 3. WAREHOUSE MANAGEMENT APIS --

// Get Warehouses with capacity statistics
app.get("/api/warehouses", authenticateJWT, (req, res) => {
  const warehouseStats = db.warehouses.map(wh => {
    const packagesStored = db.shipments.filter(s => s.warehouseId === wh.id && s.status !== 'delivered').length;
    // Calculate accurate utilized capacity
    const totalWeightStored = db.shipments
      .filter(s => s.warehouseId === wh.id && s.status !== 'delivered')
      .reduce((sum, s) => sum + s.weight, 0);

    // Safeguard database state
    wh.utilizedCapacity = Number(totalWeightStored.toFixed(2));

    return {
      ...wh,
      packagesStored,
      percentageUtilized: Number(((wh.utilizedCapacity / wh.capacity) * 100).toFixed(1))
    };
  });

  res.json({ warehouses: warehouseStats });
});

// Post a new Warehouse Location (Admins Only)
app.post("/api/warehouses", authenticateJWT, requireRole(['admin']), (req, res) => {
  const { name, location, capacity } = req.body;

  if (!name || !location || !capacity) {
    res.status(400).json({ error: "Missing required parameters (name, location, capacity)." });
    return;
  }

  const capacityVal = parseFloat(capacity);
  if (isNaN(capacityVal) || capacityVal <= 0) {
    res.status(400).json({ error: "Warehouse dry capacity must be a positive number of kilograms." });
    return;
  }

  const newWh: Warehouse = {
    id: `wh_${Math.random().toString(36).substr(2, 9)}`,
    name,
    location,
    capacity: capacityVal,
    utilizedCapacity: 0,
    createdAt: new Date().toISOString()
  };

  db.warehouses.push(newWh);
  saveDatabase();

  res.status(201).json({
    message: "New warehouse sorting center deployed successfully.",
    warehouse: newWh
  });
});


// -- 4. NOTIFICATIONS CLIENT APIS --

// Get Notifications for Logged-In User
app.get("/api/notifications", authenticateJWT, (req: AuthenticatedRequest, res) => {
  const userNotifs = db.notifications
    .filter(n => n.userId === req.user!.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({ notifications: userNotifs });
});

// Mark all Notifications as read
app.post("/api/notifications/read", authenticateJWT, (req: AuthenticatedRequest, res) => {
  db.notifications.forEach(n => {
    if (n.userId === req.user!.id) n.isRead = true;
  });
  saveDatabase();
  res.json({ message: "All notifications declared read." });
});


// -- 5. REPORTING & ANALYTICS DATA PROVIDERS --

// Admin dashboard business metrics
app.get("/api/reports/stats", authenticateJWT, requireRole(['admin']), (req, res) => {
  // Aggregate report data
  const totalShipments = db.shipments.length;
  
  // Daily count calculation (today's bookings)
  const todayStr = new Date().toISOString().split('T')[0];
  const dailyShipments = db.shipments.filter(s => s.createdAt.startsWith(todayStr)).length;

  const deliveredOrders = db.shipments.filter(s => s.status === 'delivered').length;
  const pendingOrders = db.shipments.filter(s => s.status !== 'delivered').length;

  const warehouseUtilizationList = db.warehouses.map(wh => {
    const totalWeightStored = db.shipments
      .filter(s => s.warehouseId === wh.id && s.status !== 'delivered')
      .reduce((sum, s) => sum + s.weight, 0);

    return {
      warehouseId: wh.id,
      name: wh.name,
      capacity: wh.capacity,
      utilized: Number(totalWeightStored.toFixed(2)),
      percentage: Number(((totalWeightStored / wh.capacity) * 100).toFixed(1))
    };
  });

  // Fetch agent lists for convenience of allocation
  const deliveryAgents = db.users
    .filter(u => u.role === 'agent')
    .map(u => ({ id: u.id, fullName: u.fullName, email: u.email }));

  // System audit activities
  const recentActivityLogs = [...db.trackingLogs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)
    .map(log => ({
      time: log.timestamp,
      message: `${log.actorName} updated shipment tracking: ${log.description}`,
      type: log.status
    }));

  res.json({
    dailyShipments,
    deliveredOrders,
    pendingOrders,
    totalShipments,
    warehouseUtilization: warehouseUtilizationList,
    recentActivity: recentActivityLogs,
    agents: deliveryAgents
  });
});


// -- 6. SYSTEM STABILITY ENVIRONMENT INFRASTRUCTURE --

// OpenAPI Documentation Swagger Spec Data Endpoint
app.get("/api/docs-spec", (req, res) => {
  res.json({
    openapi: "3.0.0",
    info: {
      title: "Teyzix Core Logistics & Shipment API System",
      description: "Advanced REST API backend simulating real-time tracking, multi-role Auth workflows, package weight freight fees, sorting hub capacities, and delivery validation audits.",
      version: "1.0.0"
    },
    paths: {
      "/api/auth/register": {
        post: {
          summary: "Create new user account",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" }, fullName: { type: "string" }, role: { type: "string", enum: ["customer", "agent", "admin"] } } } } }
          },
          responses: { "201": { description: "User registered" } }
        }
      },
      "/api/auth/login": {
        post: {
          summary: "Log in user & retrieve JWT token credentials",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" } } } } }
          },
          responses: { "200": { description: "Auth tokens generated successfully" } }
        }
      },
      "/api/shipments": {
        post: {
          summary: "Book a new consignment shipment (Client/Admin)",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", properties: { senderName: { type: "string" }, senderPhone: { type: "string" }, senderAddress: { type: "string" }, receiverName: { type: "string" }, receiverPhone: { type: "string" }, receiverAddress: { type: "string" }, packageType: { type: "string" }, weight: { type: "number" }, deliveryAddress: { type: "string" } } } } }
          },
          responses: { "201": { description: "Package registered & scheduled" } }
        },
        get: {
          summary: "Paginated, searchable & filterable consignment logs",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "search", in: "query", type: "string" }, { name: "status", in: "query", type: "string" }, { name: "page", in: "query", type: "integer" }],
          responses: { "200": { description: "Filtered list of consignments" } }
        }
      },
      "/api/shipments/track/{trackingId}": {
        get: {
          summary: "Public tracking node logs without any registration required",
          parameters: [{ name: "trackingId", in: "path", required: true, type: "string" }],
          responses: { "200": { description: "Shipment timeline history" } }
        }
      },
      "/api/shipments/{id}/status": {
        put: {
          summary: "Update delivery parcel status & proof validation",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, remarks: { type: "string" }, deliveryProof: { type: "string" } } } } }
          },
          responses: { "200": { description: "Consignment updated and customer notified" } }
        }
      },
      "/api/warehouses": {
        get: {
          summary: "List all regional warehousing capacities and packages metrics",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Warehouse allocation maps list" } }
        },
        post: {
          summary: "Create and deploy new regional warehouse hub (Admin)",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, location: { type: "string" }, capacity: { type: "number" } } } } }
          },
          responses: { "201": { description: "Sorting node deployed successfully" } }
        }
      },
      "/api/reports/stats": {
        get: {
          summary: "Admin comprehensive operations report dashboards (Admin)",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Consolidated operational analytics block" } }
        }
      }
    }
  });
});

// API Error Handler Boundary
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("API error uncaught exception:", err);
  res.status(500).json({ error: "Internal Server Critical Event error occurred.", details: err.message });
});

// -------------------------------------------------------------
// Vite Dev Server / Static Dist Middleware Mounting
// -------------------------------------------------------------
async function bootstrapServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted successfully for Hot Development Mode.");
  } else {
    // production mode static client pipeline
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving compiled production build folder static assets.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(` TEYZIX CORE LOGISTICS SERVER STARTED ON PORT ${PORT} `);
    console.log(` Running mode: ${process.env.NODE_ENV || "development"} `);
    console.log(` API base: http://0.0.0.0:${PORT}/api `);
    console.log(`====================================================`);
  });
}

bootstrapServer().catch((e) => {
  console.error("Critical error booting Teyzix server:", e);
});
