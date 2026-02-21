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
    encrypted_api_key: text('encrypted_api_key').notNull(),
    api_key_hash: text('api_key_hash').unique(), // For uniqueness enforcement
    encrypted_api_secret: text('encrypted_api_secret'), // Optional depending on requirement
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

// System Settings Table (Global Config & Master Credentials)
export const systemSettings = pgTable('system_settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updated_at: timestamp('updated_at').defaultNow(),
});
