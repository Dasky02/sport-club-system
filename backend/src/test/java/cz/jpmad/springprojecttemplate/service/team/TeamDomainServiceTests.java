package cz.jpmad.springprojecttemplate.service.team;

import cz.jpmad.springprojecttemplate.api.ApiException;
import cz.jpmad.springprojecttemplate.api.team.dto.TeamDtos.*;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.repository.*;
import cz.jpmad.springprojecttemplate.service.user.CurrentAccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class TeamDomainServiceTests {
    private final ClubRepository clubs=mock(ClubRepository.class);
    private final CurrentAccountService accounts=mock(CurrentAccountService.class);
    private final TeamDomainRepository data=mock(TeamDomainRepository.class);
    private final AuditRepository audit=mock(AuditRepository.class);
    private final UUID actor=UUID.randomUUID(),ts=UUID.randomUUID(),player=UUID.randomUUID();
    private TeamDomainService service;
    private User user;
    @BeforeEach void setup() {
        service=new TeamDomainService(clubs,accounts,data,audit,Clock.fixed(Instant.parse("2026-10-26T23:30:00Z"),ZoneOffset.UTC));
        user=new User(); user.setId(actor); user.setPersonId(UUID.randomUUID());
        when(accounts.requireComplete(actor)).thenReturn(user); when(accounts.requireAdmin(actor)).thenReturn(user);
        when(data.teamSeason(ts)).thenReturn(new TeamSeasonResponse(ts,UUID.randomUUID(),UUID.randomUUID(),UUID.randomUUID(),"Sport","Team","Season team",true,"Season",LocalDate.parse("2026-09-01"),LocalDate.parse("2027-07-01"),false));
    }
    @Test void scopeUsesPragueCalendarAndLockBeforeFreshAccountCheck() {
        when(data.hasTeams(actor,user.getPersonId(),LocalDate.parse("2026-10-27"))).thenReturn(true);
        service.teamSeasons(actor,null,null,0,20);
        var order=inOrder(clubs,accounts,data); order.verify(clubs).lockForRead(); order.verify(accounts).requireComplete(actor);
        order.verify(data).hasTeams(actor,user.getPersonId(),LocalDate.parse("2026-10-27"));
    }
    @Test void rosterKeepsOnePragueDayWhenClockCrossesMidnightDuringRequest() {
        Clock midnight=mock(Clock.class);
        when(midnight.withZone(ZoneId.of("Europe/Prague"))).thenReturn(midnight);
        when(midnight.getZone()).thenReturn(ZoneId.of("Europe/Prague"));
        when(midnight.instant()).thenReturn(Instant.parse("2026-10-26T22:59:59Z"),Instant.parse("2026-10-26T23:00:01Z"));
        service=new TeamDomainService(clubs,accounts,data,audit,midnight);
        LocalDate allowedDay=LocalDate.parse("2026-10-26");
        when(data.canReadTeam(ts,actor,user.getPersonId(),allowedDay)).thenReturn(true);
        var row=new RosterResponse(player,"Last","AllowedDay",UUID.randomUUID(),LocalDate.parse("2026-09-01"),LocalDate.parse("2026-10-27"));
        when(data.roster(ts,allowedDay,0,20)).thenReturn(new Page<>(java.util.List.of(row),0,20,"1",1));
        // Vztah končí o půlnoci; oprávnění i explicitní dnešní roster musí použít tentýž den.
        assertThat(service.roster(actor,ts,allowedDay,0,20).items()).containsExactly(row);
        verify(midnight,times(1)).instant();
    }
    @Test void playerHistoryUsesSameDayAsCoachScopeAtMidnight() {
        Clock midnight=mock(Clock.class);
        when(midnight.withZone(ZoneId.of("Europe/Prague"))).thenReturn(midnight);
        when(midnight.getZone()).thenReturn(ZoneId.of("Europe/Prague"));
        when(midnight.instant()).thenReturn(Instant.parse("2026-10-26T22:59:59Z"),Instant.parse("2026-10-26T23:00:01Z"));
        service=new TeamDomainService(clubs,accounts,data,audit,midnight);
        LocalDate allowedDay=LocalDate.parse("2026-10-26");
        when(data.player(player)).thenReturn(new PlayerResponse(player,UUID.randomUUID(),"Last","AllowedDay",LocalDate.parse("2000-01-01")));
        when(data.coachCanReadPlayer(player,actor,allowedDay)).thenReturn(true);
        var row=new PlayerHistoryResponse(UUID.randomUUID(),ts,"History","Season","Sport",LocalDate.parse("2026-09-01"),allowedDay);
        when(data.playerHistory(player,actor,allowedDay,false,0,20)).thenReturn(new Page<>(java.util.List.of(row),0,20,"1",1));
        assertThat(service.playerHistory(actor,player,0,20).items()).containsExactly(row);
        verify(midnight,times(1)).instant();
    }
    @Test void intervalCannotStartAtExclusiveEndOrBeforeSeason() {
        assertThatThrownBy(()->service.createPlayerMembership(actor,ts,new PlayerMembershipRequest(player,LocalDate.parse("2027-07-01"),null))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.createPlayerMembership(actor,ts,new PlayerMembershipRequest(player,LocalDate.parse("2026-08-31"),null))).isInstanceOf(ApiException.class);
        verify(data,never()).insertPlayerMembership(any(),any(),any(),any(),any());
    }
    @Test void intervalMayEndExactlyAtExclusiveSeasonEnd() {
        service.createPlayerMembership(actor,ts,new PlayerMembershipRequest(player,LocalDate.parse("2026-09-01"),LocalDate.parse("2027-07-01")));
        verify(data).insertPlayerMembership(any(),eq(ts),eq(player),eq(LocalDate.parse("2026-09-01")),eq(LocalDate.parse("2027-07-01")));
    }
    @Test void archivedSeasonStopsMutationBeforeMembershipInsert() {
        var old=data.teamSeason(ts);
        when(data.teamSeason(ts)).thenReturn(new TeamSeasonResponse(old.id(),old.teamId(),old.seasonId(),old.sportId(),old.sportName(),old.teamName(),old.displayName(),old.isClubTeam(),old.seasonName(),old.startsOn(),old.endsOn(),true));
        assertThatThrownBy(()->service.createPlayerMembership(actor,ts,new PlayerMembershipRequest(player,LocalDate.parse("2026-09-01"),null))).isInstanceOf(ApiException.class).extracting(e->((ApiException)e).code()).isEqualTo("CONFIGURATION_LOCKED");
        verify(data,never()).insertPlayerMembership(any(),any(),any(),any(),any());
    }
}
