package cz.jpmad.springprojecttemplate.service.team;

import cz.jpmad.springprojecttemplate.api.ApiException;
import cz.jpmad.springprojecttemplate.api.person.dto.PersonRequest;
import cz.jpmad.springprojecttemplate.api.person.dto.PersonResponse;
import cz.jpmad.springprojecttemplate.api.team.dto.TeamDtos.*;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.model.user.enums.Role;
import cz.jpmad.springprojecttemplate.repository.*;
import cz.jpmad.springprojecttemplate.service.user.CurrentAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class TeamDomainService {
    private final ClubRepository clubs;
    private final CurrentAccountService accounts;
    private final TeamDomainRepository data;
    private final AuditRepository audit;
    private final Clock clock;
    private User actor(UUID id,boolean write,boolean admin) {
        if(write) clubs.lockForWrite(); else clubs.lockForRead();
        return admin?accounts.requireAdmin(id):accounts.requireComplete(id);
    }
    private LocalDate today() { return LocalDate.now(clock.withZone(ZoneId.of("Europe/Prague"))); }
    private boolean admin(User u) { return u.getRole()==Role.ADMIN; }
    private void page(int page,int size) {
        if(page<0) throw ApiException.invalidField("page","Stránka nesmí být záporná.");
        if(size<1 || size>100) throw ApiException.invalidField("size","Velikost stránky musí být 1–100.");
    }
    private String name(String value,String field) {
        if(value==null || value.isBlank()) throw ApiException.invalidField(field,"Vyplňte název.");
        return value.strip();
    }
    private void conflict(String code,String message) { throw new ApiException(HttpStatus.CONFLICT,code,message); }
    private void open(SeasonResponse s) { if(s.archived()) conflict("CONFIGURATION_LOCKED","Sezóna je archivovaná."); }
    private void open(TeamSeasonResponse ts) { if(ts.archived()) conflict("CONFIGURATION_LOCKED","Sezóna je archivovaná."); }
    private void activeSport(UUID id) { if(!data.sportActive(id)) conflict("STATE_CONFLICT","Sport není aktivní."); }
    private void dates(LocalDate from,LocalDate to) { if(from==null || to==null || !to.isAfter(from)) throw ApiException.invalidField("endsOn","Konec musí následovat po začátku."); }
    public Page<SeasonResponse> seasons(UUID actor,int page,int size) { actor(actor,false,true); page(page,size); return data.seasons(page,size); }
    public SeasonResponse createSeason(UUID actor,SeasonRequest r) {
        actor(actor,true,true); dates(r.startsOn(),r.endsOn()); UUID id=UUID.randomUUID(); String n=name(r.name(),"name");
        if(data.seasonNameUsed(n,id)) conflict("DUPLICATE_RESOURCE","Název sezóny už existuje.");
        data.insertSeason(id,n,r.startsOn(),r.endsOn()); audit.record(actor,"SEASON_CREATED","seasons",id); return data.season(id);
    }
    public SeasonResponse updateSeason(UUID actor,UUID id,SeasonPatch r) {
        actor(actor,true,true); var old=data.season(id); open(old);
        LocalDate from=r.startsOn()==null?old.startsOn():r.startsOn(),to=r.endsOn()==null?old.endsOn():r.endsOn(); dates(from,to);
        if((!from.equals(old.startsOn()) || !to.equals(old.endsOn())) && data.seasonUsed(id)) conflict("CONFIGURATION_LOCKED","Hranice používané sezóny nelze měnit.");
        String n=r.name()==null?old.name():name(r.name(),"name");
        if(data.seasonNameUsed(n,id)) conflict("DUPLICATE_RESOURCE","Název sezóny už existuje.");
        data.updateSeason(id,n,from,to); audit.record(actor,"SEASON_UPDATED","seasons",id); return data.season(id);
    }
    public SeasonResponse archiveSeason(UUID actor,UUID id) {
        actor(actor,true,true); var old=data.season(id);
        if(!old.archived()) { data.archiveSeason(id); audit.record(actor,"SEASON_ARCHIVED","seasons",id); }
        return data.season(id);
    }
    public Page<TeamResponse> teams(UUID actor,UUID sport,int page,int size) { actor(actor,false,true); page(page,size); return data.teams(sport,page,size); }
    public TeamResponse createTeam(UUID actor,TeamRequest r) {
        actor(actor,true,true); activeSport(r.sportId()); UUID id=UUID.randomUUID();
        data.insertTeam(id,r.sportId(),name(r.name(),"name"),r.isClubTeam()); audit.record(actor,"TEAM_CREATED","teams",id); return data.team(id);
    }
    public TeamResponse updateTeam(UUID actor,UUID id,TeamPatch r) {
        actor(actor,true,true); var old=data.team(id);
        UUID sport=r.sportId()==null?old.sportId():r.sportId(); boolean club=r.isClubTeam()==null?old.isClubTeam():r.isClubTeam();
        boolean changed=!sport.equals(old.sportId()) || club!=old.isClubTeam();
        if(changed && data.teamUsed(id)) conflict("CONFIGURATION_LOCKED","Sport ani příslušnost používaného týmu nelze měnit.");
        if(!sport.equals(old.sportId())) activeSport(sport);
        data.updateTeam(id,sport,r.name()==null?old.name():name(r.name(),"name"),club); audit.record(actor,"TEAM_UPDATED","teams",id); return data.team(id);
    }
    public Page<TeamSeasonResponse> teamSeasons(UUID actor,UUID season,UUID sport,int page,int size) {
        var u=actor(actor,false,false); page(page,size); LocalDate day=today();
        if(!admin(u) && !data.hasTeams(u.getId(),u.getPersonId(),day)) throw new AccessDeniedException("Access denied");
        return data.teamSeasons(u.getId(),u.getPersonId(),day,admin(u),season,sport,page,size);
    }
    private TeamSeasonResponse readableTeam(User u,UUID id,LocalDate day) {
        if(!admin(u) && !data.canReadTeam(id,u.getId(),u.getPersonId(),day)) throw new NoSuchElementException();
        return data.teamSeason(id);
    }
    public TeamSeasonResponse teamSeason(UUID actor,UUID id) { return readableTeam(actor(actor,false,false),id,today()); }
    public TeamSeasonResponse createTeamSeason(UUID actor,TeamSeasonRequest r) {
        actor(actor,true,true); var season=data.season(r.seasonId()); open(season); var team=data.team(r.teamId()); activeSport(team.sportId());
        if(data.pairUsed(r.teamId(),r.seasonId())) conflict("DUPLICATE_RESOURCE","Tým je v sezóně už založen.");
        UUID id=UUID.randomUUID(); data.insertTeamSeason(id,r.teamId(),r.seasonId(),name(r.displayName(),"displayName"));
        audit.record(actor,"TEAM_SEASON_CREATED","team_seasons",id); return data.teamSeason(id);
    }
    public TeamSeasonResponse updateTeamSeason(UUID actor,UUID id,TeamSeasonPatch r) {
        actor(actor,true,true); open(data.teamSeason(id)); data.renameTeamSeason(id,name(r.displayName(),"displayName"));
        audit.record(actor,"TEAM_SEASON_UPDATED","team_seasons",id); return data.teamSeason(id);
    }
    public Page<RosterResponse> roster(UUID actor,UUID id,LocalDate on,int page,int size) {
        var u=actor(actor,false,false); LocalDate day=today(); readableTeam(u,id,day); page(page,size);
         if(on!=null && !on.equals(day) && !admin(u)) throw new AccessDeniedException("Access denied");
        return data.roster(id,on==null?day:on,page,size);
    }
    public Page<PersonResponse> persons(UUID actor,int page,int size) { actor(actor,false,true); page(page,size); return data.persons(page,size); }
    public PersonResponse person(UUID actor,UUID id) { actor(actor,false,true); return data.person(id); }
    private void personValid(PersonRequest r,boolean requiresDob,LocalDate day) {
        if(requiresDob && r.birthDate()==null) throw ApiException.invalidField("birthDate","Hráč vyžaduje datum narození.");
        if(r.birthDate()!=null && r.birthDate().isAfter(day)) throw ApiException.invalidField("birthDate","Datum narození nesmí být v budoucnosti.");
    }
    private String optional(String value) { return value==null || value.isBlank()?null:value.strip(); }
    private UUID insertPerson(PersonRequest r,LocalDate day) {
        personValid(r,false,day); UUID id=UUID.randomUUID();
        data.insertPerson(id,name(r.firstName(),"firstName"),name(r.lastName(),"lastName"),r.birthDate(),optional(r.email()),optional(r.phone())); return id;
    }
    public PersonResponse createPerson(UUID actor,PersonRequest r) {
        actor(actor,true,true); UUID id=insertPerson(r,today()); audit.record(actor,"PERSON_CREATED","persons",id); return data.person(id);
    }
    public PersonResponse updatePerson(UUID actor,UUID id,PersonRequest r) {
        actor(actor,true,true); data.person(id); personValid(r,data.ownPlayer(id).isPresent(),today());
        data.updatePerson(id,name(r.firstName(),"firstName"),name(r.lastName(),"lastName"),r.birthDate(),optional(r.email()),optional(r.phone()));
        audit.record(actor,"PERSON_UPDATED","persons",id); return data.person(id);
    }
    public Page<PlayerResponse> players(UUID actor,int page,int size) { actor(actor,false,true); page(page,size); return data.players(page,size); }
    public PlayerResponse createPlayer(UUID actor,PlayerRequest r) {
        actor(actor,true,true); LocalDate day=today(); UUID person;
        if((r.personId()!=null)==(r.person()!=null)) throw ApiException.invalidField("personId","Vyberte právě jednu možnost identity.");
        if(r.person()!=null) { personValid(r.person(),true,day); person=insertPerson(r.person(),day); audit.record(actor,"PERSON_CREATED","persons",person); }
        else { person=r.personId(); if(data.person(person).birthDate()==null) throw ApiException.invalidField("birthDate","Hráč vyžaduje datum narození."); }
        if(data.ownPlayer(person).isPresent()) conflict("DUPLICATE_RESOURCE","Osoba již má hráčský profil.");
        UUID id=UUID.randomUUID(); data.insertPlayer(id,person); audit.record(actor,"PLAYER_CREATED","player_profiles",id); return data.player(id);
    }
    private PlayerResponse readablePlayer(User u,UUID id,LocalDate day) {
        var p=data.player(id);
        if(!admin(u) && !p.personId().equals(u.getPersonId()) && !data.coachCanReadPlayer(id,u.getId(),day) && !data.parentCanReadPlayer(id,u.getPersonId())) throw new NoSuchElementException();
        return p;
    }
    public PlayerBasicResponse player(UUID actor,UUID id) { var p=readablePlayer(actor(actor,false,false),id,today()); return new PlayerBasicResponse(p.id(),p.firstName(),p.lastName()); }
    public Page<PlayerHistoryResponse> playerHistory(UUID actor,UUID id,int page,int size) {
        var u=actor(actor,false,false); LocalDate day=today(); var p=readablePlayer(u,id,day); page(page,size);
        return data.playerHistory(id,u.getId(),day,admin(u)||p.personId().equals(u.getPersonId())||data.parentCanReadPlayer(id,u.getPersonId()),page,size);
    }
    private TeamSeasonResponse membershipTeam(UUID id) {
        var ts=data.teamSeason(id); open(ts); if(!ts.isClubTeam()) conflict("STATE_CONFLICT","Externí tým nemůže mít interní členství."); return ts;
    }
    private void interval(TeamSeasonResponse ts,LocalDate from,LocalDate to) {
        if(from==null || from.isBefore(ts.startsOn()) || !from.isBefore(ts.endsOn())) throw ApiException.invalidField("validFrom","Začátek musí ležet v sezóně.");
        if(to!=null && (!to.isAfter(from) || to.isAfter(ts.endsOn()))) throw ApiException.invalidField("validTo","Konec musí následovat po začátku a nepřesáhnout sezónu.");
    }
    public Page<PlayerMembershipResponse> playerMemberships(UUID actor,UUID ts,int page,int size) { actor(actor,false,true); data.teamSeason(ts); page(page,size); return data.playerMemberships(ts,page,size); }
    public Page<CoachMembershipResponse> coachMemberships(UUID actor,UUID ts,int page,int size) { actor(actor,false,true); data.teamSeason(ts); page(page,size); return data.coachMemberships(ts,page,size); }
    public PlayerMembershipResponse createPlayerMembership(UUID actor,UUID ts,PlayerMembershipRequest r) {
        actor(actor,true,true); var team=membershipTeam(ts); data.player(r.playerId()); interval(team,r.validFrom(),r.validTo()); UUID id=UUID.randomUUID();
        if(data.playerOverlap(ts,r.playerId(),id,r.validFrom(),r.validTo())) conflict("MEMBERSHIP_OVERLAP","Členství se překrývá se stávajícím intervalem.");
        data.insertPlayerMembership(id,ts,r.playerId(),r.validFrom(),r.validTo()); audit.record(actor,"PLAYER_MEMBERSHIP_CREATED","player_team_memberships",id); return data.playerMembership(id);
    }
    public CoachMembershipResponse createCoachMembership(UUID actor,UUID ts,CoachMembershipRequest r) {
        actor(actor,true,true); var team=membershipTeam(ts); interval(team,r.validFrom(),r.validTo());
        if(!data.eligibleCoach(r.coachUserId())) conflict("STATE_CONFLICT","Účet nelze přiřadit jako trenéra."); UUID id=UUID.randomUUID();
        if(data.coachOverlap(ts,r.coachUserId(),id,r.validFrom(),r.validTo())) conflict("MEMBERSHIP_OVERLAP","Přiřazení se překrývá se stávajícím intervalem.");
        data.insertCoachMembership(id,ts,r.coachUserId(),r.validFrom(),r.validTo()); audit.record(actor,"COACH_MEMBERSHIP_CREATED","coach_team_memberships",id); return data.coachMembership(id);
    }
    public PlayerMembershipResponse updatePlayerMembership(UUID actor,UUID id,MembershipPatch r) {
        actor(actor,true,true); var old=data.playerMembership(id); var team=membershipTeam(old.teamSeasonId()); interval(team,r.validFrom(),r.validTo());
        if(data.playerOverlap(old.teamSeasonId(),old.playerId(),id,r.validFrom(),r.validTo())) conflict("MEMBERSHIP_OVERLAP","Členství se překrývá se stávajícím intervalem.");
        data.updatePlayerMembership(id,r.validFrom(),r.validTo()); audit.record(actor,"PLAYER_MEMBERSHIP_UPDATED","player_team_memberships",id); return data.playerMembership(id);
    }
    public CoachMembershipResponse updateCoachMembership(UUID actor,UUID id,MembershipPatch r) {
        actor(actor,true,true); var old=data.coachMembership(id); var team=membershipTeam(old.teamSeasonId()); interval(team,r.validFrom(),r.validTo());
        if(!data.eligibleCoach(old.coachUserId())) conflict("STATE_CONFLICT","Účet nelze přiřadit jako trenéra.");
        if(data.coachOverlap(old.teamSeasonId(),old.coachUserId(),id,r.validFrom(),r.validTo())) conflict("MEMBERSHIP_OVERLAP","Přiřazení se překrývá se stávajícím intervalem.");
        data.updateCoachMembership(id,r.validFrom(),r.validTo()); audit.record(actor,"COACH_MEMBERSHIP_UPDATED","coach_team_memberships",id); return data.coachMembership(id);
    }
    public Page<CoachCandidateResponse> coachCandidates(UUID actor,int page,int size) { actor(actor,false,true); page(page,size); return data.coachCandidates(page,size); }
}
