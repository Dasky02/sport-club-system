CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE seasons (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (ends_on > starts_on)
);
CREATE TABLE teams (
    id UUID PRIMARY KEY,
    sport_id UUID NOT NULL REFERENCES sports(id),
    name VARCHAR(120) NOT NULL CHECK (length(trim(name)) > 0),
    is_club_team BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX ix_teams_sport ON teams(sport_id);
CREATE TABLE team_seasons (
    id UUID PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id),
    season_id UUID NOT NULL REFERENCES seasons(id),
    display_name VARCHAR(120) NOT NULL CHECK (length(trim(display_name)) > 0),
    UNIQUE (team_id, season_id)
);
CREATE INDEX ix_team_seasons_season ON team_seasons(season_id);
CREATE TABLE player_profiles (
    id UUID PRIMARY KEY,
    person_id UUID NOT NULL UNIQUE REFERENCES persons(id)
);
CREATE TABLE guardian_links (
    guardian_person_id UUID NOT NULL REFERENCES persons(id),
    player_id UUID NOT NULL REFERENCES player_profiles(id),
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (guardian_person_id,player_id),
    CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);
CREATE INDEX ix_guardian_player ON guardian_links(player_id,guardian_person_id);
CREATE TABLE player_team_memberships (
    id UUID PRIMARY KEY,
    team_season_id UUID NOT NULL REFERENCES team_seasons(id),
    player_id UUID NOT NULL REFERENCES player_profiles(id),
    valid_from DATE NOT NULL,
    valid_to DATE,
    CHECK (valid_to IS NULL OR valid_to > valid_from),
    UNIQUE (team_season_id,player_id,valid_from),
    EXCLUDE USING gist (team_season_id WITH =, player_id WITH =, daterange(valid_from,valid_to,'[)') WITH &&)
);
CREATE INDEX ix_player_membership_player ON player_team_memberships(player_id,team_season_id);
CREATE TABLE coach_team_memberships (
    id UUID PRIMARY KEY,
    team_season_id UUID NOT NULL REFERENCES team_seasons(id),
    coach_user_id UUID NOT NULL REFERENCES users(id),
    valid_from DATE NOT NULL,
    valid_to DATE,
    CHECK (valid_to IS NULL OR valid_to > valid_from),
    UNIQUE (team_season_id,coach_user_id,valid_from),
    EXCLUDE USING gist (team_season_id WITH =, coach_user_id WITH =, daterange(valid_from,valid_to,'[)') WITH &&)
);
CREATE INDEX ix_coach_membership_user ON coach_team_memberships(coach_user_id,team_season_id);

-- DB pojistky nenahrazují autorizaci a club lock v aplikační službě.
CREATE FUNCTION p2_membership_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE season_start DATE; season_end DATE; season_archived BOOLEAN; club_team BOOLEAN;
BEGIN
    SELECT s.starts_on,s.ends_on,s.archived,t.is_club_team
      INTO season_start,season_end,season_archived,club_team
      FROM team_seasons ts JOIN seasons s ON s.id=ts.season_id JOIN teams t ON t.id=ts.team_id
      WHERE ts.id=NEW.team_season_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unknown team season' USING ERRCODE='23503'; END IF;
    IF season_archived OR NOT club_team THEN
        RAISE EXCEPTION 'Membership configuration locked' USING ERRCODE='23514';
    END IF;
    IF NEW.valid_from < season_start OR NEW.valid_from >= season_end OR
       (NEW.valid_to IS NOT NULL AND (NEW.valid_to > season_end OR NEW.valid_to <= NEW.valid_from)) THEN
        RAISE EXCEPTION 'Membership outside season' USING ERRCODE='23514';
    END IF;
    IF TG_OP='UPDATE' THEN
        IF NEW.team_season_id IS DISTINCT FROM OLD.team_season_id THEN
            RAISE EXCEPTION 'Membership identity immutable' USING ERRCODE='23514';
        END IF;
        IF TG_TABLE_NAME='player_team_memberships' THEN
            IF NEW.player_id IS DISTINCT FROM OLD.player_id THEN
                RAISE EXCEPTION 'Membership identity immutable' USING ERRCODE='23514';
            END IF;
        ELSE
            IF NEW.coach_user_id IS DISTINCT FROM OLD.coach_user_id THEN
                RAISE EXCEPTION 'Membership identity immutable' USING ERRCODE='23514';
            END IF;
        END IF;
    END IF;
    IF TG_TABLE_NAME='coach_team_memberships' THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.coach_user_id AND enabled AND account_type='STANDARD' AND person_id IS NOT NULL) THEN
            RAISE EXCEPTION 'Coach account not eligible' USING ERRCODE='23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER player_membership_guard BEFORE INSERT OR UPDATE ON player_team_memberships FOR EACH ROW EXECUTE FUNCTION p2_membership_guard();
CREATE TRIGGER coach_membership_guard BEFORE INSERT OR UPDATE ON coach_team_memberships FOR EACH ROW EXECUTE FUNCTION p2_membership_guard();

CREATE FUNCTION p2_player_dob_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME='player_profiles' THEN
        IF TG_OP='UPDATE' AND NEW.person_id IS DISTINCT FROM OLD.person_id THEN
            RAISE EXCEPTION 'Player identity immutable' USING ERRCODE='23514';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM persons WHERE id=NEW.person_id AND birth_date IS NOT NULL) THEN
            RAISE EXCEPTION 'Player requires birth date' USING ERRCODE='23514';
        END IF;
    ELSE
        IF NEW.birth_date IS NULL AND EXISTS (SELECT 1 FROM player_profiles WHERE person_id=NEW.id) THEN
            RAISE EXCEPTION 'Player requires birth date' USING ERRCODE='23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER player_dob_guard BEFORE INSERT OR UPDATE ON player_profiles FOR EACH ROW EXECUTE FUNCTION p2_player_dob_guard();
CREATE TRIGGER person_player_dob_guard BEFORE UPDATE ON persons FOR EACH ROW EXECUTE FUNCTION p2_player_dob_guard();

CREATE FUNCTION p2_season_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.archived AND NEW IS DISTINCT FROM OLD THEN
        RAISE EXCEPTION 'Season archived' USING ERRCODE='23514';
    END IF;
    IF (NEW.starts_on,NEW.ends_on) IS DISTINCT FROM (OLD.starts_on,OLD.ends_on)
       AND EXISTS (SELECT 1 FROM team_seasons WHERE season_id=OLD.id) THEN
        RAISE EXCEPTION 'Season dates in use' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER season_guard BEFORE UPDATE ON seasons FOR EACH ROW EXECUTE FUNCTION p2_season_guard();
CREATE FUNCTION p2_team_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF (NEW.sport_id,NEW.is_club_team) IS DISTINCT FROM (OLD.sport_id,OLD.is_club_team)
       AND EXISTS (SELECT 1 FROM team_seasons WHERE team_id=OLD.id) THEN
        RAISE EXCEPTION 'Team configuration in use' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER team_guard BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION p2_team_guard();
CREATE FUNCTION p2_team_season_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE archived_season BOOLEAN; active_sport BOOLEAN;
BEGIN
    SELECT s.archived INTO archived_season FROM seasons s WHERE s.id=NEW.season_id;
    IF archived_season THEN RAISE EXCEPTION 'Season archived' USING ERRCODE='23514'; END IF;
    IF TG_OP='UPDATE' AND (NEW.team_id,NEW.season_id) IS DISTINCT FROM (OLD.team_id,OLD.season_id) THEN
        RAISE EXCEPTION 'Team season identity immutable' USING ERRCODE='23514';
    END IF;
    IF TG_OP='INSERT' THEN
        SELECT s.active INTO active_sport FROM teams t JOIN sports s ON s.id=t.sport_id WHERE t.id=NEW.team_id;
        IF NOT active_sport THEN RAISE EXCEPTION 'Sport inactive' USING ERRCODE='23514'; END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER team_season_guard BEFORE INSERT OR UPDATE ON team_seasons FOR EACH ROW EXECUTE FUNCTION p2_team_season_guard();
