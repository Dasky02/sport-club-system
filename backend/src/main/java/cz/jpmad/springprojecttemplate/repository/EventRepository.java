package cz.jpmad.springprojecttemplate.repository;

import cz.jpmad.springprojecttemplate.api.event.EventDtos.*;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.model.user.enums.AccountType;
import cz.jpmad.springprojecttemplate.model.user.enums.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class EventRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public static final String COACH = """
            :standard AND EXISTS (
                SELECT 1 FROM coach_team_memberships c WHERE c.team_season_id=et.team_season_id
                AND c.coach_user_id=:actor AND c.valid_from<=:today AND (c.valid_to IS NULL OR c.valid_to>:today)
                AND EXISTS (SELECT 1 FROM team_seasons ct JOIN seasons cs ON cs.id=ct.season_id
                    WHERE ct.id=c.team_season_id AND cs.ends_on>:today)
            )
            """;
    private static final String OWNS_PLAYER = """
            (pp.person_id=:person OR (:standard AND EXISTS (
                SELECT 1 FROM guardian_links g WHERE g.player_id=pp.id
                AND g.guardian_person_id=:person AND g.revoked_at IS NULL
            )))
            """;
    private static final String CAN_MANAGE = """
            (:admin OR (EXISTS (SELECT 1 FROM event_teams et WHERE et.event_id=e.id)
                AND NOT EXISTS (SELECT 1 FROM event_teams et WHERE et.event_id=e.id AND NOT (%s))))
            """.formatted(COACH);
    private static final String CAN_READ = """
            (:admin OR EXISTS (SELECT 1 FROM event_teams et WHERE et.event_id=e.id AND (%s))
                OR (e.status<>'DRAFT' AND EXISTS (
                    SELECT 1 FROM event_participants ep JOIN player_profiles pp ON pp.id=ep.player_id
                    WHERE ep.event_id=e.id AND %s
                )))
            """.formatted(COACH, OWNS_PLAYER);
    private static final String EVENT_SELECT = "SELECT e.*, " + CAN_MANAGE + " AS can_manage FROM events e WHERE " + CAN_READ;
    private static final String TEAM_SELECT = """
            SELECT ts.id,ts.season_id,t.sport_id,ts.display_name,t.is_club_team
            FROM team_seasons ts JOIN teams t ON t.id=ts.team_id
            """;
    private static final String NOTIFICATIONS = """
            FROM notification_deliveries d JOIN notifications n ON n.id=d.notification_id
            JOIN events e ON e.id=n.event_id WHERE d.recipient_id=:actor
            AND n.type IN ('EVENT_CREATED','EVENT_CHANGED','EVENT_CANCELLED','NOMINATION_PUBLISHED','NOMINATION_CHANGED') AND
            """ + CAN_READ;
    private static final RowMapper<Event> EVENT = (r,i) -> new Event(uuid(r,"id"),uuid(r,"season_id"),
            Type.valueOf(r.getString("type")), Status.valueOf(r.getString("status")),
            new Schedule(r.getString("title"),r.getString("description"),time(r,"starts_at"),time(r,"ends_at"),
                    r.getString("location"),time(r,"availability_deadline")),
            r.getString("version"),time(r,"nomination_published_at"),r.getBoolean("can_manage"));
    private static final RowMapper<Team> TEAM = (r,i) -> new Team(uuid(r,"id"),uuid(r,"season_id"),uuid(r,"sport_id"),
            r.getString("display_name"),r.getBoolean("is_club_team"));
    private static final RowMapper<Season> SEASON = (r,i) -> new Season(uuid(r,"id"),r.getString("name"),
            r.getObject("starts_on",LocalDate.class),r.getObject("ends_on",LocalDate.class),r.getBoolean("archived"));
    private static final RowMapper<Participant> PARTICIPANT = (r,i) -> new Participant(uuid(r,"player_id"),uuid(r,"team_season_id"),
            r.getString("name"),r.getString("version"),value(r,"availability",Availability.class),r.getString("availability_comment"),
            value(r,r.getBoolean("can_manage")?"nomination":"published_nomination",Nomination.class),
            value(r,"published_nomination",Nomination.class),value(r,"attendance",Attendance.class),
            r.getString("attendance_comment"),r.getObject("played",Boolean.class),r.getObject("withdrawn_at")!=null,
            r.getBoolean("can_answer"),r.getBoolean("can_manage"));
    private static final RowMapper<Notification> NOTICE = (r,i) -> new Notification(uuid(r,"id"),
            NotificationType.valueOf(r.getString("type")),uuid(r,"event_id"),r.getString("title"),r.getString("body"),
            time(r,"delivered_at"),time(r,"read_at"));

    private static UUID uuid(ResultSet r,String field) throws SQLException { return r.getObject(field,UUID.class); }
    private static OffsetDateTime time(ResultSet r,String field) throws SQLException { return r.getObject(field,OffsetDateTime.class); }
    private static <T extends Enum<T>> T value(ResultSet r,String field,Class<T> type) throws SQLException {
        String name=r.getString(field);
        return name==null?null:Enum.valueOf(type,name);
    }
    private MapSqlParameterSource args() { return new MapSqlParameterSource(); }
    private MapSqlParameterSource eventArgs(UUID event) { return args().addValue("event",event); }
    private MapSqlParameterSource scope(User user,LocalDate day) {
        return args().addValue("actor",user.getId()).addValue("person",user.getPersonId()).addValue("today",day)
                .addValue("standard",user.getAccountType()==AccountType.STANDARD).addValue("admin",user.getRole()==Role.ADMIN);
    }

    public Page<Event> list(User user,LocalDate day,UUID team,OffsetDateTime from,OffsetDateTime to,Type type,int page,int size) {
        var p=scope(user,day).addValue("team",team).addValue("from",from).addValue("to",to)
                .addValue("type",type==null?null:type.name()).addValue("offset",(long)page*size).addValue("size",size);
        String where="""
                 AND (CAST(:team AS uuid) IS NULL OR EXISTS (SELECT 1 FROM event_teams et WHERE et.event_id=e.id AND et.team_season_id=:team))
                 AND (CAST(:from AS timestamptz) IS NULL OR e.ends_at>:from)
                 AND (CAST(:to AS timestamptz) IS NULL OR e.starts_at<:to)
                 AND (CAST(:type AS varchar) IS NULL OR e.type=:type)
                """;
        long total=jdbc.queryForObject("SELECT count(*) FROM events e WHERE "+CAN_READ+where,p,Long.class);
        return new Page<>(jdbc.query(EVENT_SELECT+where+" ORDER BY e.starts_at,e.id LIMIT :size OFFSET :offset",p,EVENT),page,size,total);
    }
    public Optional<Event> event(User user,LocalDate day,UUID id) {
        return jdbc.query(EVENT_SELECT+" AND e.id=:event",scope(user,day).addValue("event",id),EVENT).stream().findFirst();
    }
    public List<Team> eventTeams(UUID id) {
        return jdbc.query(TEAM_SELECT+" JOIN event_teams et ON et.team_season_id=ts.id WHERE et.event_id=:event ORDER BY ts.display_name,ts.id",eventArgs(id),TEAM);
    }
    public Optional<Team> team(UUID id) {
        return jdbc.query(TEAM_SELECT+" WHERE ts.id=:id",args().addValue("id",id),TEAM).stream().findFirst();
    }
    public Optional<Season> season(UUID id) {
        return jdbc.query("SELECT * FROM seasons WHERE id=:id",args().addValue("id",id),SEASON).stream().findFirst();
    }
    public Optional<MatchDetails> match(UUID id) {
        return jdbc.query("""
                SELECT m.*,home.display_name AS home_name,away.display_name AS away_name,
                    c.name AS competition_name,f.name AS format_name
                FROM matches m JOIN team_seasons home ON home.id=m.home_team_season_id
                JOIN team_seasons away ON away.id=m.away_team_season_id JOIN match_formats f ON f.id=m.match_format_id
                LEFT JOIN competition_seasons cs ON cs.id=m.competition_season_id LEFT JOIN competitions c ON c.id=cs.competition_id
                WHERE m.event_id=:event
                """,eventArgs(id),(r,i) -> new MatchDetails(uuid(r,"competition_season_id"),uuid(r,"match_format_id"),
                        uuid(r,"home_team_season_id"),uuid(r,"away_team_season_id"),r.getString("home_name"),r.getString("away_name"),
                        r.getString("competition_name"),r.getString("format_name"))).stream().findFirst();
    }
    public boolean coaches(User user,LocalDate day,UUID team) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM team_seasons et WHERE et.id=:team AND (
                """+COACH.replace("et.team_season_id","et.id")+"))",scope(user,day).addValue("team",team),Boolean.class));
    }
    public Options options(User user,LocalDate day) {
        var p=scope(user,day);
        List<UUID> coached=jdbc.queryForList("""
                SELECT DISTINCT c.team_season_id FROM coach_team_memberships c JOIN team_seasons ts ON ts.id=c.team_season_id JOIN seasons s ON s.id=ts.season_id
                WHERE :standard AND c.coach_user_id=:actor AND c.valid_from<=:today AND (c.valid_to IS NULL OR c.valid_to>:today) AND s.ends_on>:today
                """,p,UUID.class);
        if (user.getRole()!=Role.ADMIN && coached.isEmpty()) return new Options(List.of(),List.of(),List.of(),List.of());
        p.addValue("coached",coached.isEmpty()?List.of(new UUID(0,0)):coached);
        var seasons=jdbc.query("""
                SELECT s.* FROM seasons s WHERE NOT s.archived AND (:admin OR EXISTS (
                    SELECT 1 FROM team_seasons ts WHERE ts.season_id=s.id AND ts.id IN (:coached)
                )) ORDER BY s.starts_on DESC,s.name
                """,p,SEASON);
        var teams=jdbc.query(TEAM_SELECT+"""
                JOIN seasons s ON s.id=ts.season_id
                WHERE NOT s.archived AND (:admin OR NOT t.is_club_team OR ts.id IN (:coached))
                AND (:admin OR EXISTS (
                    SELECT 1 FROM team_seasons own JOIN teams own_team ON own_team.id=own.team_id
                    WHERE own.id IN (:coached) AND own.season_id=ts.season_id AND own_team.sport_id=t.sport_id
                )) ORDER BY ts.display_name,ts.id
                """,p,TEAM);
        var formats=jdbc.query("""
                SELECT f.id,f.sport_id,f.name FROM match_formats f WHERE :admin OR EXISTS (
                    SELECT 1 FROM team_seasons ts JOIN teams t ON t.id=ts.team_id
                    WHERE ts.id IN (:coached) AND t.sport_id=f.sport_id
                ) ORDER BY f.name,f.id
                """,p,(r,i)->new Format(uuid(r,"id"),uuid(r,"sport_id"),r.getString("name")));
        var competitions=jdbc.query("""
                SELECT cs.id,cs.match_format_id,c.name,array(SELECT ce.team_season_id FROM competition_entries ce
                    WHERE ce.competition_season_id=cs.id ORDER BY ce.team_season_id) AS teams
                FROM competition_seasons cs JOIN competitions c ON c.id=cs.competition_id JOIN seasons s ON s.id=cs.season_id
                WHERE NOT s.archived AND (:admin OR EXISTS (
                    SELECT 1 FROM competition_entries ce WHERE ce.competition_season_id=cs.id AND ce.team_season_id IN (:coached)
                )) ORDER BY c.name,cs.id
                """,p,(r,i)->new CompetitionOption(uuid(r,"id"),uuid(r,"match_format_id"),r.getString("name"),
                        List.of((UUID[])r.getArray("teams").getArray())));
        return new Options(seasons,teams,formats,competitions);
    }
    public Optional<UUID> formatSport(UUID format) {
        return jdbc.query("SELECT sport_id FROM match_formats WHERE id=:id",args().addValue("id",format),(r,i)->uuid(r,"sport_id"))
                .stream().findFirst();
    }
    public boolean competitionMatches(MatchInput m,UUID season) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                  SELECT 1 FROM competition_seasons cs JOIN competition_entries home ON home.competition_season_id=cs.id
                  JOIN competition_entries away ON away.competition_season_id=cs.id
                  WHERE cs.id=:competition AND cs.season_id=:season AND cs.match_format_id=:format
                  AND home.team_season_id=:home AND away.team_season_id=:away
                )
                """,matchArgs(m).addValue("season",season),Boolean.class));
    }
    private MapSqlParameterSource matchArgs(MatchInput m) {
        return args().addValue("competition",m.competitionSeasonId()).addValue("format",m.matchFormatId())
                .addValue("home",m.homeTeamSeasonId()).addValue("away",m.awayTeamSeasonId());
    }
    private MapSqlParameterSource scheduleArgs(UUID id,Schedule s) {
        return eventArgs(id).addValue("title",s.title()).addValue("description",s.description()).addValue("starts",s.startsAt())
                .addValue("ends",s.endsAt()).addValue("location",s.location()).addValue("deadline",s.availabilityDeadline());
    }
    public void insert(UUID id,UUID actor,UUID season,Type type,Schedule s,List<UUID> teams,MatchInput match) {
        jdbc.update("""
                INSERT INTO events(id,season_id,type,title,description,starts_at,ends_at,location,availability_deadline,created_by)
                VALUES (:event,:season,:type,:title,:description,:starts,:ends,:location,:deadline,:actor)
                """,scheduleArgs(id,s).addValue("season",season).addValue("type",type.name()).addValue("actor",actor));
        for (UUID team:teams) jdbc.update("INSERT INTO event_teams(event_id,team_season_id) VALUES (:event,:team)",eventArgs(id).addValue("team",team));
        if (match!=null) jdbc.update("""
                INSERT INTO matches(event_id,competition_season_id,match_format_id,home_team_season_id,away_team_season_id)
                VALUES (:event,:competition,:format,:home,:away)
                """,matchArgs(match).addValue("event",id));
    }
    public void discardDraft(UUID event) {
        var p=eventArgs(event);
        jdbc.update("DELETE FROM matches WHERE event_id=:event",p);
        jdbc.update("DELETE FROM event_teams WHERE event_id=:event",p);
        jdbc.update("DELETE FROM events WHERE id=:event AND status='DRAFT'",p);
    }
    public void edit(UUID event,Schedule s) {
        jdbc.update("""
                UPDATE events SET title=:title,description=:description,starts_at=:starts,ends_at=:ends,location=:location,
                    availability_deadline=:deadline,version=version+1 WHERE id=:event
                """,scheduleArgs(event,s));
    }
    public void setStatus(UUID event,Status status) {
        jdbc.update("UPDATE events SET status=:status,version=version+1 WHERE id=:event",eventArgs(event).addValue("status",status.name()));
    }
    public void bump(UUID event) { jdbc.update("UPDATE events SET version=version+1 WHERE id=:event",eventArgs(event)); }
    public void snapshot(UUID event,LocalDate date) {
        jdbc.update("""
                INSERT INTO event_participants(event_id,player_id,team_season_id)
                SELECT DISTINCT ON (m.player_id) :event,m.player_id,m.team_season_id
                FROM event_teams et JOIN player_team_memberships m ON m.team_season_id=et.team_season_id
                WHERE et.event_id=:event AND m.valid_from<=:day AND (m.valid_to IS NULL OR m.valid_to>:day)
                ORDER BY m.player_id,m.team_season_id
                """,eventArgs(event).addValue("day",date));
    }
    public boolean allParticipantsEligible(UUID event,LocalDate date) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT NOT EXISTS (
                  SELECT 1 FROM event_participants ep WHERE ep.event_id=:event AND ep.withdrawn_at IS NULL
                  AND NOT EXISTS (SELECT 1 FROM player_team_memberships m WHERE m.player_id=ep.player_id
                    AND m.team_season_id=ep.team_season_id AND m.valid_from<=:day AND (m.valid_to IS NULL OR m.valid_to>:day))
                )
                """,eventArgs(event).addValue("day",date),Boolean.class));
    }
    public boolean eligible(UUID event,UUID team,UUID player,LocalDate date) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM event_teams et JOIN player_team_memberships m ON m.team_season_id=et.team_season_id
                  WHERE et.event_id=:event AND et.team_season_id=:team AND m.player_id=:player
                  AND m.valid_from<=:day AND (m.valid_to IS NULL OR m.valid_to>:day))
                """,eventArgs(event).addValue("team",team).addValue("player",player).addValue("day",date),Boolean.class));
    }
    public List<EligiblePlayer> eligiblePlayers(UUID event,UUID team,LocalDate date) {
        return jdbc.query("""
                SELECT pp.id,concat(p.first_name,' ',p.last_name) AS name
                FROM event_teams et JOIN player_team_memberships m ON m.team_season_id=et.team_season_id
                JOIN player_profiles pp ON pp.id=m.player_id JOIN persons p ON p.id=pp.person_id
                WHERE et.event_id=:event AND et.team_season_id=:team AND m.valid_from<=:day AND (m.valid_to IS NULL OR m.valid_to>:day)
                AND NOT EXISTS (SELECT 1 FROM event_participants ep WHERE ep.event_id=:event AND ep.player_id=pp.id)
                ORDER BY name,pp.id
                """,eventArgs(event).addValue("team",team).addValue("day",date),(r,i)->new EligiblePlayer(uuid(r,"id"),r.getString("name")));
    }
    public boolean addParticipant(UUID event,UUID team,UUID player) {
        return jdbc.update("""
                INSERT INTO event_participants(event_id,team_season_id,player_id) VALUES (:event,:team,:player)
                ON CONFLICT (event_id,player_id) DO NOTHING
                """,eventArgs(event).addValue("team",team).addValue("player",player))==1;
    }
    public List<Participant> participants(User user,LocalDate today,UUID event,UUID player) {
        var p=scope(user,today).addValue("event",event).addValue("player",player);
        return jdbc.query("""
                SELECT visible.* FROM (
                  SELECT ep.*,concat(p.first_name,' ',p.last_name) AS name,%s AS can_answer,
                    (:admin OR (%s)) AS can_manage
                  FROM event_participants ep JOIN player_profiles pp ON pp.id=ep.player_id JOIN persons p ON p.id=pp.person_id
                  JOIN event_teams et ON et.event_id=ep.event_id AND et.team_season_id=ep.team_season_id
                  WHERE ep.event_id=:event AND (CAST(:player AS uuid) IS NULL OR ep.player_id=:player)
                ) visible WHERE can_answer OR can_manage ORDER BY name,player_id
                """.formatted(OWNS_PLAYER,COACH),p,PARTICIPANT);
    }
    private MapSqlParameterSource participantArgs(UUID event,UUID player,UUID actor,OffsetDateTime now) {
        return eventArgs(event).addValue("player",player).addValue("actor",actor).addValue("now",now);
    }
    public void availability(UUID event,UUID player,UUID actor,OffsetDateTime now,Availability answer,String comment) {
        jdbc.update("""
                UPDATE event_participants SET availability=:answer,availability_comment=:comment,
                    availability_by=:actor,availability_at=:now,version=version+1 WHERE event_id=:event AND player_id=:player
                """,participantArgs(event,player,actor,now).addValue("answer",answer.name()).addValue("comment",comment));
    }
    public void nominate(UUID event,UUID player,UUID actor,OffsetDateTime now,Nomination nomination) {
        jdbc.update("""
                UPDATE event_participants SET nomination=:nomination,nomination_by=:actor,nomination_at=:now,
                    version=version+1 WHERE event_id=:event AND player_id=:player
                """,participantArgs(event,player,actor,now).addValue("nomination",nomination.name()));
    }
    public List<UUID> publishNomination(UUID event,OffsetDateTime now) {
        var changes=jdbc.queryForList("""
                UPDATE event_participants SET published_nomination=nomination,version=version+1
                WHERE event_id=:event AND withdrawn_at IS NULL AND published_nomination IS DISTINCT FROM nomination
                RETURNING player_id
                """,eventArgs(event),UUID.class);
        if (!changes.isEmpty()) jdbc.update("""
                UPDATE events SET nomination_published_at=:now,version=version+1 WHERE id=:event
                """,eventArgs(event).addValue("now",now));
        return changes;
    }
    public void attendance(UUID event,UUID player,UUID actor,OffsetDateTime now,Attendance attendance,String comment,Boolean played) {
        jdbc.update("""
                UPDATE event_participants SET attendance=:attendance,attendance_comment=:comment,attendance_by=:actor,
                    attendance_at=:now,played=:played,played_by=CASE WHEN CAST(:played AS boolean) IS NULL THEN NULL ELSE :actor END,
                    played_at=CASE WHEN CAST(:played AS boolean) IS NULL THEN NULL ELSE :now END,
                    version=version+1 WHERE event_id=:event AND player_id=:player
                """,participantArgs(event,player,actor,now).addValue("attendance",attendance.name()).addValue("comment",comment).addValue("played",played));
    }
    public void withdrawal(UUID event,UUID player,OffsetDateTime at,String reason) {
        jdbc.update("""
                UPDATE event_participants SET withdrawn_at=:at,withdrawal_reason=:reason,version=version+1
                WHERE event_id=:event AND player_id=:player
                """,eventArgs(event).addValue("player",player).addValue("at",at).addValue("reason",reason));
    }

    public void notify(UUID event,NotificationType type,String title,String body,String key,OffsetDateTime now,LocalDate today,
                       boolean all,List<UUID> selected) {
        UUID id=UUID.randomUUID();
        var p=eventArgs(event).addValue("id",id).addValue("type",type.name()).addValue("title",title)
                .addValue("body",body).addValue("key",key).addValue("now",now).addValue("today",today)
                .addValue("all",all).addValue("selected",selected.isEmpty()?List.of(new UUID(0,0)):selected);
        int inserted=jdbc.update("""
                INSERT INTO notifications(id,type,event_id,title,body,deduplication_key,created_at)
                VALUES (:id,:type,:event,:title,:body,:key,:now) ON CONFLICT (deduplication_key) DO NOTHING
                """,p);
        if (inserted==0) return;
        jdbc.update("""
                INSERT INTO notification_deliveries(notification_id,recipient_id,delivered_at)
                SELECT :id,u.id,:now FROM users u WHERE u.enabled AND u.person_id IS NOT NULL AND (
                    (:all AND u.account_type='STANDARD' AND (u.role='ADMIN' OR EXISTS (
                        SELECT 1 FROM event_teams et JOIN coach_team_memberships c ON c.team_season_id=et.team_season_id
                        WHERE et.event_id=:event AND c.coach_user_id=u.id AND c.valid_from<=:today AND (c.valid_to IS NULL OR c.valid_to>:today)
                    )))
                    OR EXISTS (
                        SELECT 1 FROM event_participants ep JOIN player_profiles pp ON pp.id=ep.player_id
                        WHERE ep.event_id=:event AND ((:all AND ep.withdrawn_at IS NULL) OR ep.player_id IN (:selected))
                        AND (pp.person_id=u.person_id OR (u.account_type='STANDARD' AND EXISTS (
                            SELECT 1 FROM guardian_links g WHERE g.player_id=pp.id AND g.guardian_person_id=u.person_id AND g.revoked_at IS NULL
                        )))
                    )
                )
                """,p);
    }
    public Page<Notification> notifications(User user,LocalDate today,int page,int size) {
        var p=scope(user,today).addValue("size",size).addValue("offset",(long)page*size);
        long total=jdbc.queryForObject("SELECT count(*) "+NOTIFICATIONS,p,Long.class);
        var rows=jdbc.query("SELECT n.*,d.delivered_at,d.read_at "+NOTIFICATIONS+" ORDER BY d.delivered_at DESC,n.id LIMIT :size OFFSET :offset",p,NOTICE);
        return new Page<>(rows,page,size,total);
    }
    public long unread(User user,LocalDate today) {
        return jdbc.queryForObject("SELECT count(*) "+NOTIFICATIONS+" AND d.read_at IS NULL",scope(user,today),Long.class);
    }
    public Optional<Notification> notification(User user,LocalDate today,UUID id) {
        return jdbc.query("SELECT n.*,d.delivered_at,d.read_at "+NOTIFICATIONS+" AND n.id=:id",scope(user,today).addValue("id",id),NOTICE).stream().findFirst();
    }
    public void read(UUID user,UUID id,OffsetDateTime now) {
        jdbc.update("""
                UPDATE notification_deliveries SET read_at=GREATEST(:now,delivered_at)
                WHERE notification_id=:id AND recipient_id=:actor AND read_at IS NULL
                """,args().addValue("id",id).addValue("actor",user).addValue("now",now));
    }
}
