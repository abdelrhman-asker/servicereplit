import { db } from "./db";
import { users, serviceRequests, payments, type User, type UpsertUser, type ServiceRequest, type InsertServiceRequest, type Payment, type InsertPayment } from "@shared/schema";
import { eq, and, or, desc, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined>;

  // Service Request operations
  getServiceRequest(id: string): Promise<ServiceRequest | undefined>;
  getServiceRequestsByClient(clientId: string): Promise<ServiceRequest[]>;
  getServiceRequestsByTechnician(technicianId: string): Promise<ServiceRequest[]>;
  getAvailableServiceRequests(skills?: string[]): Promise<ServiceRequest[]>;
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  updateServiceRequest(id: string, updates: Partial<InsertServiceRequest>): Promise<ServiceRequest | undefined>;

  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentByServiceRequest(serviceRequestId: string): Promise<Payment | undefined>;
  updatePaymentStatus(id: string, status: 'pending' | 'succeeded' | 'failed'): Promise<Payment | undefined>;
  getAllServiceRequests(): Promise<ServiceRequest[]>;
}

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    const result = await db.update(users).set({
      ...updates,
      updatedAt: new Date(),
    }).where(eq(users.id, id)).returning();
    return result[0];
  }

  // Service Request operations
  async getServiceRequest(id: string): Promise<ServiceRequest | undefined> {
    const result = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
    return result[0];
  }

  async getServiceRequestsByClient(clientId: string): Promise<ServiceRequest[]> {
    return db.select().from(serviceRequests).where(eq(serviceRequests.clientId, clientId)).orderBy(desc(serviceRequests.createdAt));
  }

  async getServiceRequestsByTechnician(technicianId: string): Promise<ServiceRequest[]> {
    return db.select().from(serviceRequests).where(eq(serviceRequests.technicianId, technicianId)).orderBy(desc(serviceRequests.createdAt));
  }

  async getAvailableServiceRequests(skills?: string[]): Promise<ServiceRequest[]> {
    let query = db.select().from(serviceRequests).where(
      and(
        eq(serviceRequests.status, 'pending'),
        isNull(serviceRequests.technicianId)
      )
    );

    const results = await query.orderBy(desc(serviceRequests.createdAt));
    
    // Filter by skills if provided
    if (skills && skills.length > 0) {
      return results.filter(req => skills.includes(req.serviceType));
    }
    
    return results;
  }

  async createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest> {
    const result = await db.insert(serviceRequests).values(request).returning();
    return result[0];
  }

  async updateServiceRequest(id: string, updates: Partial<InsertServiceRequest>): Promise<ServiceRequest | undefined> {
    const result = await db.update(serviceRequests).set({
      ...updates,
      updatedAt: new Date(),
    }).where(eq(serviceRequests.id, id)).returning();
    return result[0];
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values(payment).returning();
    return result[0];
  }

  async getPaymentByServiceRequest(serviceRequestId: string): Promise<Payment | undefined> {
    const result = await db.select().from(payments).where(eq(payments.serviceRequestId, serviceRequestId)).limit(1);
    return result[0];
  }

  async updatePaymentStatus(id: string, status: 'pending' | 'succeeded' | 'failed'): Promise<Payment | undefined> {
    const result = await db.update(payments).set({ status }).where(eq(payments.id, id)).returning();
    return result[0];
  }

  async getAllServiceRequests(): Promise<ServiceRequest[]> {
    return db.select().from(serviceRequests).orderBy(desc(serviceRequests.createdAt));
  }
}

export const storage = new DbStorage();
