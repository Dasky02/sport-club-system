-- Session je po bezpečnostní změně trvale odvolaná, i když je účet později znovu aktivován.
ALTER TABLE users ADD COLUMN auth_revision BIGINT NOT NULL DEFAULT 0 CHECK (auth_revision >= 0);

-- P2 CHILD ještě nebyl platný přihlašovací účet. Historické neúplné identity neopravujeme odhadem.
UPDATE users SET enabled=FALSE,auth_revision=auth_revision+1 WHERE account_type='CHILD';

CREATE FUNCTION p3_has_active_guardian(child_person UUID) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM player_profiles pp JOIN guardian_links gl ON gl.player_id=pp.id
        JOIN users parent ON parent.person_id=gl.guardian_person_id
        WHERE pp.person_id=child_person AND gl.revoked_at IS NULL
          AND parent.enabled AND parent.account_type='STANDARD' AND parent.person_id<>child_person
    )
$$;

CREATE FUNCTION p3_user_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP='UPDATE' THEN
        IF OLD.person_id IS NOT NULL AND NEW.person_id IS DISTINCT FROM OLD.person_id THEN
            RAISE EXCEPTION 'Account person is immutable' USING ERRCODE='23514';
        END IF;
        IF (NEW.enabled,NEW.role,NEW.account_type,NEW.person_id,NEW.password_hash)
              IS DISTINCT FROM (OLD.enabled,OLD.role,OLD.account_type,OLD.person_id,OLD.password_hash) THEN
            NEW.auth_revision=OLD.auth_revision+1;
        ELSE NEW.auth_revision=OLD.auth_revision;
        END IF;
    END IF;
    IF NEW.account_type='CHILD' THEN
        IF NEW.role<>'USER' OR NEW.person_id IS NULL OR
              NOT EXISTS(SELECT 1 FROM player_profiles WHERE person_id=NEW.person_id) THEN
            RAISE EXCEPTION 'Child account requires own player profile and USER role' USING ERRCODE='23514';
        END IF;
        IF EXISTS(SELECT 1 FROM guardian_links WHERE guardian_person_id=NEW.person_id AND revoked_at IS NULL) THEN
            RAISE EXCEPTION 'Child account cannot be a guardian' USING ERRCODE='23514';
        END IF;
        IF EXISTS(SELECT 1 FROM coach_team_memberships WHERE coach_user_id=NEW.id) THEN
            RAISE EXCEPTION 'Child cannot be a coach' USING ERRCODE='23514';
        END IF;
        IF NEW.enabled AND NOT p3_has_active_guardian(NEW.person_id) THEN
            RAISE EXCEPTION 'Enabled child requires active guardian' USING ERRCODE='23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER p3_user_guard BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION p3_user_guard();

CREATE FUNCTION p3_disable_orphan_children() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF pg_trigger_depth()>1 THEN RETURN NULL; END IF;
    -- Další změna povoleného rodiče nikdy dítě automaticky nezapne.
    UPDATE users child SET enabled=FALSE
      WHERE child.account_type='CHILD' AND child.enabled
        AND NOT p3_has_active_guardian(child.person_id);
    RETURN NULL;
END $$;
CREATE TRIGGER p3_parent_account_changed AFTER UPDATE OF enabled,account_type,person_id ON users
    FOR EACH STATEMENT EXECUTE FUNCTION p3_disable_orphan_children();
CREATE TRIGGER p3_guardian_changed AFTER INSERT OR UPDATE OR DELETE ON guardian_links
    FOR EACH STATEMENT EXECUTE FUNCTION p3_disable_orphan_children();

CREATE FUNCTION p3_guardian_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP='UPDATE' AND (NEW.guardian_person_id,NEW.player_id) IS DISTINCT FROM (OLD.guardian_person_id,OLD.player_id) THEN
        RAISE EXCEPTION 'Guardian relation identity immutable' USING ERRCODE='23514';
    END IF;
    IF NEW.revoked_at IS NULL THEN
        IF EXISTS(SELECT 1 FROM player_profiles WHERE id=NEW.player_id AND person_id=NEW.guardian_person_id) THEN
            RAISE EXCEPTION 'Self guardian relation is forbidden' USING ERRCODE='23514';
        END IF;
        IF EXISTS(WITH RECURSIVE descendants(person_id) AS (SELECT pp.person_id FROM guardian_links gl JOIN player_profiles pp ON pp.id=gl.player_id WHERE gl.guardian_person_id=(SELECT person_id FROM player_profiles WHERE id=NEW.player_id) AND gl.revoked_at IS NULL UNION SELECT pp.person_id FROM descendants d JOIN guardian_links gl ON gl.guardian_person_id=d.person_id JOIN player_profiles pp ON pp.id=gl.player_id WHERE gl.revoked_at IS NULL) SELECT 1 FROM descendants WHERE person_id=NEW.guardian_person_id) THEN
            RAISE EXCEPTION 'Guardian cycle forbidden' USING ERRCODE='23514';
        END IF;
        IF EXISTS(SELECT 1 FROM users WHERE person_id=NEW.guardian_person_id AND account_type='CHILD') THEN
            RAISE EXCEPTION 'Child cannot be a guardian' USING ERRCODE='23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER p3_guardian_guard BEFORE INSERT OR UPDATE ON guardian_links FOR EACH ROW EXECUTE FUNCTION p3_guardian_guard();
