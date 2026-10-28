package cz.jpmad.springprojecttemplate.api.team;

import cz.jpmad.springprojecttemplate.api.person.dto.PersonRequest;
import cz.jpmad.springprojecttemplate.api.person.dto.PersonResponse;
import cz.jpmad.springprojecttemplate.api.team.dto.TeamDtos.*;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.service.team.TeamDomainService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class TeamDomainController {
    private final TeamDomainService service;
    @GetMapping("/seasons") @PreAuthorize("hasRole('ADMIN')")
    public Page<SeasonResponse> seasons(@AuthenticationPrincipal User u,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.seasons(u.getId(),page,size); }
    @PostMapping("/seasons") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('ADMIN')")
    public SeasonResponse createSeason(@AuthenticationPrincipal User u,@Valid @RequestBody SeasonRequest r) { return service.createSeason(u.getId(),r); }
    @PatchMapping("/seasons/{id}") @PreAuthorize("hasRole('ADMIN')")
    public SeasonResponse updateSeason(@AuthenticationPrincipal User u,@PathVariable UUID id,@Valid @RequestBody SeasonPatch r) { return service.updateSeason(u.getId(),id,r); }
    @PostMapping("/seasons/{id}/archive") @PreAuthorize("hasRole('ADMIN')")
    public SeasonResponse archive(@AuthenticationPrincipal User u,@PathVariable UUID id,@RequestBody EmptyRequest r) { return service.archiveSeason(u.getId(),id); }
    @GetMapping("/teams") @PreAuthorize("hasRole('ADMIN')")
    public Page<TeamResponse> teams(@AuthenticationPrincipal User u,@RequestParam(required=false) UUID sportId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.teams(u.getId(),sportId,page,size); }
    @PostMapping("/teams") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('ADMIN')")
    public TeamResponse createTeam(@AuthenticationPrincipal User u,@Valid @RequestBody TeamRequest r) { return service.createTeam(u.getId(),r); }
    @PatchMapping("/teams/{id}") @PreAuthorize("hasRole('ADMIN')")
    public TeamResponse updateTeam(@AuthenticationPrincipal User u,@PathVariable UUID id,@Valid @RequestBody TeamPatch r) { return service.updateTeam(u.getId(),id,r); }
    @GetMapping("/team-seasons")
    public Page<TeamSeasonResponse> teamSeasons(@AuthenticationPrincipal User u,@RequestParam(required=false) UUID seasonId,@RequestParam(required=false) UUID sportId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.teamSeasons(u.getId(),seasonId,sportId,page,size); }
    @GetMapping("/team-seasons/{id}")
    public TeamSeasonResponse teamSeason(@AuthenticationPrincipal User u,@PathVariable UUID id) { return service.teamSeason(u.getId(),id); }
    @PostMapping("/team-seasons") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('ADMIN')")
    public TeamSeasonResponse createTeamSeason(@AuthenticationPrincipal User u,@Valid @RequestBody TeamSeasonRequest r) { return service.createTeamSeason(u.getId(),r); }
    @PatchMapping("/team-seasons/{id}") @PreAuthorize("hasRole('ADMIN')")
    public TeamSeasonResponse updateTeamSeason(@AuthenticationPrincipal User u,@PathVariable UUID id,@Valid @RequestBody TeamSeasonPatch r) { return service.updateTeamSeason(u.getId(),id,r); }
    @GetMapping("/team-seasons/{id}/players")
    public Page<RosterResponse> roster(@AuthenticationPrincipal User u,@PathVariable UUID id,@RequestParam(required=false) LocalDate on,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.roster(u.getId(),id,on,page,size); }
    @GetMapping("/persons") @PreAuthorize("hasRole('ADMIN')")
    public Page<PersonResponse> persons(@AuthenticationPrincipal User u,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.persons(u.getId(),page,size); }
    @GetMapping("/persons/{id}") @PreAuthorize("hasRole('ADMIN')")
    public PersonResponse person(@AuthenticationPrincipal User u,@PathVariable UUID id) { return service.person(u.getId(),id); }
    @PostMapping("/persons") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('ADMIN')")
    public PersonResponse createPerson(@AuthenticationPrincipal User u,@Valid @RequestBody PersonRequest r) { return service.createPerson(u.getId(),r); }
    @PutMapping("/persons/{id}") @PreAuthorize("hasRole('ADMIN')")
    public PersonResponse updatePerson(@AuthenticationPrincipal User u,@PathVariable UUID id,@Valid @RequestBody PersonRequest r) { return service.updatePerson(u.getId(),id,r); }
    @GetMapping("/players") @PreAuthorize("hasRole('ADMIN')")
    public Page<PlayerResponse> players(@AuthenticationPrincipal User u,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.players(u.getId(),page,size); }
    @PostMapping("/players") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('ADMIN')")
    public PlayerResponse createPlayer(@AuthenticationPrincipal User u,@Valid @RequestBody PlayerRequest r) { return service.createPlayer(u.getId(),r); }
    @GetMapping("/players/{id}")
    public PlayerBasicResponse player(@AuthenticationPrincipal User u,@PathVariable UUID id) { return service.player(u.getId(),id); }
    @GetMapping("/players/{id}/memberships")
    public Page<PlayerHistoryResponse> history(@AuthenticationPrincipal User u,@PathVariable UUID id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.playerHistory(u.getId(),id,page,size); }
    @GetMapping("/team-seasons/{id}/player-memberships") @PreAuthorize("hasRole('ADMIN')")
    public Page<PlayerMembershipResponse> playerMemberships(@AuthenticationPrincipal User u,@PathVariable UUID id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.playerMemberships(u.getId(),id,page,size); }
    @PostMapping("/team-seasons/{id}/player-memberships") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('ADMIN')")
    public PlayerMembershipResponse createPlayerMembership(@AuthenticationPrincipal User u,@PathVariable UUID id,@Valid @RequestBody PlayerMembershipRequest r) { return service.createPlayerMembership(u.getId(),id,r); }
    @GetMapping("/team-seasons/{id}/coach-memberships") @PreAuthorize("hasRole('ADMIN')")
    public Page<CoachMembershipResponse> coachMemberships(@AuthenticationPrincipal User u,@PathVariable UUID id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.coachMemberships(u.getId(),id,page,size); }
    @PostMapping("/team-seasons/{id}/coach-memberships") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('ADMIN')")
    public CoachMembershipResponse createCoachMembership(@AuthenticationPrincipal User u,@PathVariable UUID id,@Valid @RequestBody CoachMembershipRequest r) { return service.createCoachMembership(u.getId(),id,r); }
    @PatchMapping("/player-memberships/{id}") @PreAuthorize("hasRole('ADMIN')")
    public PlayerMembershipResponse updatePlayerMembership(@AuthenticationPrincipal User u,@PathVariable UUID id,@Valid @RequestBody MembershipPatch r) { return service.updatePlayerMembership(u.getId(),id,r); }
    @PatchMapping("/coach-memberships/{id}") @PreAuthorize("hasRole('ADMIN')")
    public CoachMembershipResponse updateCoachMembership(@AuthenticationPrincipal User u,@PathVariable UUID id,@Valid @RequestBody MembershipPatch r) { return service.updateCoachMembership(u.getId(),id,r); }
    @GetMapping("/admin/coach-candidates") @PreAuthorize("hasRole('ADMIN')")
    public Page<CoachCandidateResponse> candidates(@AuthenticationPrincipal User u,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.coachCandidates(u.getId(),page,size); }
}
