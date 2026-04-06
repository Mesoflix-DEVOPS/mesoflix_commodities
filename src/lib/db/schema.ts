import { pgTable, uuid, text, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';

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
}, (table) => ({
    userIdIdx: index('refresh_tokens_user_id_idx').on(table.user_id),
}));

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
    selected_capital_account_id: text('selected_capital_account_id'), // Legacy/Shared field
    selected_real_account_id: text('selected_real_account_id'), // The preferred Real account
    selected_demo_account_id: text('selected_demo_account_id'), // The preferred Demo account
    session_updated_at: timestamp('session_updated_at'),
    capital_account_id: text('capital_account_id'),
    account_type: text('account_type').default('demo'),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
    userIdIdx: index('capital_accounts_user_id_idx').on(table.user_id),
}));

// Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(), // 'LOGIN', 'LOGOUT', 'REGISTER', 'REFRESH_TOKEN', etc.
    ip_address: text('ip_address'),
    user_agent: text('user_agent'),
    timestamp: timestamp('timestamp').defaultNow(),
}, (table) => ({
    userIdIdx: index('audit_logs_user_id_idx').on(table.user_id),
}));

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
}, (table) => ({
    userIdIdx: index('engine_settings_user_id_idx').on(table.user_id),
}));

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
}, (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.user_id),
}));

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
    onboarding_status: text('onboarding_status'), // 'REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'
    meet_link: text('meet_link'),
    created_at: timestamp('created_at').defaultNow(),
    closed_at: timestamp('closed_at'),
}, (table) => ({
    userIdIdx: index('tickets_user_id_idx').on(table.user_id),
}));

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
}, (table) => ({
    ticketIdIdx: index('ticket_messages_ticket_id_idx').on(table.ticket_id),
}));

// Internal Ticket Notes (Agents Only)
export const ticketNotes = pgTable('ticket_notes', {
    id: uuid('id').defaultRandom().primaryKey(),
    ticket_id: uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
    agent_id: uuid('agent_id').references(() => supportAgents.id, { onDelete: 'cascade' }).notNull(),
    note: text('note').notNull(),
    created_at: timestamp('created_at').defaultNow(),
});

// 24 Hour Trade History
export const platformTrades = pgTable('platform_trades', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    deal_id: text('deal_id').unique().notNull(),
    epic: text('epic').notNull(),
    direction: text('direction').notNull(),
    size: text('size').notNull(),
    pnl: text('pnl'),
    mode: text('mode').default('demo'), // 'demo' or 'live'
    created_at: timestamp('created_at').defaultNow(),
}, (table) => ({
    userIdIdx: index('platform_trades_user_id_idx').on(table.user_id),
}));

// Closed Trades History
export const closedTrades = pgTable('closed_trades', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    deal_id: text('deal_id').unique().notNull(),
    epic: text('epic').notNull(),
    direction: text('direction').notNull(),
    size: text('size').notNull(),
    open_price: text('open_price'),
    close_price: text('close_price'),
    pnl: text('pnl').notNull(),
    mode: text('mode').default('demo'), // 'demo' or 'live'
    created_at: timestamp('created_at').defaultNow(),
}, (table) => ({
    userIdIdx: index('closed_trades_user_id_idx').on(table.user_id),
}));

// Automation Engine Deployments (Persists State for the Dashboard)
export const automationDeployments = pgTable('automation_deployments', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    engine_id: text('engine_id').notNull(),
    commodity: text('commodity').notNull(),
    allocated_capital: text('allocated_capital').notNull(),
    risk_multiplier: text('risk_multiplier').default('1.0'),
    stop_loss_cap: text('stop_loss_cap').notNull(),
    status: text('status').default('Running'), // 'Running', 'Paused', 'Stopped', 'Cooldown', 'Target Achieved', 'Risk Halted'
    mode: text('mode').default('demo'), // 'demo' or 'live'
    pnl: text('pnl').default('0'), // Running PNL for display
    target_profit: text('target_profit'),
    daily_stop_loss: text('daily_stop_loss'),
    risk_level: text('risk_level').default('Balanced'), // 'Conservative', 'Balanced', 'Aggressive'
    last_decision_reason: text('last_decision_reason'),
    metrics: text('metrics'), // JSON string for performance data
    cooldown_until: timestamp('cooldown_until'),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
    userIdIdx: index('automation_deployments_user_id_idx').on(table.user_id),
}));

// Automation Trades (Strictly deleted exactly 24h after closure per PRD)
export const automationTrades = pgTable('automation_trades', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    deployment_id: uuid('deployment_id').references(() => automationDeployments.id, { onDelete: 'cascade' }),
    engine_id: text('engine_id').notNull(),
    deal_id: text('deal_id').unique().notNull(),
    epic: text('epic').notNull(),
    direction: text('direction').notNull(),
    size: text('size').notNull(),
    open_price: text('open_price'),
    close_price: text('close_price'),
    pnl: text('pnl').notNull(),
    status: text('status').default('Open'), // 'Open' or 'Closed'
    mode: text('mode').default('demo'), // 'demo' or 'live'
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
    userIdIdx: index('automation_trades_user_id_idx').on(table.user_id),
}));

// Academy Classes (Learn Hub Phase 2)
export const learnClasses = pgTable('learn_classes', {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    youtube_url: text('youtube_url').notNull(),
    category: text('category').notNull().default('Beginner'), // 'Beginner', 'Intermediate', 'Advanced'
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

// User Progress in Academy
export const userProgress = pgTable('user_progress', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    class_id: uuid('class_id').references(() => learnClasses.id, { onDelete: 'cascade' }).notNull(),
    is_done: boolean('is_done').default(false),
    updated_at: timestamp('updated_at').defaultNow(),
});

// User Notes for Academy Classes
export const userNotes = pgTable('user_notes', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    class_id: uuid('class_id').references(() => learnClasses.id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    updated_at: timestamp('updated_at').defaultNow(),
});
