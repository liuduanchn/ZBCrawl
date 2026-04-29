\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'tender_user'
  ) THEN
    CREATE ROLE tender_user WITH LOGIN PASSWORD '3380018';
  END IF;
END
$$;

SELECT 'CREATE DATABASE tender_db OWNER tender_user'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = 'tender_db'
)
\gexec

\connect tender_db

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schools (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence VARCHAR(10),
  name VARCHAR(255) NOT NULL,
  region VARCHAR(100),
  school_type VARCHAR(50),
  high_level VARCHAR(10),
  education_level VARCHAR(50),
  detail_url TEXT,
  website TEXT,
  crawl_source_url TEXT,
  crawl_source_name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS schools_name_idx ON schools(name);

CREATE TABLE IF NOT EXISTS tenders (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name VARCHAR(255) NOT NULL,
  crawled_at TIMESTAMPTZ NOT NULL,
  link TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tenders_school_name_idx ON tenders(school_name);
CREATE INDEX IF NOT EXISTS tenders_crawled_at_idx ON tenders(crawled_at);

CREATE TABLE IF NOT EXISTS crawl_progress (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_type VARCHAR(50) NOT NULL,
  school_name VARCHAR(255),
  current_index INTEGER NOT NULL DEFAULT 0,
  total_schools INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  completed_schools INTEGER NOT NULL DEFAULT 0,
  failed_schools INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  last_crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crawl_progress_crawl_type_idx ON crawl_progress(crawl_type);
CREATE INDEX IF NOT EXISTS crawl_progress_status_idx ON crawl_progress(status);

CREATE TABLE IF NOT EXISTS crawl_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_type VARCHAR(50) NOT NULL,
  regions TEXT,
  keywords TEXT,
  total_schools INTEGER NOT NULL DEFAULT 0,
  success_schools INTEGER NOT NULL DEFAULT 0,
  failed_schools INTEGER NOT NULL DEFAULT 0,
  tender_count INTEGER NOT NULL DEFAULT 0,
  tender_data TEXT,
  duration INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crawl_history_crawl_type_idx ON crawl_history(crawl_type);
CREATE INDEX IF NOT EXISTS crawl_history_started_at_idx ON crawl_history(started_at);

CREATE TABLE IF NOT EXISTS keywords (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  is_default INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS keywords_category_idx ON keywords(category);
CREATE INDEX IF NOT EXISTS keywords_name_idx ON keywords(name);

CREATE TABLE IF NOT EXISTS excluded_domains (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS excluded_domains_domain_idx ON excluded_domains(domain);

INSERT INTO keywords (name, category, is_default, is_active)
SELECT '培训', 'search', 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM keywords WHERE name = '培训' AND category = 'search'
);

INSERT INTO keywords (name, category, is_default, is_active)
SELECT '招标', 'search', 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM keywords WHERE name = '招标' AND category = 'search'
);

INSERT INTO keywords (name, category, is_default, is_active)
SELECT '采购', 'search', 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM keywords WHERE name = '采购' AND category = 'search'
);

ALTER DATABASE tender_db OWNER TO tender_user;
ALTER SCHEMA public OWNER TO tender_user;

GRANT ALL PRIVILEGES ON DATABASE tender_db TO tender_user;
GRANT USAGE, CREATE ON SCHEMA public TO tender_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tender_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tender_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO tender_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO tender_user;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO tender_user;', r.tablename);
  END LOOP;

  FOR r IN
    SELECT sequencename
    FROM pg_sequences
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO tender_user;', r.sequencename);
  END LOOP;
END
$$;
