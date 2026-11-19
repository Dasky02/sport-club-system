package cz.jpmad.springprojecttemplate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="server.servlet.session.cookie.secure=false")
@Testcontainers
class EventsTests {
    @Container static PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:16-alpine");
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",postgres::getJdbcUrl);
        registry.add("spring.datasource.username",postgres::getUsername);
        registry.add("spring.datasource.password",postgres::getPassword);
    }
    @TestConfiguration static class TestTime {
        @Bean @Primary TestClock eventClock() { return new TestClock(); }
    }
    static final class TestClock extends Clock {
        private volatile Instant current;
        void at(String value) { current=Instant.parse(value); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return Clock.fixed(instant(),zone); }
        @Override public Instant instant() { return current==null?Instant.parse("2026-10-26T10:00:00Z"):current; }
    }
    @LocalServerPort int port;
    @Autowired JsonMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired TestClock clock;
    @Autowired PasswordEncoder encoder;
    private static final String PASSWORD="event-test-password";
    private static final String REASON="Testovací ověření";
    private UUID season;
    private UUID football;
    private UUID basketball;
    private Browser admin;

    @BeforeEach void setup() throws Exception {
        clock.at("2026-10-26T10:00:00Z");
        jdbc.execute("TRUNCATE users,persons,club,audit_log,sports,seasons CASCADE");
        jdbc.update("INSERT INTO club(id,name) VALUES (1,'Test club')");
        admin=account(person("Správce"),"ADMIN","STANDARD");
        season=id("INSERT INTO seasons(id,name,starts_on,ends_on) VALUES (?,'Test',DATE '2026-09-01',DATE '2027-07-01')");
        football=id("INSERT INTO sports(id,code,name) VALUES (?,'FOOTBALL','Fotbal')");
        basketball=id("INSERT INTO sports(id,code,name) VALUES (?,'BASKETBALL','Basketbal')");
    }

    @Test void publishingAndEditingUseSnapshotsScopesVersionsAndOneDeliveryPerRecipient() throws Exception {
        UUID club=team(football,"Fotbalový klub",true);
        UUID otherTeam=team(basketball,"Basketbalový klub",true);
        Browser coach=coach(club);
        Browser outsider=coach(otherTeam);
        Browser parent=account(person("Rodič"),"USER","STANDARD");
        UUID childPerson=person("Dítě");
        UUID childPlayer=player(childPerson,club);
        UUID otherPlayer=player(person("Další hráč"),club);
        grant(parent,childPlayer);
        Browser child=account(childPerson,"USER","CHILD");
        String event=create(coach,"TRAINING",List.of(club),null);
        parent.get(event,404);
        child.get(event,404);
        outsider.get(event,404);
        assertThat(parent.get("/events",200).path("totalElements").asText()).isEqualTo("0");
        assertThat(coach.get("/events/options",200).path("teams").size()).isEqualTo(1);
        coach.post(event+"/publish",version("0"),200);
        coach.post(event+"/publish",version("0"),409);
        assertThat(coach.get(event,200).path("participants").size()).isEqualTo(2);
        var own=child.get(event,200).path("participants");
        assertThat(own.size()).isEqualTo(1);
        assertThat(own.get(0).path("playerId").asText()).isEqualTo(childPlayer.toString());
        assertThat(parent.get("/events?from=2026-10-27T00:00:00Z&to=2026-10-28T00:00:00Z&type=TRAINING&teamSeasonId="+club,200).path("items").size()).isEqualTo(1);
        assertThat(parent.get("/events?teamSeasonId="+otherTeam,200).path("items").size()).isZero();

        String participant=event+"/participants/"+childPlayer;
        parent.put(event+"/participants/"+otherPlayer+"/availability",Map.of("version","0","availability","AVAILABLE"),404);
        child.put(participant+"/availability",Map.of("version","0","availability","AVAILABLE","availabilityComment","Přijdu"),200);
        parent.put(participant+"/availability",Map.of("version","0","availability","UNAVAILABLE"),409);
        coach.put(participant+"/availability",Map.of("version","1","availability","UNKNOWN"),403);
        child.put(participant+"/attendance",Map.of("version","1","attendance","PRESENT"),403);
        coach.put(participant+"/attendance",Map.of("version","1","attendance","LATE"),409);
        coach.put(event+"/nomination",nomination("1",childPlayer,"1","SELECTED"),200);
        assertThat(parent.get(event,200).path("participants").get(0).path("nomination").isNull()).isTrue();
        coach.post(event+"/nomination/publish",version("2"),200);
        assertThat(parent.get(event,200).path("participants").get(0).path("nomination").asText()).isEqualTo("SELECTED");
        coach.put(event+"/nomination",nomination("3",childPlayer,"3","RESERVE"),200);
        assertThat(child.get(event,200).path("participants").get(0).path("nomination").asText()).isEqualTo("SELECTED");
        coach.post(event+"/nomination/publish",version("4"),200);
        assertThat(parent.get(event,200).path("participants").get(0).path("nomination").asText()).isEqualTo("RESERVE");
        assertThat(parent.get("/notifications/unread-count",200).path("count").asInt()).isEqualTo(3);
        String notice=parent.get("/notifications",200).path("items").get(0).path("id").asText();
        outsider.get("/notifications/"+notice,404);
        child.get("/notifications/"+notice,200);
        parent.post("/notifications/"+notice+"/read",Map.of(),204);
        String readAt=parent.get("/notifications/"+notice,200).path("readAt").asText();
        assertThat(readAt).isNotBlank();
        assertThat(child.get("/notifications/"+notice,200).path("readAt").isNull()).isTrue();
        clock.at("2026-10-26T19:00:00Z");
        parent.post("/notifications/"+notice+"/read",Map.of(),204);
        assertThat(parent.get("/notifications/"+notice,200).path("readAt").asText()).isEqualTo(readAt);
        assertThat(parent.get("/notifications/unread-count",200).path("count").asInt()).isEqualTo(2);
        parent.put(participant+"/availability",Map.of("version","5","availability","UNKNOWN"),409);
        coach.patch(event,Map.of("version","5","schedule",schedule("Aktualizovaný trénink")),200);
        assertThat(parent.get("/notifications/unread-count",200).path("count").asInt()).isEqualTo(3);

        admin.post("/players/"+childPlayer+"/guardians/"+parent.person+"/revoke",Map.of("reason",REASON),200);
        parent.get(event,404);
        child.get(event,401);
        assertThat(parent.get("/notifications/unread-count",200).path("count").asInt()).isZero();
    }

    @Test void matchEnforcesSportAndCompetitionThenRecordsAttendanceSeparately() throws Exception {
        UUID home=team(football,"Domácí",true);
        UUID away=team(football,"Hosté",false);
        UUID wrong=team(basketball,"Jiný sport",false);
        UUID format=format(football);
        UUID competition=id("INSERT INTO competitions(id,sport_id,name) VALUES (?,?,'Liga')",football);
        UUID round=id("INSERT INTO competition_seasons(id,competition_id,season_id,match_format_id) VALUES (?,?,?,?)",competition,season,format);
        jdbc.update("INSERT INTO competition_entries(competition_season_id,team_season_id) VALUES (?,?),(?,?)",round,home,round,away);
        Browser coach=coach(home);
        UUID player=player(person("Hráč"),home);
        assertThat(coach.get("/events/options",200).path("competitions").get(0).path("teamSeasonIds").size()).isEqualTo(2);
        coach.post("/events",body("MATCH",List.of(home),match(round,format,home,wrong)),400);
        String event=create(coach,"MATCH",List.of(home),match(round,format,home,away));
        coach.post(event+"/publish",version("0"),200);
        String row=event+"/participants/"+player;
        clock.at("2026-10-27T17:00:00Z");
        coach.put(row+"/attendance",Map.of("version","0","attendance","ABSENT","played",true),400);
        var saved=coach.put(row+"/attendance",Map.of("version","0","attendance","LATE","played",true),200);
        assertThat(saved.path("played").asBoolean()).isTrue();
        assertThat(saved.path("availability").isNull()).isTrue();
        assertThat(saved.path("nomination").isNull()).isTrue();
        coach.post(event+"/complete",version("1"),200);
        coach.put(row+"/attendance",Map.of("version","1","attendance","PRESENT","played",true),403);
        admin.put(row+"/attendance",Map.of("version","1","attendance","PRESENT","played",true,"reason",REASON),200);
        assertThat(admin.get(event,200).path("match").path("awayTeamName").asText()).isEqualTo("Hosté");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM audit_log WHERE action='EVENT_ATTENDANCE_CORRECTED'",Long.class)).isEqualTo(1);
    }

    @Test void explicitWithdrawalAllowsMembershipEndAndCancelledEventPreservesParticipation() throws Exception {
        UUID team=team(football,"Tým",true);
        Browser coach=coach(team);
        Browser parent=account(person("Rodič"),"USER","STANDARD");
        UUID player=player(person("Hráč"),team);
        grant(parent,player);
        String event=create(coach,"OTHER",List.of(team),null);
        coach.post(event+"/publish",version("0"),200);
        UUID membership=jdbc.queryForObject("SELECT id FROM player_team_memberships WHERE player_id=?",UUID.class,player);
        var interval=Map.of("validFrom","2026-09-01","validTo","2026-10-27");
        admin.patch("/player-memberships/"+membership,interval,409);
        coach.post(event+"/participants/"+player+"/withdraw",Map.of("version","0","reason",REASON),200);
        admin.patch("/player-memberships/"+membership,interval,200);
        assertThat(parent.get(event,200).path("participants").get(0).path("withdrawn").asBoolean()).isTrue();
        admin.post(event+"/participants/"+player+"/restore",Map.of("version","1","reason",REASON),409);
        coach.post(event+"/cancel",version("2"),200);
        assertThat(parent.get(event,200).path("event").path("status").asText()).isEqualTo("CANCELLED");
        assertThat(parent.get("/notifications/unread-count",200).path("count").asInt()).isEqualTo(2);
    }

    private UUID id(String sql,Object... values) {
        UUID id=UUID.randomUUID();
        var args=new ArrayList<Object>();
        args.add(id);
        args.addAll(Arrays.asList(values));
        jdbc.update(sql,args.toArray());
        return id;
    }
    private UUID person(String name) {
        return id("INSERT INTO persons(id,first_name,last_name,birth_date) VALUES (?,?,'Test',DATE '2000-01-01')",name);
    }
    private Browser account(UUID person,String role,String type) throws Exception {
        String username="event-"+UUID.randomUUID();
        UUID user=id("""
                INSERT INTO users(id,person_id,username,password_hash,role,account_type,created_at,updated_at)
                VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """,person,username,encoder.encode(PASSWORD),role,type);
        var browser=new Browser(person,user);
        browser.post("/auth/login",Map.of("username",username,"password",PASSWORD),200);
        return browser;
    }
    private UUID team(UUID sport,String name,boolean own) {
        UUID team=id("INSERT INTO teams(id,sport_id,name,is_club_team) VALUES (?,?,?,?)",sport,name,own);
        return id("INSERT INTO team_seasons(id,team_id,season_id,display_name) VALUES (?,?,?,?)",team,season,name);
    }
    private UUID player(UUID person,UUID team) {
        UUID player=id("INSERT INTO player_profiles(id,person_id) VALUES (?,?)",person);
        id("INSERT INTO player_team_memberships(id,team_season_id,player_id,valid_from) VALUES (?,?,?,DATE '2026-09-01')",team,player);
        return player;
    }
    private Browser coach(UUID team) throws Exception {
        Browser coach=account(person("Trenér"),"USER","STANDARD");
        id("INSERT INTO coach_team_memberships(id,team_season_id,coach_user_id,valid_from) VALUES (?,?,?,DATE '2026-09-01')",team,coach.id);
        return coach;
    }
    private void grant(Browser parent,UUID player) throws Exception {
        admin.put("/players/"+player+"/guardians/"+parent.person,Map.of("reason",REASON),200);
    }
    private UUID format(UUID sport) {
        return id("INSERT INTO match_formats(id,sport_id,name,score_mode,allow_draw,period_label) VALUES (?,?,'Standard','SUM_SCORE',TRUE,'Poločas')",sport);
    }
    private Map<String,Object> match(UUID round,UUID format,UUID home,UUID away) {
        return Map.of("competitionSeasonId",round,"matchFormatId",format,"homeTeamSeasonId",home,"awayTeamSeasonId",away);
    }
    private Map<String,Object> body(String type,List<UUID> teams,Map<String,Object> match) {
        var body=new HashMap<String,Object>(Map.of("seasonId",season,"type",type,"teamSeasonIds",teams,"schedule",schedule("Testovací akce")));
        if (match!=null) body.put("match",match);
        return body;
    }
    private String create(Browser actor,String type,List<UUID> teams,Map<String,Object> match) throws Exception {
        return "/events/"+actor.post("/events",body(type,teams,match),201).path("event").path("id").asText();
    }
    private static Map<String,String> schedule(String title) {
        return Map.of("title",title,"startsAt","2026-10-27T15:00:00Z","endsAt","2026-10-27T16:00:00Z",
                "availabilityDeadline","2026-10-26T18:00:00Z");
    }
    private static Map<String,String> version(String version) { return Map.of("version",version); }
    private static Map<String,Object> nomination(String version,UUID player,String row,String nomination) {
        return Map.of("version",version,"entries",List.of(Map.of("playerId",player,"version",row,"nomination",nomination)));
    }

    private final class Browser {
        private final UUID person;
        private final UUID id;
        private final HttpClient client=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).build();
        Browser(UUID person,UUID id) { this.person=person; this.id=id; }
        JsonNode get(String path,int status) throws Exception { return send("GET",path,null,status); }
        JsonNode post(String path,Object body,int status) throws Exception { return send("POST",path,body,status); }
        JsonNode put(String path,Object body,int status) throws Exception { return send("PUT",path,body,status); }
        JsonNode patch(String path,Object body,int status) throws Exception { return send("PATCH",path,body,status); }
        private JsonNode send(String method,String path,Object body,int status) throws Exception {
            var request=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api"+path)).timeout(Duration.ofSeconds(10));
            if (body==null) request.GET();
            else {
                JsonNode csrf=get("/auth/csrf",200);
                request.header("Content-Type","application/json").header(csrf.path("headerName").asText(),csrf.path("token").asText())
                        .method(method,HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
            }
            var response=client.send(request.build(),HttpResponse.BodyHandlers.ofString());
            assertThat(response.statusCode()).as("%s %s: %s",method,path,response.body()).isEqualTo(status);
            return status==204?null:json.readTree(response.body());
        }
    }
}
