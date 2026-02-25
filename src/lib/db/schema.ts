import { pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

// Users Table
export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').unique().notNull(),
    password_hash: text('password_hash'), // Optional for Capital.com passthrough users
    full_name: text('full_name'),
    role: text('role').default('user'),
    email_verified: boolean('email_verified').default(false),
    token_version: integer('token_version').default(0),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
    last_login_at: timestamp('last_login_at'),
    two_factor_enabled: boolean('two_factor_enabled').default(false),
    two_factor_secret: text('two_factor_secret'),
});

// Recovery Codes Table
export const recoveryCodes = pgTable('recovery_codes', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    code_hash: text('code_hash').notNull(),
    used: boolean('used').default(false),
    created_at: timestamp('created_at').defaultNow(),
});

// Refresh Tokens Table
export const refreshTokens = pgTable('refresh_tokens', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    token_hash: text('token_hash').notNull(),
    device_info: text('device_info'),
    ip_address: text('ip_address'),
    expires_at: timestamp('expires_at').notNull(),
    created_at: timestamp('created_at').defaultNow(),
    revoked: boolean('revoked').default(false),
});

// Capital.com Accounts Table (Encrypted Credentials)
export const capitalAccounts = pgTable('capital_accounts', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    label: text('label').default('Primary Account'),
    is_active: boolean('is_active').default(false),
    encrypted_api_key: text('encrypted_api_key').notNull(),
    api_key_hash: text('api_key_hash').unique(),
    encrypted_api_password: text('encrypted_api_password'), // Stored Capital password
    encrypted_api_secret: text('encrypted_api_secret'),
    encrypted_session_tokens: text('encrypted_session_tokens'), // Cached {cst, xSecurityToken}
    session_mode: text('session_mode'), // 'demo' or 'live'
    selected_capital_account_id: text('selected_capital_account_id'), // The specific account selected via dropdown
    session_updated_at: timestamp('session_updated_at'),
    capital_account_id: text('capital_account_id'),
    account_type: text('account_type').default('demo'),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

// Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(), // 'LOGIN', 'LOGOUT', 'REGISTER', 'REFRESH_TOKEN', etc.
    ip_address: text('ip_address'),
    user_agent: text('user_agent'),
    timestamp: timestamp('timestamp').defaultNow(),
});

// Engine Settings Table
export const engineSettings = pgTable('engine_settings', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    engine_id: text('engine_id').notNull(), // 'vortex', 'scalper', etc.
    is_active: boolean('is_active').default(false),
    risk_level: text('risk_level').default('moderate'),
    parameters: text('parameters'), // JSON string for engine-specific params
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

// System Settings Table (Global Config & Master Credentials)
export const systemSettings = pgTable('system_settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updated_at: timestamp('updated_at').defaultNow(),
});

// Notifications Table
export const notifications = pgTable('notifications', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: text('type').default('info'), // 'info', 'success', 'warning', 'error'
    read: boolean('read').default(false),
    created_at: timestamp('created_at').defaultNow(),
});

// Support Agents Table
export const supportAgents = pgTable('support_agents', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').unique().notNull(),
    password_hash: text('password_hash').notNull(),
    full_name: text('full_name').notNull(),
    role: text('role').default('agent'), // 'agent', 'supervisor'
    two_factor_enabled: boolean('two_factor_enabled').default(false),
    two_factor_secret: text('two_factor_secret'),
    created_at: timestamp('created_at').defaultNow(),
    last_login_at: timestamp('last_login_at'),
    is_active: boolean('is_active').default(true),
});

// Tickets Table
export const tickets = pgTable('tickets', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    assigned_agent_id: uuid('assigned_agent_id').references(() => supportAgents.id, { onDelete: 'set null' }),
    category: text('category').notNull(),
    subject: text('subject').notNull(),
    description: text('description').notNull(),
    status: text('status').default('OPEN'), // 'OPEN', 'PENDING', 'CLOSED', 'ESCALATED'
    priority: text('priority').default('NORMAL'), // 'LOW', 'NORMAL', 'HIGH', 'URGENT'
    created_at: timestamp('created_at').defaultNow(),
    closed_at: timestamp('closed_at'),
});

// Ticket Messages Table (Live Chat via WebSockets)
export const ticketMessages = pgTable('ticket_messages', {
    id: uuid('id').defaultRandom().primaryKey(),
    ticket_id: uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
    sender_id: uuid('sender_id').notNull(), // Can be user.id or supportAgent.id
    sender_type: text('sender_type').notNull(), // 'user' or 'agent'
    message: text('message').notNull(),
    attachment_url: text('attachment_url'),
    read_status: boolean('read_status').default(false),
    created_at: timestamp('created_at').defaultNow(),
});

// Internal Ticket Notes (Agents Only)
export const ticketNotes = pgTable('ticket_notes', {
    id: uuid('id').defaultRandom().primaryKey(),
    ticket_id: uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
    agent_id: uuid('agent_id').references(() => supportAgents.id, { onDelete: 'cascade' }).notNull(),
    note: text('note').notNull(),
    created_at: timestamp('created_at').defaultNow(),
});
