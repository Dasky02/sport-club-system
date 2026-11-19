CREATE OR REPLACE FUNCTION p4_competition_season_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE competition_sport UUID; format_sport UUID; archived_season BOOLEAN;
BEGIN
    IF TG_OP='DELETE' THEN
        IF OLD.locked_at IS NOT NULL THEN
            RAISE EXCEPTION 'Competition season history is immutable' USING ERRCODE='23514';
        END IF;
        RETURN OLD;
    END IF;
    SELECT sport_id INTO competition_sport FROM competitions WHERE id=NEW.competition_id;
    SELECT sport_id INTO format_sport FROM match_formats WHERE id=NEW.match_format_id;
    SELECT archived INTO archived_season FROM seasons WHERE id=NEW.season_id;
    IF competition_sport IS DISTINCT FROM format_sport THEN
        RAISE EXCEPTION 'Competition and format must share sport' USING ERRCODE='23514';
    END IF;
    IF TG_OP='INSERT' AND archived_season THEN
        RAISE EXCEPTION 'Season archived' USING ERRCODE='23514';
    END IF;
    IF TG_OP='UPDATE' THEN
        IF (NEW.id,NEW.competition_id,NEW.season_id) IS DISTINCT FROM
           (OLD.id,OLD.competition_id,OLD.season_id) THEN
            RAISE EXCEPTION 'Competition season identity is immutable' USING ERRCODE='23514';
        END IF;
        IF NEW.match_format_id IS DISTINCT FROM OLD.match_format_id
           AND (OLD.locked_at IS NOT NULL OR NEW.locked_at IS NOT NULL OR archived_season) THEN
            RAISE EXCEPTION 'Competition season format is locked' USING ERRCODE='23514';
        END IF;
        IF OLD.locked_at IS NOT NULL AND NEW.locked_at IS DISTINCT FROM OLD.locked_at THEN
            RAISE EXCEPTION 'Competition season cannot be unlocked' USING ERRCODE='23514';
        END IF;
        IF (OLD.locked_at IS NOT NULL OR archived_season) AND
           (NEW.head_to_head_missing_policy,NEW.head_to_head_meetings_per_pair,NEW.restart_head_to_head_on_subgroup) IS DISTINCT FROM
           (OLD.head_to_head_missing_policy,OLD.head_to_head_meetings_per_pair,OLD.restart_head_to_head_on_subgroup) THEN
            RAISE EXCEPTION 'Competition configuration locked' USING ERRCODE='23514';
        END IF;
        IF NEW.results_revision < OLD.results_revision THEN
            RAISE EXCEPTION 'Results revision cannot decrease' USING ERRCODE='23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;
