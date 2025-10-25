import { users, bots, type User, type InsertUser, type Bot, type InsertBot, type UpdateBotConfig } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Bot management
  getBots(): Promise<Bot[]>;
  getBot(id: string): Promise<Bot | undefined>;
  createBot(bot: InsertBot): Promise<Bot>;
  updateBot(id: string, updates: Partial<Bot>): Promise<Bot | undefined>;
  updateBotConfig(id: string, config: UpdateBotConfig): Promise<Bot | undefined>;
  deleteBot(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private bots: Map<string, Bot>;

  constructor() {
    this.users = new Map();
    this.bots = new Map();
    
    // Add a default bot for testing
    const defaultBot: Bot = {
      id: "default-bot-1",
      username: "botlolicute",
      server: "thuatzai123.aternos.me",
      status: "offline",
      autoReconnect: true,
      chatEnabled: true,
      movementPattern: "random",
      responseDelay: 1000,
      uptime: 0,
      lastSeen: new Date(),
      createdAt: new Date(),
    };
    this.bots.set(defaultBot.id, defaultBot);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getBots(): Promise<Bot[]> {
    return Array.from(this.bots.values());
  }

  async getBot(id: string): Promise<Bot | undefined> {
    return this.bots.get(id);
  }

  async createBot(insertBot: InsertBot): Promise<Bot> {
    const id = randomUUID();
    const bot: Bot = {
      ...insertBot,
      id,
      status: "offline",
      autoReconnect: insertBot.autoReconnect ?? true,
      chatEnabled: insertBot.chatEnabled ?? true,
      movementPattern: insertBot.movementPattern ?? "random",
      responseDelay: insertBot.responseDelay ?? 1000,
      uptime: 0,
      lastSeen: new Date(),
      createdAt: new Date(),
    };
    this.bots.set(id, bot);
    return bot;
  }

  async updateBot(id: string, updates: Partial<Bot>): Promise<Bot | undefined> {
    const bot = this.bots.get(id);
    if (!bot) return undefined;
    
    const updatedBot = { ...bot, ...updates };
    this.bots.set(id, updatedBot);
    return updatedBot;
  }

  async updateBotConfig(id: string, config: UpdateBotConfig): Promise<Bot | undefined> {
    const bot = this.bots.get(id);
    if (!bot) return undefined;
    
    const updatedBot = { ...bot, ...config };
    this.bots.set(id, updatedBot);
    return updatedBot;
  }

  async deleteBot(id: string): Promise<boolean> {
    return this.bots.delete(id);
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getBots(): Promise<Bot[]> {
    return await db.select().from(bots);
  }

  async getBot(id: string): Promise<Bot | undefined> {
    const [bot] = await db.select().from(bots).where(eq(bots.id, id));
    return bot || undefined;
  }

  async createBot(insertBot: InsertBot): Promise<Bot> {
    const [bot] = await db
      .insert(bots)
      .values({
        ...insertBot,
        autoReconnect: insertBot.autoReconnect ?? true,
        chatEnabled: insertBot.chatEnabled ?? true,
        movementPattern: insertBot.movementPattern ?? "random",
        responseDelay: insertBot.responseDelay ?? 1000,
      })
      .returning();
    return bot;
  }

  async updateBot(id: string, updates: Partial<Bot>): Promise<Bot | undefined> {
    const [bot] = await db
      .update(bots)
      .set(updates)
      .where(eq(bots.id, id))
      .returning();
    return bot || undefined;
  }

  async updateBotConfig(id: string, config: UpdateBotConfig): Promise<Bot | undefined> {
    const [bot] = await db
      .update(bots)
      .set(config)
      .where(eq(bots.id, id))
      .returning();
    return bot || undefined;
  }

  async deleteBot(id: string): Promise<boolean> {
    const result = await db.delete(bots).where(eq(bots.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

// Use in-memory storage for now to avoid database connection issues
export const storage = new MemStorage();
