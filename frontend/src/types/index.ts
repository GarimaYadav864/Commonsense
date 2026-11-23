
/* =========================================
   COMMON TYPES
========================================= */

export type UserRole =
  | "requester"
  | "provider"
  | "volunteer"
  | "admin";

export type RequestStatus =
  | "pending"
  | "matching"
  | "offered"
  | "fulfilled"
  | "cancelled";

export type ResourceStatus =
  | "available"
  | "unavailable"
  | "fulfilled";

export type ProviderAvailability = "active" | "paused";

export type OfferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export type DeliveryMethod =
  | "self_pickup"
  | "community_delivery";

export type DeliveryStatus =
  | "arranged"
  | "dispatched"
  | "delivered"
  | "received"
  | "cancelled";

export type Urgency = "low" | "medium" | "high" | "critical";

export type ResourceCondition =
  | "new"
  | "good"
  | "fair"
  | "not-applicable";

/* =========================================
   USER
========================================= */

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  location: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

/* =========================================
   REQUEST
========================================= */

export interface CommunityRequest {
  _id: string;
  title: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  urgency: Urgency;
  status: RequestStatus;
  requester: string | User;
  createdAt: string;
  updatedAt?: string;
}

/* =========================================
   RESOURCE
========================================= */

export interface Resource {
  _id: string;
  title: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  condition: ResourceCondition;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  status: ResourceStatus;
  providerAvailability: ProviderAvailability;
  provider: string | User;
  createdAt: string;
  updatedAt?: string;
}

/* =========================================
   OFFER
========================================= */

export interface Offer {
  _id: string;
  request: string | CommunityRequest;
  resource: string | Resource;
  requester: string | User;
  provider: string | User;
  quantity: number;
  status: OfferStatus;
  offeredAt: string;
  expiresAt: string;
  respondedAt?: string | null;
  requesterConfirmed: boolean;
  requesterConfirmedAt?: string | null;
  requesterConfirmationExpiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/* =========================================
   DELIVERY
========================================= */

export interface Delivery {
  _id: string;
  offer: string | Offer;
  request: string | CommunityRequest;
  provider: string | User;
  requester: string | User;
  volunteer?: string | User | null;
  volunteerAssignedAt?: string | null;
  method: DeliveryMethod;
  pickupAddress?: string;
  deliveryAddress?: string;
  transportDetails?: string;
  quotedCost: number;
  costCurrency: string;
  status: DeliveryStatus;
  providerConfirmed: boolean;
  requesterConfirmed: boolean;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/* =========================================
   NOTIFICATION
========================================= */

export type NotificationType =
  | "offer_received"
  | "offer_accepted"
  | "offer_rejected"
  | "delivery_arranged"
  | "delivery_claimed"
  | "delivery_dispatched"
  | "delivery_received"
  | "request_matched"
  | "request_update"
  | "admin_new_request"
  | "admin_new_resource"
  | "admin_moderation_action"
  | "admin_delivery_update"
  | "general";

export interface Notification {
  _id: string;
  recipient: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string | null;
  relatedModel?: "Offer" | "Request" | "Resource" | "Delivery" | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/* =========================================
   API RESPONSE
========================================= */

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  count: number;
  page?: number;
  pages?: number;
  results?: number;
  data?: T[];
}

/* =========================================
   DASHBOARD STATISTICS
========================================= */

export interface DashboardStats {
  users?: {
    total: number;
    requesters: number;
    providers: number;
    volunteers: number;
  };

  requests?: {
    total: number;
    active: number;
  };

  resources?: {
    total: number;
    available: number;
  };

  offers?: {
    total: number;
    accepted: number;
  };

  deliveries?: {
    total: number;
    completed: number;
  };
}
