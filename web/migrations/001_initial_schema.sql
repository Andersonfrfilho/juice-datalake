-- Migration 001: Schema inicial do Juice Data Lake
-- Data: 2024-07-01
-- Descrição: Cria todas as tabelas, índices e constraints

-- ═══════════════ TABELAS ═══════════════

CREATE TABLE IF NOT EXISTS representatives (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    region VARCHAR(20) NOT NULL,
    performance_score DECIMAL(3,1) DEFAULT 3.0,
    hire_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    flavor VARCHAR(50) NOT NULL,
    size_ml INT NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    sell_price DECIMAL(10,2) NOT NULL,
    marketing_cost_pct DECIMAL(4,1) DEFAULT 10.0,
    logistics_cost_pct DECIMAL(4,1) DEFAULT 8.0,
    packaging_cost_pct DECIMAL(4,1) DEFAULT 5.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state CHAR(2) NOT NULL,
    region VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    representative_id INT REFERENCES representatives(id),
    opened_at DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id),
    store_id INT NOT NULL REFERENCES stores(id),
    representative_id INT REFERENCES representatives(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    sale_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS returns (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id),
    store_id INT NOT NULL REFERENCES stores(id),
    representative_id INT REFERENCES representatives(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    reason VARCHAR(30) NOT NULL,
    return_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    representative_id INT REFERENCES representatives(id),
    region VARCHAR(20) NOT NULL,
    weekly_fuel_cost DECIMAL(10,2) NOT NULL,
    weekly_toll_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    weekly_vehicle_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    weekly_distance_km INT NOT NULL DEFAULT 0,
    total_weekly_cost DECIMAL(10,2) GENERATED ALWAYS AS (
        weekly_fuel_cost + weekly_toll_cost + weekly_vehicle_cost
    ) STORED,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_stores (
    id SERIAL PRIMARY KEY,
    route_id INT REFERENCES routes(id) ON DELETE CASCADE,
    store_id INT REFERENCES stores(id) ON DELETE CASCADE,
    visit_day VARCHAR(10) NOT NULL,
    visit_order INT DEFAULT 1,
    visit_duration_min INT DEFAULT 30,
    distance_from_prev_km DECIMAL(5,1) DEFAULT 0,
    UNIQUE(route_id, store_id)
);

CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    state CHAR(2) NOT NULL,
    region VARCHAR(20) NOT NULL,
    population_estimate INT,
    UNIQUE(name, state)
);

-- ═══════════════ ÍNDICES ═══════════════

CREATE INDEX IF NOT EXISTS idx_representatives_region ON representatives(region);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_representative_id ON sales(representative_id);
CREATE INDEX IF NOT EXISTS idx_stores_representative_id ON stores(representative_id);
CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(return_date);
CREATE INDEX IF NOT EXISTS idx_returns_representative_id ON returns(representative_id);
CREATE INDEX IF NOT EXISTS idx_routes_representative ON routes(representative_id);
CREATE INDEX IF NOT EXISTS idx_route_stores_route ON route_stores(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stores_store ON route_stores(store_id);

-- ═══════════════ TABELA DE MIGRATIONS ═══════════════

CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT NOW()
);
