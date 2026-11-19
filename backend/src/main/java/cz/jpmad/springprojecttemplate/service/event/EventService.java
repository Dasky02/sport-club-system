package cz.jpmad.springprojecttemplate.service.event;

import cz.jpmad.springprojecttemplate.api.ApiException;
import cz.jpmad.springprojecttemplate.api.event.EventDtos.*;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.model.user.enums.Role;
import cz.jpmad.springprojecttemplate.repository.AuditRepository;
import cz.jpmad.springprojecttemplate.repository.ClubRepository;
import cz.jpmad.springprojecttemplate.repository.EventRepository;
import cz.jpmad.springprojecttemplate.service.user.CurrentAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

@Service
@Transactional
@RequiredArgsConstructor
public class EventService {
    private static final ZoneId CLUB_ZONE=ZoneId.of("Europe/Prague");
    private final Clock clock;
    private final ClubRepository clubs;
    private final CurrentAccountService accounts;
    private final EventRepository data;
    private final AuditRepository audit;

    private record Access(User user,OffsetDateTime now) {
        LocalDate day() { return date(now); }
        UUID id() { return user.getId(); }
        boolean admin() { return user.getRole()==Role.ADMIN; }
    }
    private Access actor(UUID id,boolean write) {
        if (write) clubs.lockForWrite(); else clubs.lockForRead();
        return new Access(accounts.requireComplete(id),clock.instant().atOffset(ZoneOffset.UTC));
    }
    private static LocalDate date(OffsetDateTime time) { return time.atZoneSameInstant(CLUB_ZONE).toLocalDate(); }
    private static ApiException conflict(String message) { return new ApiException(HttpStatus.CONFLICT,"STATE_CONFLICT",message); }
    private static void version(String received,String actual) {
        if (!received.equals(actual)) throw new ApiException(HttpStatus.CONFLICT,"OPTIMISTIC_LOCK_CONFLICT","Záznam byl mezitím změněn. Obnovte údaje.");
    }
    private static void allowed(boolean condition) {
        if (!condition) throw new AccessDeniedException("Access denied");
    }
    private static String clean(String value) { return value==null || value.isBlank()?null:value.strip(); }
    private static String reason(String value) {
        if (clean(value)==null) throw ApiException.invalidField("reason","Uveďte důvod opravy.");
        return value.strip();
    }
    private static void page(int page,int size) {
        if (page<0) throw ApiException.invalidField("page","Stránka nesmí být záporná.");
        if (size<1 || size>100) throw ApiException.invalidField("size","Velikost stránky musí být 1–100.");
    }
    private Season season(UUID id) { return data.season(id).orElseThrow(NoSuchElementException::new); }
    private void open(UUID seasonId) {
        if (season(seasonId).archived()) throw conflict("Sezóna je archivovaná.");
    }
    private Event event(Access a,UUID id) { return data.event(a.user(),a.day(),id).orElseThrow(NoSuchElementException::new); }
    private EventDetails details(Access a,UUID id) {
        return new EventDetails(event(a,id),data.eventTeams(id),data.match(id).orElse(null),data.participants(a.user(),a.day(),id,null));
    }
    private Event manage(Access a,UUID id,String expected) {
        Event e=event(a,id);
        allowed(e.canManage());
        version(expected,e.version());
        open(e.seasonId());
        return e;
    }
    private Participant participant(Access a,UUID eventId,UUID player) {
        return data.participants(a.user(),a.day(),eventId,player).stream().findFirst().orElseThrow(NoSuchElementException::new);
    }
    private Schedule schedule(Season season,Schedule value) {
        if (season.archived()) throw conflict("Sezóna je archivovaná.");
        OffsetDateTime start=value.startsAt().withOffsetSameInstant(ZoneOffset.UTC);
        OffsetDateTime end=value.endsAt().withOffsetSameInstant(ZoneOffset.UTC);
        OffsetDateTime deadline=value.availabilityDeadline()==null?null:value.availabilityDeadline().withOffsetSameInstant(ZoneOffset.UTC);
        if (!end.isAfter(start)) throw ApiException.invalidField("schedule.endsAt","Konec musí následovat po začátku.");
        if (start.isBefore(season.startsOn().atStartOfDay(CLUB_ZONE).toOffsetDateTime()) ||
                end.isAfter(season.endsOn().atStartOfDay(CLUB_ZONE).toOffsetDateTime())) {
            throw ApiException.invalidField("schedule.startsAt","Celý termín musí být uvnitř vybrané sezóny.");
        }
        if (deadline!=null && deadline.isAfter(start)) {
            throw ApiException.invalidField("schedule.availabilityDeadline","Uzávěrka může být nejpozději při začátku akce.");
        }
        return new Schedule(value.title().strip(),clean(value.description()),start,end,clean(value.location()),deadline);
    }
    private Team team(UUID id,UUID season) {
        Team team=data.team(id).orElseThrow(NoSuchElementException::new);
        if (!team.seasonId().equals(season)) throw ApiException.invalidField("teamSeasonIds","Všechny týmy musí patřit vybrané sezóně.");
        return team;
    }
    private void validateTeams(Access a,Create request) {
        var assigned=new HashSet<>(request.teamSeasonIds());
        if (assigned.size()!=request.teamSeasonIds().size()) throw ApiException.invalidField("teamSeasonIds","Každý tým vyberte jednou.");
        if (!a.admin()) {
            allowed(!assigned.isEmpty());
            for (UUID id:assigned) allowed(data.coaches(a.user(),a.day(),id));
        }
        for (UUID id:assigned) {
            if (!team(id,request.seasonId()).clubTeam()) throw ApiException.invalidField("teamSeasonIds","Součástí akce mohou být pouze klubové týmy.");
        }
        MatchInput match=request.match();
        if (request.type()!=Type.MATCH) {
            if (match!=null) throw ApiException.invalidField("match","Údaje o zápasu patří pouze k zápasu.");
            if (assigned.isEmpty()) throw ApiException.invalidField("teamSeasonIds","Vyberte alespoň jeden klubový tým.");
            return;
        }
        if (match==null) throw ApiException.invalidField("match","Vyberte strany a formát zápasu.");
        if (match.homeTeamSeasonId().equals(match.awayTeamSeasonId())) {
            throw ApiException.invalidField("match.awayTeamSeasonId","Domácí a hostující tým musí být různé.");
        }
        Team home=team(match.homeTeamSeasonId(),request.seasonId());
        Team away=team(match.awayTeamSeasonId(),request.seasonId());
        Set<UUID> clubSides=new HashSet<>();
        if (home.clubTeam()) clubSides.add(home.id());
        if (away.clubTeam()) clubSides.add(away.id());
        if (!clubSides.equals(assigned)) throw ApiException.invalidField("teamSeasonIds","Týmy akce musí odpovídat klubovým stranám zápasu.");
        if (!home.sportId().equals(away.sportId())) throw ApiException.invalidField("match.awayTeamSeasonId","Strany musí hrát stejný sport.");
        if (data.formatSport(match.matchFormatId()).filter(home.sportId()::equals).isEmpty()) {
            throw ApiException.invalidField("match.matchFormatId","Formát musí patřit sportu zápasu.");
        }
        if (match.competitionSeasonId()!=null && !data.competitionMatches(match,request.seasonId())) {
            throw ApiException.invalidField("match.competitionSeasonId","Vyberte ročník s oběma týmy a jeho formátem.");
        }
    }
    private void notify(Access a,UUID id,NotificationType type,String body,boolean all,List<UUID> selected) {
        Event e=event(a,id);
        data.notify(id,type,e.schedule().title(),body,id+":"+type+":"+e.version(),a.now(),a.day(),all,selected);
    }
    private void audit(Access a,String action,UUID event) { audit.record(a.id(),action,"events",event); }

    public Page<Event> list(UUID user,UUID team,OffsetDateTime from,OffsetDateTime to,Type type,int page,int size) {
        Access a=actor(user,false);
        page(page,size);
        if (from!=null && to!=null && !to.isAfter(from)) throw ApiException.invalidField("to","Konec rozsahu musí následovat po začátku.");
        return data.list(a.user(),a.day(),team,from,to,type,page,size);
    }
    public Options options(UUID user) {
        Access a=actor(user,false);
        return data.options(a.user(),a.day());
    }
    public EventDetails get(UUID user,UUID id) { return details(actor(user,false),id); }
    public EventDetails create(UUID user,Create request) {
        Access a=actor(user,true);
        validateTeams(a,request);
        Schedule schedule=schedule(season(request.seasonId()),request.schedule());
        UUID id=UUID.randomUUID();
        data.insert(id,a.id(),request.seasonId(),request.type(),schedule,request.teamSeasonIds(),request.match());
        audit(a,"EVENT_CREATED",id);
        return details(a,id);
    }
    public void discardDraft(UUID user,UUID id,Version request) {
        Access a=actor(user,true);
        Event e=manage(a,id,request.version());
        if (e.status()!=Status.DRAFT) throw conflict("Zahodit lze pouze koncept.");
        data.discardDraft(id);
        audit(a,"EVENT_DRAFT_DISCARDED",id);
    }
    public EventDetails edit(UUID user,UUID id,Edit request) {
        Access a=actor(user,true);
        Event e=manage(a,id,request.version());
        if (e.status()!=Status.DRAFT && (e.status()!=Status.PUBLISHED || !a.now().isBefore(e.schedule().startsAt()))) {
            throw conflict("Upravit lze koncept nebo zveřejněnou akci před začátkem.");
        }
        Schedule value=schedule(season(e.seasonId()),request.schedule());
        if (e.schedule().equals(value)) return details(a,id);
        if (e.status()==Status.PUBLISHED && (!a.now().isBefore(value.startsAt())
                || !data.allParticipantsEligible(id,date(value.startsAt())))) {
            throw conflict("Nový termín musí být v budoucnu a všichni aktivní účastníci musí mít platné členství.");
        }
        data.edit(id,value);
        audit(a,"EVENT_UPDATED",id);
        if (e.status()==Status.PUBLISHED) notify(a,id,NotificationType.EVENT_CHANGED,"Klub upravil údaje o akci.",true,List.of());
        return details(a,id);
    }
    public EventDetails publish(UUID user,UUID id,Version request) {
        Access a=actor(user,true);
        Event e=manage(a,id,request.version());
        if (e.status()!=Status.DRAFT || !a.now().isBefore(e.schedule().startsAt())) throw conflict("Zveřejnit lze koncept před začátkem.");
        data.snapshot(id,date(e.schedule().startsAt()));
        data.setStatus(id,Status.PUBLISHED);
        audit(a,"EVENT_PUBLISHED",id);
        notify(a,id,NotificationType.EVENT_CREATED,"V kalendáři přibyla zveřejněná akce.",true,List.of());
        return details(a,id);
    }
    public EventDetails cancel(UUID user,UUID id,Version request) {
        Access a=actor(user,true);
        Event e=manage(a,id,request.version());
        if (e.status()!=Status.PUBLISHED || !a.now().isBefore(e.schedule().startsAt())) throw conflict("Zrušit lze zveřejněnou akci před začátkem.");
        data.setStatus(id,Status.CANCELLED);
        audit(a,"EVENT_CANCELLED",id);
        notify(a,id,NotificationType.EVENT_CANCELLED,"Klub akci zrušil.",true,List.of());
        return details(a,id);
    }
    public EventDetails complete(UUID user,UUID id,Version request) {
        Access a=actor(user,true);
        Event e=manage(a,id,request.version());
        if (e.status()!=Status.PUBLISHED || a.now().isBefore(e.schedule().endsAt())) throw conflict("Dokončit lze zveřejněnou akci po skončení.");
        data.setStatus(id,Status.COMPLETED);
        audit(a,"EVENT_COMPLETED",id);
        return details(a,id);
    }

    public Participant availability(UUID user,UUID id,UUID player,AvailabilityRequest request) {
        Access a=actor(user,true);
        Event e=event(a,id);
        Participant p=participant(a,id,player);
        open(e.seasonId());
        version(request.version(),p.version());
        OffsetDateTime deadline=e.schedule().availabilityDeadline()==null?e.schedule().startsAt():e.schedule().availabilityDeadline();
        boolean normal=p.canAnswer() && e.status()==Status.PUBLISHED && !a.now().isAfter(deadline);
        if (p.withdrawn() || (e.status()!=Status.PUBLISHED && e.status()!=Status.COMPLETED)) throw conflict("Akce nyní dostupnost nepřijímá.");
        if (!normal && !a.admin()) {
            allowed(p.canAnswer());
            throw conflict("Uzávěrka dostupnosti již uplynula.");
        }
        String correction=normal?null:reason(request.reason());
        data.availability(id,player,user,a.now(),request.availability(),clean(request.availabilityComment()));
        if (correction!=null) audit.record(user,"EVENT_AVAILABILITY_CORRECTED","events",id,correction);
        return participant(a,id,player);
    }
    public EventDetails nominate(UUID user,UUID id,NominationRequest request) {
        Access a=actor(user,true);
        Event e=manage(a,id,request.version());
        upcoming(e,a);
        var visible=new HashMap<UUID,Participant>();
        for (Participant p:data.participants(a.user(),a.day(),id,null)) visible.put(p.playerId(),p);
        var seen=new HashSet<UUID>();
        boolean changed=false;
        for (NominationEntry entry:request.entries()) {
            if (!seen.add(entry.playerId())) throw ApiException.invalidField("entries","Každý hráč smí být v požadavku jen jednou.");
            Participant p=Optional.ofNullable(visible.get(entry.playerId())).orElseThrow(NoSuchElementException::new);
            version(entry.version(),p.version());
            if (p.withdrawn()) throw conflict("Vyřazeného hráče nelze nominovat.");
            if (entry.nomination()!=p.nomination()) {
                data.nominate(id,entry.playerId(),user,a.now(),entry.nomination());
                changed=true;
            }
        }
        if (changed) {
            data.bump(id);
            audit(a,"EVENT_NOMINATION_STAGED",id);
        }
        return details(a,id);
    }
    public EventDetails publishNomination(UUID user,UUID id,Version request) {
        Access a=actor(user,true);
        Event e=manage(a,id,request.version());
        upcoming(e,a);
        List<UUID> changed=data.publishNomination(id,a.now());
        if (!changed.isEmpty()) {
            boolean first=e.nominationPublishedAt()==null;
            notify(a,id,first?NotificationType.NOMINATION_PUBLISHED:NotificationType.NOMINATION_CHANGED,
                    first?"Klub zveřejnil vaši nominaci.":"Klub upravil vaši nominaci.",false,changed);
            audit(a,"EVENT_NOMINATION_PUBLISHED",id);
        }
        return details(a,id);
    }
    public Participant attendance(UUID user,UUID id,UUID player,AttendanceRequest request) {
        Access a=actor(user,true);
        Event e=event(a,id);
        Participant p=participant(a,id,player);
        allowed(p.canManage());
        open(e.seasonId());
        version(request.version(),p.version());
        if (p.withdrawn() || (e.status()!=Status.PUBLISHED && e.status()!=Status.COMPLETED) || a.now().isBefore(e.schedule().startsAt())) {
            throw conflict("Docházku lze zapsat až od začátku zveřejněné akce pro aktivní účastníky.");
        }
        String correction=null;
        if (e.status()==Status.COMPLETED) {
            allowed(a.admin());
            correction=reason(request.reason());
        }
        if (request.played()!=null && e.type()!=Type.MATCH) throw ApiException.invalidField("played","Nastoupení lze nastavit pouze pro zápas.");
        if (Boolean.TRUE.equals(request.played()) && request.attendance()!=Attendance.PRESENT && request.attendance()!=Attendance.LATE) {
            throw ApiException.invalidField("played","Nastoupení vyžaduje přítomnost nebo pozdní příchod.");
        }
        data.attendance(id,player,user,a.now(),request.attendance(),clean(request.attendanceComment()),request.played());
        if (correction!=null) audit.record(user,"EVENT_ATTENDANCE_CORRECTED","events",id,correction);
        return participant(a,id,player);
    }
    private static void upcoming(Event e,Access a) {
        if (e.status()!=Status.PUBLISHED || !a.now().isBefore(e.schedule().startsAt())) throw conflict("Operace vyžaduje dosud nezahájenou zveřejněnou akci.");
    }
    public List<EligiblePlayer> eligibleParticipants(UUID user,UUID id,UUID team) {
        Access a=actor(user,false);
        Event e=event(a,id);
        allowed(e.canManage());
        upcoming(e,a);
        return data.eligiblePlayers(id,team,date(e.schedule().startsAt()));
    }
    public EventDetails addParticipant(UUID user,UUID id,AddParticipant request) {
        Access a=actor(user,true);
        Event e=manage(a,id,request.version());
        upcoming(e,a);
        if (!data.eligible(id,request.teamSeasonId(),request.playerId(),date(e.schedule().startsAt()))) throw conflict("Hráč nemá platné členství v tomto týmu akce.");
        if (!data.addParticipant(id,request.teamSeasonId(),request.playerId())) throw conflict("Hráč již má záznam účasti.");
        data.bump(id);
        audit(a,"EVENT_PARTICIPANT_ADDED",id);
        notify(a,id,NotificationType.EVENT_CREATED,"Byli jste přidáni k akci.",false,List.of(request.playerId()));
        return details(a,id);
    }
    public EventDetails withdrawal(UUID user,UUID id,UUID player,ParticipantChange request,boolean restore) {
        Access a=actor(user,true);
        Event e=event(a,id);
        Participant p=participant(a,id,player);
        allowed(p.canManage() && (!restore || a.admin()));
        open(e.seasonId());
        upcoming(e,a);
        version(request.version(),p.version());
        if (p.withdrawn()!=restore || p.attendance()!=null || p.played()!=null) throw conflict("Tento záznam účasti nelze změnit.");
        if (restore && !data.eligible(id,p.teamSeasonId(),player,date(e.schedule().startsAt()))) throw conflict("Členství k akci není platné.");
        String reason=reason(request.reason());
        data.withdrawal(id,player,restore?null:a.now(),restore?null:reason);
        data.bump(id);
        audit.record(user,restore?"EVENT_PARTICIPANT_RESTORED":"EVENT_PARTICIPANT_WITHDRAWN","events",id,reason);
        notify(a,id,NotificationType.EVENT_CHANGED,restore?"Klub obnovil vaši účast na akci.":"Klub změnil vaši účast na akci.",false,List.of(player));
        return details(a,id);
    }

    public Page<Notification> notifications(UUID user,int page,int size) {
        Access a=actor(user,false);
        page(page,size);
        return data.notifications(a.user(),a.day(),page,size);
    }
    public UnreadCount unread(UUID user) {
        Access a=actor(user,false);
        return new UnreadCount(data.unread(a.user(),a.day()));
    }
    private Notification notification(Access a,UUID id) {
        return data.notification(a.user(),a.day(),id).orElseThrow(NoSuchElementException::new);
    }
    public Notification notification(UUID user,UUID id) { return notification(actor(user,false),id); }
    public void read(UUID user,UUID id) {
        Access a=actor(user,true);
        notification(a,id);
        data.read(user,id,a.now());
    }
}
