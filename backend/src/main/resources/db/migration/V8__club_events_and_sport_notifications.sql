CREATE TABLE events (
    id UUID PRIMARY KEY,
    season_id UUID NOT NULL REFERENCES seasons(id),
    type VARCHAR(8) NOT NULL CHECK (type IN ('TRAINING','MATCH','OTHER')),
    title VARCHAR(160) NOT NULL CHECK (length(trim(title)) > 0),
    description VARCHAR(4000),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    location VARCHAR(200),
    status VARCHAR(10) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','CANCELLED','COMPLETED')),
    availability_deadline TIMESTAMPTZ,
    nomination_published_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0),
    CHECK (ends_at > starts_at),
    CHECK (availability_deadline IS NULL OR availability_deadline <= starts_at)
);
CREATE INDEX ix_events_season_start ON events(season_id,starts_at);
CREATE INDEX ix_events_start ON events(starts_at,id);

CREATE TABLE event_teams (
    event_id UUID NOT NULL REFERENCES events(id),
    team_season_id UUID NOT NULL REFERENCES team_seasons(id),
    PRIMARY KEY (event_id,team_season_id)
);
CREATE INDEX ix_event_teams_team ON event_teams(team_season_id,event_id);

CREATE TABLE matches (
    event_id UUID PRIMARY KEY REFERENCES events(id),
    version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0),
    competition_season_id UUID,
    match_format_id UUID NOT NULL REFERENCES match_formats(id),
    home_team_season_id UUID NOT NULL REFERENCES team_seasons(id),
    away_team_season_id UUID NOT NULL REFERENCES team_seasons(id),
    FOREIGN KEY (competition_season_id,match_format_id) REFERENCES competition_seasons(id,match_format_id),
    FOREIGN KEY (competition_season_id,home_team_season_id) REFERENCES competition_entries(competition_season_id,team_season_id),
    FOREIGN KEY (competition_season_id,away_team_season_id) REFERENCES competition_entries(competition_season_id,team_season_id),
    CHECK (home_team_season_id <> away_team_season_id)
);
CREATE INDEX ix_matches_competition ON matches(competition_season_id);

CREATE TABLE event_participants (
    event_id UUID NOT NULL,
    player_id UUID NOT NULL REFERENCES player_profiles(id),
    team_season_id UUID NOT NULL,
    version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0),
    availability VARCHAR(11) CHECK (availability IN ('UNKNOWN','AVAILABLE','UNAVAILABLE')),
    availability_comment VARCHAR(500),
    availability_by UUID REFERENCES users(id),
    availability_at TIMESTAMPTZ,
    nomination VARCHAR(12) CHECK (nomination IN ('NOT_SELECTED','SELECTED','RESERVE')),
    nomination_by UUID REFERENCES users(id),
    nomination_at TIMESTAMPTZ,
    published_nomination VARCHAR(12) CHECK (published_nomination IN ('NOT_SELECTED','SELECTED','RESERVE')),
    attendance VARCHAR(7) CHECK (attendance IN ('PRESENT','ABSENT','EXCUSED','LATE')),
    attendance_comment VARCHAR(500),
    attendance_by UUID REFERENCES users(id),
    attendance_at TIMESTAMPTZ,
    played BOOLEAN,
    played_by UUID REFERENCES users(id),
    played_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    withdrawal_reason VARCHAR(500),
    PRIMARY KEY (event_id,player_id),
    FOREIGN KEY (event_id,team_season_id) REFERENCES event_teams(event_id,team_season_id),
    CHECK (num_nonnulls(availability,availability_by,availability_at) IN (0,3)),
    CHECK (availability IS NOT NULL OR availability_comment IS NULL),
    CHECK (num_nonnulls(nomination,nomination_by,nomination_at) IN (0,3)),
    CHECK (num_nonnulls(attendance,attendance_by,attendance_at) IN (0,3)),
    CHECK (attendance IS NOT NULL OR attendance_comment IS NULL),
    CHECK (num_nonnulls(played,played_by,played_at) IN (0,3)),
    CHECK (played IS DISTINCT FROM TRUE OR COALESCE(attendance IN ('PRESENT','LATE'),FALSE)),
    CHECK (num_nonnulls(withdrawn_at,withdrawal_reason) IN (0,2)),
    CHECK (withdrawn_at IS NULL OR (length(trim(withdrawal_reason)) > 0 AND attendance IS NULL AND played IS NULL))
);
CREATE INDEX ix_event_participants_player ON event_participants(player_id,event_id);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    type VARCHAR(24) NOT NULL CHECK (type IN ('EVENT_CREATED','EVENT_CHANGED','EVENT_CANCELLED','NOMINATION_PUBLISHED','NOMINATION_CHANGED')),
    event_id UUID NOT NULL REFERENCES events(id),
    title VARCHAR(160) NOT NULL,
    body VARCHAR(2000) NOT NULL,
    deduplication_key VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX ix_notifications_event ON notifications(event_id);
CREATE TABLE notification_deliveries (
    notification_id UUID NOT NULL REFERENCES notifications(id),
    recipient_id UUID NOT NULL REFERENCES users(id),
    delivered_at TIMESTAMPTZ NOT NULL,
    read_at TIMESTAMPTZ,
    PRIMARY KEY (notification_id,recipient_id),
    CHECK (read_at IS NULL OR read_at >= delivered_at)
);
CREATE INDEX ix_notification_deliveries_recipient ON notification_deliveries(recipient_id,notification_id);

CREATE FUNCTION p5_event_season_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE season_start DATE; season_end DATE; season_archived BOOLEAN;
BEGIN
    SELECT starts_on,ends_on,archived INTO season_start,season_end,season_archived FROM seasons WHERE id=NEW.season_id;
    IF season_archived OR NEW.starts_at < (season_start::timestamp AT TIME ZONE 'Europe/Prague')
        OR NEW.ends_at > (season_end::timestamp AT TIME ZONE 'Europe/Prague') THEN
        RAISE EXCEPTION 'Event outside an open season' USING ERRCODE='23514';
    END IF;
    IF TG_OP='UPDATE' AND (NEW.id,NEW.season_id,NEW.type) IS DISTINCT FROM (OLD.id,OLD.season_id,OLD.type) THEN
        RAISE EXCEPTION 'Event identity is immutable' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER event_season_guard BEFORE INSERT OR UPDATE ON events FOR EACH ROW EXECUTE FUNCTION p5_event_season_guard();

CREATE FUNCTION p5_season_dates_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF (NEW.starts_on,NEW.ends_on) IS DISTINCT FROM (OLD.starts_on,OLD.ends_on)
        AND EXISTS (SELECT 1 FROM events WHERE season_id=OLD.id) THEN
        RAISE EXCEPTION 'Season dates in use by calendar' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER event_season_dates_guard BEFORE UPDATE ON seasons FOR EACH ROW EXECUTE FUNCTION p5_season_dates_guard();

CREATE FUNCTION p5_participant_played_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.played IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM matches WHERE event_id=NEW.event_id AND NEW.team_season_id IN (home_team_season_id,away_team_season_id)
    ) THEN
        RAISE EXCEPTION 'Played requires a match side' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER event_participant_played_guard BEFORE INSERT OR UPDATE ON event_participants
    FOR EACH ROW EXECUTE FUNCTION p5_participant_played_guard();

CREATE FUNCTION p5_event_team_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM events e JOIN team_seasons ts ON ts.season_id=e.season_id JOIN teams t ON t.id=ts.team_id
        WHERE e.id=NEW.event_id AND ts.id=NEW.team_season_id AND t.is_club_team
    ) THEN
        RAISE EXCEPTION 'Event team requires a club team from its season' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER event_team_guard BEFORE INSERT OR UPDATE ON event_teams FOR EACH ROW EXECUTE FUNCTION p5_event_team_guard();

CREATE FUNCTION p5_match_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM events e JOIN team_seasons home ON home.season_id=e.season_id
        JOIN team_seasons away ON away.season_id=e.season_id
        JOIN teams ht ON ht.id=home.team_id JOIN teams at ON at.id=away.team_id
        JOIN match_formats f ON f.sport_id=ht.sport_id AND f.sport_id=at.sport_id
        WHERE e.id=NEW.event_id AND e.type='MATCH' AND home.id=NEW.home_team_season_id
        AND away.id=NEW.away_team_season_id AND f.id=NEW.match_format_id
        AND (NEW.competition_season_id IS NULL OR EXISTS (
            SELECT 1 FROM competition_seasons cs WHERE cs.id=NEW.competition_season_id AND cs.season_id=e.season_id
        ))
        AND ht.is_club_team=EXISTS (SELECT 1 FROM event_teams et WHERE et.event_id=e.id AND et.team_season_id=home.id)
        AND at.is_club_team=EXISTS (SELECT 1 FROM event_teams et WHERE et.event_id=e.id AND et.team_season_id=away.id)
        AND NOT EXISTS (SELECT 1 FROM event_teams et WHERE et.event_id=e.id AND et.team_season_id NOT IN (home.id,away.id))
    ) THEN
        RAISE EXCEPTION 'Inconsistent match teams or format' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER match_guard BEFORE INSERT OR UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION p5_match_guard();
