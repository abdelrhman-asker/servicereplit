import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertServiceRequestSchema, insertPaymentSchema } from "@shared/schema";
import type { ServiceRequest } from "@shared/schema";
import Stripe from "stripe";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Auth routes
  // Local auth: hydrate current user via session is handled in replitAuth.ts when AUTH_MODE=local
  app.post('/api/auth/signup', async (req: any, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      });
      const { email, password, firstName, lastName } = schema.parse(req.body);

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: 'Email already exists' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const id = crypto.randomUUID();
      const user = await storage.upsertUser({
        id,
        email,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        profileImageUrl: null,
        passwordHash,
      } as any);
      // establish session
      req.session.userId = user.id;
      return res.json(user);
    } catch (error: any) {
      return res.status(400).json({ message: 'Invalid signup data', error: error?.message });
    }
  });

  // Login
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
      const { email, password } = schema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      req.session.userId = user.id;
      return res.json(user);
    } catch (error: any) {
      return res.status(400).json({ message: 'Invalid login data', error: error?.message });
    }
  });

  // Technician creates a new job (using current service_requests schema)
  // We record the creator as both clientId and technicianId for now.
  app.post('/api/technician/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'technician') {
        return res.status(403).json({ message: 'Access denied. Technician role required.' });
      }
      const minimalSchema = z.object({
        serviceType: z.string().min(1),
        description: z.string().min(10),
        location: z.string().min(3),
      });
      const body = minimalSchema.parse(req.body);
      const created = await storage.createServiceRequest({
        clientId: userId,
        technicianId: userId,
        serviceType: body.serviceType,
        description: body.description,
        location: body.location,
        status: 'pending',
      } as any);
      return res.json(created);
    } catch (error) {
      console.error('Error creating technician job:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid job data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Failed to create job' });
    }
  });

  // Public: list all jobs
  app.get('/api/public/alljobs', async (_req, res) => {
    try {
      const jobs = await storage.getAllServiceRequests();
      return res.json(jobs);
    } catch (error) {
      console.error('Error fetching all jobs:', error);
      return res.status(500).json({ message: 'Failed to fetch jobs' });
    }
  });

  // My jobs: for the logged-in user
  app.get('/api/my/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const asClient = await storage.getServiceRequestsByClient(userId);
      const asTech = await storage.getServiceRequestsByTechnician(userId);
      // Merge unique by id
      const map = new Map<string, ServiceRequest>();
      for (const r of [...asClient, ...asTech]) map.set(r.id, r);
      return res.json(Array.from(map.values()));
    } catch (error) {
      console.error('Error fetching my jobs:', error);
      return res.status(500).json({ message: 'Failed to fetch jobs' });
    }
  });

  app.post('/api/auth/logout', async (req: any, res) => {
    req.session.destroy(() => {
      // Clear session cookie so browser doesn't retain old session id
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  });
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      let user = await storage.getUser(userId);
      // In local bypass mode, ensure we always have a user record to return
      if (!user && (process.env.AUTH_MODE === 'local')) {
        user = await storage.upsertUser({
          id: userId,
          email: 'local@example.com',
          firstName: 'Local',
          lastName: 'User',
          profileImageUrl: null,
        });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User profile routes
  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const profileUpdateSchema = z.object({
        userType: z.enum(['client', 'technician']).optional(),
        skills: z.array(z.string()).optional(),
        bio: z.string().optional(),
        isAvailable: z.boolean().optional(),
        phone: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        profileImageUrl: z.string().optional(),
      }).strict();
      const updates = profileUpdateSchema.parse(req.body);
      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      console.error("Error updating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile", error: error?.message || String(error) });
    }
  });

  // Service Request routes
  app.post('/api/service-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const data = insertServiceRequestSchema.parse({
        ...req.body,
        clientId: userId,
      });
      const serviceRequest = await storage.createServiceRequest(data);
      res.json(serviceRequest);
    } catch (error) {
      console.error("Error creating service request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create service request" });
    }
  });

  app.get('/api/service-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let requests: ServiceRequest[];
      if (user.userType === 'client') {
        requests = await storage.getServiceRequestsByClient(userId);
      } else if (user.userType === 'technician') {
        requests = await storage.getServiceRequestsByTechnician(userId);
      } else {
        requests = [] as ServiceRequest[];
      }

      res.json(requests);
    } catch (error) {
      console.error("Error fetching service requests:", error);
      res.status(500).json({ message: "Failed to fetch service requests" });
    }
  });

  app.get('/api/service-requests/available', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.userType !== 'technician') {
        return res.status(403).json({ message: "Access denied. Technician role required." });
      }

      const requests: ServiceRequest[] = await storage.getAvailableServiceRequests(user.skills || []);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching available requests:", error);
      res.status(500).json({ message: "Failed to fetch available requests" });
    }
  });

  app.get('/api/service-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.getServiceRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: "Service request not found" });
      }

      res.json(request);
    } catch (error) {
      console.error("Error fetching service request:", error);
      res.status(500).json({ message: "Failed to fetch service request" });
    }
  });

  app.patch('/api/service-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;
      const updates = req.body;

      // Verify user has permission to update this request
      const request = await storage.getServiceRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Service request not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only client who created it or assigned technician can update
      if (request.clientId !== userId && request.technicianId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await storage.updateServiceRequest(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating service request:", error);
      res.status(500).json({ message: "Failed to update service request" });
    }
  });

  // Stripe Payment routes
  app.post('/api/payments/create-intent', isAuthenticated, async (req: any, res) => {
    try {
      const { serviceRequestId } = req.body;
      
      const request = await storage.getServiceRequest(serviceRequestId);
      if (!request) {
        return res.status(404).json({ message: "Service request not found" });
      }

      if (request.status !== 'completed') {
        return res.status(400).json({ message: "Service request must be completed before payment" });
      }

      if (!request.quotedPrice) {
        return res.status(400).json({ message: "No quoted price available" });
      }

      // Check if payment already exists
      const existingPayment = await storage.getPaymentByServiceRequest(serviceRequestId);
      if (existingPayment && existingPayment.status === 'succeeded') {
        return res.status(400).json({ message: "Payment already completed" });
      }

      // Create Stripe Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: request.quotedPrice * 100, // Convert to cents
        currency: 'usd',
        metadata: {
          serviceRequestId,
          clientId: request.clientId,
          technicianId: request.technicianId || '',
        },
      });

      // Save payment to database
      const payment = await storage.createPayment({
        serviceRequestId,
        amount: request.quotedPrice,
        stripePaymentIntentId: paymentIntent.id,
        status: 'pending',
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id,
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  app.post('/api/payments/confirm', isAuthenticated, async (req: any, res) => {
    try {
      const { paymentId, paymentIntentId } = req.body;

      // Verify payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        await storage.updatePaymentStatus(paymentId, 'succeeded');
        res.json({ success: true, message: "Payment confirmed" });
      } else {
        res.json({ success: false, message: "Payment not yet completed" });
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "Failed to confirm payment" });
    }
  });

  app.get('/api/payments/:serviceRequestId', isAuthenticated, async (req: any, res) => {
    try {
      const { serviceRequestId } = req.params;
      const payment = await storage.getPaymentByServiceRequest(serviceRequestId);
      res.json(payment);
    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({ message: "Failed to fetch payment" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
