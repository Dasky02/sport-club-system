package cz.jpmad.springprojecttemplate.repository;

import cz.jpmad.springprojecttemplate.api.account.dto.AccountDtos.*;
import cz.jpmad.springprojecttemplate.api.team.dto.TeamDtos.Page;
import cz.jpmad.springprojecttemplate.model.user.enums.AccountType;
import cz.jpmad.springprojecttemplate.model.user.enums.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Repository
@RequiredArgsConstructor
public class AccountDomainRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private static final String ACCOUNTS="SELECT u.id,u.username,u.role,u.account_type,u.enabled,u.person_id,u.created_at,p.first_name,p.last_name FROM users u LEFT JOIN persons p ON p.id=u.person_id";
    private static final RowMapper<AdminAccount> ACCOUNT=(r,n)->new AdminAccount(r.getObject("id",UUID.class),r.getString("username"),Role.valueOf(r.getString("role")),AccountType.valueOf(r.getString("account_type")),r.getBoolean("enabled"),r.getObject("person_id",UUID.class),r.getObject("person_id")==null?"PENDING":"COMPLETE",r.getString("first_name"),r.getString("last_name"),r.getTimestamp("created_at").toInstant());
    private static final String GUARDIANS="SELECT gl.*,p.first_name,p.last_name FROM guardian_links gl JOIN persons p ON p.id=gl.guardian_person_id";
    private static final RowMapper<GuardianResponse> GUARDIAN=(r,n)->new GuardianResponse(r.getObject("guardian_person_id",UUID.class),r.getObject("player_id",UUID.class),r.getString("first_name"),r.getString("last_name"),r.getObject("granted_by",UUID.class),r.getTimestamp("granted_at").toInstant(),r.getTimestamp("revoked_at")==null?null:r.getTimestamp("revoked_at").toInstant());
    private static final String CHILDREN="SELECT pp.id player_id,p.first_name,p.last_name FROM guardian_links gl JOIN player_profiles pp ON pp.id=gl.player_id JOIN persons p ON p.id=pp.person_id JOIN users parent ON parent.person_id=gl.guardian_person_id WHERE parent.id=:actor AND parent.enabled AND parent.account_type='STANDARD' AND gl.revoked_at IS NULL";
    private static final RowMapper<ChildResponse> CHILD=(r,n)->new ChildResponse(r.getObject("player_id",UUID.class),r.getString("first_name")+" "+r.getString("last_name"),r.getString("first_name"),r.getString("last_name"));
    private MapSqlParameterSource p() { return new MapSqlParameterSource(); }
    private boolean exists(String sql,MapSqlParameterSource p) { return Objects.requireNonNull(jdbc.queryForObject(sql,p,Long.class))>0; }
    private <T> T one(String sql,MapSqlParameterSource p,RowMapper<T> mapper) { return jdbc.query(sql,p,mapper).stream().findFirst().orElseThrow(NoSuchElementException::new); }
    private <T> Page<T> page(String sql,MapSqlParameterSource p,String order,int page,int size,RowMapper<T> mapper) {
        long total=Objects.requireNonNull(jdbc.queryForObject("SELECT count(*) FROM ("+sql+") scoped",p,Long.class));
        var items=jdbc.query(sql+" ORDER BY "+order+" LIMIT :limit OFFSET :offset",p.addValue("limit",size).addValue("offset",(long)page*size),mapper);
        return new Page<>(items,page,size,Long.toString(total),(int)((total+size-1)/size));
    }
    public Page<AdminAccount> accounts(int page,int size) { return page(ACCOUNTS,p(),"u.username,u.id",page,size,ACCOUNT); }
    public AdminAccount account(UUID id) { return one(ACCOUNTS+" WHERE u.id=:id",p().addValue("id",id),ACCOUNT); }
    public boolean personHasAccount(UUID person) { return exists("SELECT count(*) FROM users WHERE person_id=:person",p().addValue("person",person)); }
    public boolean usernameUsed(String username) { return exists("SELECT count(*) FROM users WHERE username=:name",p().addValue("name",username)); }
    public void insertAccount(UUID id,UUID person,String username,String hash,AccountType type,Instant now) {
        jdbc.update("INSERT INTO users(id,username,password_hash,role,person_id,account_type,enabled,created_at,updated_at) VALUES(:id,:name,:hash,'USER',:person,:type,:enabled,:now,:now)",p().addValue("id",id).addValue("name",username).addValue("hash",hash).addValue("person",person).addValue("type",type.name()).addValue("enabled",type==AccountType.STANDARD).addValue("now",Timestamp.from(now)));
    }
    public void linkPerson(UUID id,UUID person,Instant now) { jdbc.update("UPDATE users SET person_id=:person,updated_at=:now WHERE id=:id",p().addValue("person",person).addValue("now",Timestamp.from(now)).addValue("id",id)); }
    public void setRole(UUID id,Role role,Instant now) { jdbc.update("UPDATE users SET role=:role,updated_at=:now WHERE id=:id",p().addValue("role",role.name()).addValue("now",Timestamp.from(now)).addValue("id",id)); }
    public void setType(UUID id,AccountType type,boolean enabled,Instant now) { jdbc.update("UPDATE users SET account_type=:type,enabled=:enabled,updated_at=:now WHERE id=:id",p().addValue("type",type.name()).addValue("enabled",enabled).addValue("now",Timestamp.from(now)).addValue("id",id)); }
    public void setEnabled(UUID id,boolean enabled,Instant now) { jdbc.update("UPDATE users SET enabled=:enabled,updated_at=:now WHERE id=:id",p().addValue("enabled",enabled).addValue("now",Timestamp.from(now)).addValue("id",id)); }
    public long usableAdmins() { return Objects.requireNonNull(jdbc.queryForObject("SELECT count(*) FROM users WHERE role='ADMIN' AND account_type='STANDARD' AND enabled AND person_id IS NOT NULL",p(),Long.class)); }
    public boolean activeGuardian(UUID person) { return Boolean.TRUE.equals(jdbc.queryForObject("SELECT p3_has_active_guardian(:person)",p().addValue("person",person),Boolean.class)); }
    public boolean guardianIsChild(UUID person) { return exists("SELECT count(*) FROM users WHERE person_id=:person AND account_type='CHILD'",p().addValue("person",person)); }
    public boolean hasGuardianLinks(UUID person) { return exists("SELECT count(*) FROM guardian_links WHERE guardian_person_id=:person AND revoked_at IS NULL",p().addValue("person",person)); }
    public boolean hasCoaching(UUID id) { return exists("SELECT count(*) FROM coach_team_memberships cm JOIN team_seasons ts ON ts.id=cm.team_season_id JOIN seasons s ON s.id=ts.season_id WHERE cm.coach_user_id=:id",p().addValue("id",id)); }
    public boolean wouldCreateGuardianCycle(UUID guardian,UUID childPerson) {
        return exists("WITH RECURSIVE descendants(person_id) AS (SELECT pp.person_id FROM guardian_links gl JOIN player_profiles pp ON pp.id=gl.player_id WHERE gl.guardian_person_id=:child AND gl.revoked_at IS NULL UNION SELECT pp.person_id FROM descendants d JOIN guardian_links gl ON gl.guardian_person_id=d.person_id JOIN player_profiles pp ON pp.id=gl.player_id WHERE gl.revoked_at IS NULL) SELECT count(*) FROM descendants WHERE person_id=:guardian",p().addValue("child",childPerson).addValue("guardian",guardian));
    }
    public Page<GuardianResponse> guardians(UUID player,int page,int size) { return page(GUARDIANS+" WHERE gl.player_id=:player",p().addValue("player",player),"p.last_name,p.first_name,gl.guardian_person_id",page,size,GUARDIAN); }
    public Optional<GuardianResponse> guardian(UUID player,UUID person) { return jdbc.query(GUARDIANS+" WHERE gl.player_id=:player AND gl.guardian_person_id=:person",p().addValue("player",player).addValue("person",person),GUARDIAN).stream().findFirst(); }
    public void grant(UUID player,UUID person,UUID actor,Instant now) { jdbc.update("INSERT INTO guardian_links(guardian_person_id,player_id,granted_by,granted_at) VALUES(:person,:player,:actor,:now) ON CONFLICT(guardian_person_id,player_id) DO UPDATE SET granted_by=:actor,granted_at=:now,revoked_at=NULL",p().addValue("person",person).addValue("player",player).addValue("actor",actor).addValue("now",Timestamp.from(now))); }
    public void revoke(UUID player,UUID person,Instant now) { jdbc.update("UPDATE guardian_links SET revoked_at=:now WHERE guardian_person_id=:person AND player_id=:player",p().addValue("person",person).addValue("player",player).addValue("now",Timestamp.from(now))); }
    public List<UUID> enabledChildren() { return jdbc.query("SELECT id FROM users WHERE account_type='CHILD' AND enabled",p(),(r,n)->r.getObject("id",UUID.class)); }
    public boolean enabled(UUID id) { return Boolean.TRUE.equals(jdbc.queryForObject("SELECT enabled FROM users WHERE id=:id",p().addValue("id",id),Boolean.class)); }
    public Page<ChildResponse> children(UUID actor,int page,int size) { return page(CHILDREN,p().addValue("actor",actor),"p.last_name,p.first_name,pp.id",page,size,CHILD); }
    public List<ChildResponse> children(UUID actor) { return jdbc.query(CHILDREN+" ORDER BY p.last_name,p.first_name,pp.id",p().addValue("actor",actor),CHILD); }
    public ChildResponse child(UUID actor,UUID player) { return one(CHILDREN+" AND pp.id=:player",p().addValue("actor",actor).addValue("player",player),CHILD); }
}
