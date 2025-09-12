-- Drop the existing users table if it exists
DROP TABLE IF EXISTS users;

-- Create the users table without password_hash
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Add indexes
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_role_idx ON users(role);

-- Add RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Only admins can create users
CREATE POLICY "Only admins can create users" ON users
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Only admins can update users
CREATE POLICY "Only admins can update users" ON users
    FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'admin');

-- Only admins can delete users
CREATE POLICY "Only admins can delete users" ON users
    FOR DELETE
    USING (auth.jwt() ->> 'role' = 'admin');

-- Create user_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update users table to use the enum
ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;

-- Create items table
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create aliases table
CREATE TABLE IF NOT EXISTS aliases (
    id SERIAL PRIMARY KEY,
    alias VARCHAR(255) NOT NULL UNIQUE,
    item_name VARCHAR(255) NOT NULL REFERENCES items(name) ON DELETE CASCADE,
    price_override DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    company_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE,
    event_hours VARCHAR(100),
    special_notes TEXT,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    total_before_discount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_after_discount DECIMAL(10,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    final_total DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quote_items table
CREATE TABLE IF NOT EXISTS quote_items (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    sort_order DECIMAL(10,2) DEFAULT 0,
    parent_item_id INTEGER REFERENCES quote_items(id) ON DELETE CASCADE
);

-- Add sort_order column to existing quote_items table if it doesn't exist
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS sort_order DECIMAL(10,2) DEFAULT 0;

-- Update existing items to have proper sort_order based on their id
UPDATE quote_items SET sort_order = id WHERE sort_order = 0 OR sort_order IS NULL;

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    name VARCHAR(200) GENERATED ALWAYS AS (COALESCE(first_name || ' ' || last_name, first_name, last_name)) STORED,
    phone VARCHAR(50),
    email VARCHAR(255),
    hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create work_hours table
CREATE TABLE IF NOT EXISTS work_hours (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    hours_worked DECIMAL(5,2) NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('email', 'sms', 'push')),
    email_addresses TEXT[] DEFAULT '{}',
    message TEXT,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for items (public read, admin write)
CREATE POLICY "Anyone can view items" ON items FOR SELECT USING (true);
CREATE POLICY "Only admins can modify items" ON items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- Create policies for aliases (public read, admin write)
CREATE POLICY "Anyone can view aliases" ON aliases FOR SELECT USING (true);
CREATE POLICY "Only admins can modify aliases" ON aliases FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- Create policies for clients (authenticated users can read, admin write)
CREATE POLICY "Authenticated users can view clients" ON clients FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only admins can modify clients" ON clients FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- Create policies for quotes (authenticated users can read, admin write)
CREATE POLICY "Authenticated users can view quotes" ON quotes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only admins can modify quotes" ON quotes FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- Create policies for quote_items (authenticated users can read, admin write)
CREATE POLICY "Authenticated users can view quote_items" ON quote_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only admins can modify quote_items" ON quote_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- Create policies for employees (authenticated users can read, admin write)
CREATE POLICY "Authenticated users can view employees" ON employees FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only admins can modify employees" ON employees FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- Create policies for work_hours (authenticated users can read, admin write)
CREATE POLICY "Authenticated users can view work_hours" ON work_hours FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only admins can modify work_hours" ON work_hours FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- Create policies for reminders (authenticated users can read, admin write)
CREATE POLICY "Authenticated users can view reminders" ON reminders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only admins can modify reminders" ON reminders FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);