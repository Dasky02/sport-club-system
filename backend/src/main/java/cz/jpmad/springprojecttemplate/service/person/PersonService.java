package cz.jpmad.springprojecttemplate.service.person;

import cz.jpmad.springprojecttemplate.api.ApiException;
import cz.jpmad.springprojecttemplate.api.person.dto.*;
import cz.jpmad.springprojecttemplate.model.person.Person;
import cz.jpmad.springprojecttemplate.model.user.enums.Role;
import cz.jpmad.springprojecttemplate.repository.*;
import cz.jpmad.springprojecttemplate.service.user.CurrentAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PersonService {
    private final ClubRepository clubs;
    private final PersonRepository persons;
    private final CurrentAccountService accounts;
    private final AuditRepository audit;
    private final Clock clock;
    private final TeamDomainRepository teamData;
    private final AccountDomainRepository accountData;
    @Transactional
    public PersonResponse getOwn(UUID actorId) {
        clubs.lockForRead();
        var user = accounts.requireUsable(actorId);
        if (user.getPersonId() == null) throw new NoSuchElementException("Osobní údaje zatím nebyly doplněny.");
        return PersonResponse.from(persons.findById(user.getPersonId()).orElseThrow());
    }
    @Transactional
    public PersonResponse onboard(UUID actorId, PersonRequest request) {
        clubs.lockForWrite();
        var user = accounts.requireUsable(actorId);
        if (user.getPersonId() != null) throw new ApiException(HttpStatus.CONFLICT, "PROFILE_ALREADY_LINKED", "Účet už je propojen s osobou.");
        if (request.birthDate() != null && request.birthDate().isAfter(LocalDate.now(clock.withZone(ZoneId.of("Europe/Prague"))))) {
            throw ApiException.invalidField("birthDate", "Datum narození nesmí být v budoucnosti.");
        }
        var person = new Person();
        person.setFirstName(request.firstName().strip());
        person.setLastName(request.lastName().strip());
        person.setBirthDate(request.birthDate());
        person.setEmail(optional(request.email()));
        person.setPhone(optional(request.phone()));
        persons.saveAndFlush(person);
        user.setPersonId(person.getId());
        audit.record(actorId, "PERSON_CREATED", "persons", person.getId());
        audit.record(actorId, "USER_PERSON_LINKED", "users", actorId);
        return PersonResponse.from(person);
    }
    @Transactional
    public ContextResponse context(UUID actorId) {
        clubs.lockForRead();
        var user = accounts.requireUsable(actorId);
        List<String> capabilities = user.getPersonId() != null && user.getRole() == Role.ADMIN
                ? List.of("MANAGE_CLUB", "MANAGE_SPORTS", "MANAGE_SEASONS", "MANAGE_TEAMS", "MANAGE_PLAYERS", "MANAGE_MEMBERSHIPS", "MANAGE_ACCOUNTS", "MANAGE_GUARDIANS") : List.of();
        if (user.getPersonId() == null) return new ContextResponse(user.getAccountType(), capabilities, null, List.of(), List.of());
        LocalDate today = LocalDate.now(clock.withZone(ZoneId.of("Europe/Prague")));
        var teams = teamData.currentTeamIds(user.getId(), user.getPersonId(), today).stream()
                .map(id -> new ContextResponse.TeamContext(id, List.of("READ_TEAM"))).toList();
        return new ContextResponse(user.getAccountType(), capabilities, teamData.ownPlayer(user.getPersonId()).orElse(null), teams,
                user.getAccountType()==cz.jpmad.springprojecttemplate.model.user.enums.AccountType.STANDARD ? accountData.children(actorId).stream().map(c->new ContextResponse.ChildContext(c.playerId(),c.displayName(),List.of("READ_CHILD"))).toList() : List.of());
    }
    private String optional(String value) { return value == null || value.isBlank() ? null : value.strip(); }
}
