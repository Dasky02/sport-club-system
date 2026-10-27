-- Additive přechod: neodvozujeme osobní údaje ani vztahy z přihlašovacího jména.
CREATE TABLE persons (
    id UUID PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL CHECK (length(trim(first_name)) > 0),
    last_name VARCHAR(100) NOT NULL CHECK (length(trim(last_name)) > 0),
    birth_date DATE,
    email VARCHAR(254),
    phone VARCHAR(40)
);

ALTER TABLE users ADD COLUMN person_id UUID UNIQUE REFERENCES persons(id);
ALTER TABLE users ADD COLUMN account_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD';
ALTER TABLE users ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT TRUE;
-- Pouze neveřejná migrační evidence. Aplikace z ní nikdy neodvozuje oprávnění.
ALTER TABLE users ADD COLUMN legacy_role VARCHAR(20);
UPDATE users SET legacy_role = role;
UPDATE users SET role = 'USER' WHERE role IN ('COACH', 'PLAYER', 'PARENT');
ALTER TABLE users DROP CONSTRAINT ck_users_role;
ALTER TABLE users ADD CONSTRAINT ck_users_role CHECK (role IN ('ADMIN', 'USER'));
ALTER TABLE users ADD CONSTRAINT ck_users_account_type CHECK (account_type IN ('STANDARD', 'CHILD'));
ALTER TABLE users ADD CONSTRAINT ck_users_child_role CHECK (account_type <> 'CHILD' OR role = 'USER');
ALTER TABLE users ADD CONSTRAINT ck_users_legacy_role CHECK (legacy_role IS NULL OR legacy_role IN ('ADMIN', 'USER', 'COACH', 'PLAYER', 'PARENT'));

CREATE TABLE club (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    name VARCHAR(120) NOT NULL,
    setup_completed_at TIMESTAMP WITH TIME ZONE,
    setup_completed_by UUID REFERENCES users(id),
    CHECK (num_nonnulls(setup_completed_at, setup_completed_by) IN (0, 2))
);
INSERT INTO club (id, name) VALUES (1, 'Sportovní klub');

CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    actor_user_id UUID REFERENCES users(id),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    action VARCHAR(80) NOT NULL CHECK (length(trim(action)) > 0),
    entity_type VARCHAR(60) NOT NULL CHECK (length(trim(entity_type)) > 0),
    entity_key JSONB NOT NULL CHECK (jsonb_typeof(entity_key) = 'object' AND entity_key <> '{}'::jsonb),
    reason VARCHAR(500)
);
CREATE INDEX ix_audit_target ON audit_log(entity_type, entity_key, occurred_at);
CREATE INDEX ix_audit_actor ON audit_log(actor_user_id, occurred_at);
INSERT INTO audit_log (id, occurred_at, action, entity_type, entity_key, reason)
SELECT gen_random_uuid(), CURRENT_TIMESTAMP, 'LEGACY_ROLE_MIGRATED', 'users', jsonb_build_object('id', id::text),
       'Původní klubová role archivována; nová oprávnění vyžadují ověřené vazby.'
FROM users WHERE legacy_role IN ('COACH', 'PLAYER', 'PARENT');

-- Již spravovanou instalaci nesmí převzít další žadatel pomocí setup tokenu.
UPDATE club SET setup_completed_at = CURRENT_TIMESTAMP,
                setup_completed_by = (SELECT id FROM users WHERE role = 'ADMIN' ORDER BY created_at, id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'ADMIN');
INSERT INTO audit_log (id, occurred_at, action, entity_type, entity_key, reason)
SELECT gen_random_uuid(), CURRENT_TIMESTAMP, 'SETUP_MIGRATED', 'club', jsonb_build_object('id', id),
       'Zachována existující administrátorská správa instalace.'
FROM club WHERE setup_completed_at IS NOT NULL;

CREATE TABLE sports (
    id UUID PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE CHECK (code ~ '^[A-Z][A-Z0-9_]{0,39}$'),
    name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
    active BOOLEAN NOT NULL DEFAULT TRUE
);
