export type UserRole = 'customer' | 'agent' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export type ShipmentStatus = 'created' | 'picked_up' | 'in_warehouse' | 'out_for_delivery' | 'delivered';

export interface SenderDetails {
  name: string;
  phone: string;
  address: string;
}

export interface ReceiverDetails {
  name: string;
  phone: string;
  address: string;
}

export interface Shipment {
  id: string;
  trackingId: string;
  senderDetails: SenderDetails;
  receiverDetails: ReceiverDetails;
  packageType: string;
  weight: number; // in kg
  deliveryAddress: string;
  status: ShipmentStatus;
  customerId: string;
  assignedAgentId?: string;
  warehouseId?: string;
  createdAt: string;
  updatedAt: string;
  cost: number;
  deliveryProof?: string; // proof of delivery text/signature note
}

export interface TrackingLog {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  description: string;
  timestamp: string;
  actorName: string; // who did it
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity: number; // Max weight capacity in kg
  utilizedCapacity: number; // Current filled weight in kg
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'created' | 'status_change' | 'delivery';
  isRead: boolean;
  timestamp: string;
}

export interface SystemStats {
  dailyShipments: number;
  deliveredOrders: number;
  pendingOrders: number;
  warehouseUtilization: {
    warehouseId: string;
    name: string;
    capacity: number;
    utilized: number;
    percentage: number;
  }[];
  recentActivity: {
    time: string;
    message: string;
    type: string;
  }[];
}
