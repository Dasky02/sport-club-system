package cz.jpmad.springprojecttemplate.service.club;

import cz.jpmad.springprojecttemplate.api.ApiException;
import cz.jpmad.springprojecttemplate.api.auth.dto.UserResponse;
import cz.jpmad.springprojecttemplate.api.club.dto.SetupStatusResponse;
import cz.jpmad.springprojecttemplate.model.user.enums.Role;
import cz.jpmad.springprojecttemplate.repository.*;
import cz.jpmad.springprojecttemplate.service.user.CurrentAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClubService {
    private final ClubRepository clubs;
    private final UserRepository users;
    private final CurrentAccountService accounts;
    private final SetupTokenVerifier tokenVerifier;
    private final AuditRepository audit;
    private final Clock clock;
    @Transactional
    public SetupStatusResponse status(UUID actorId) {
        var club = clubs.lockForRead();
        var user = accounts.requireComplete(actorId);
        boolean available = !club.isSetupCompleted() && !users.existsByRole(Role.ADMIN) && user.getRole() != Role.ADMIN && tokenVerifier.isConfigured();
        return new SetupStatusResponse(club.isSetupCompleted(), available, club.getName());
    }
    @Transactional
    public UserResponse setup(UUID actorId, String suppliedToken) {
        var club = clubs.lockForWrite();
        var user = accounts.requireComplete(actorId);
        if (club.isSetupCompleted() || users.existsByRole(Role.ADMIN)) throw new ApiException(HttpStatus.CONFLICT, "SETUP_ALREADY_COMPLETED", "Správa klubu už byla nastavena.");
        if (!tokenVerifier.isConfigured()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SETUP_UNAVAILABLE", "Prvotní nastavení není povoleno.");
        if (!tokenVerifier.matches(suppliedToken)) throw new AccessDeniedException("Access denied");
        user.setRole(Role.ADMIN);
        club.setSetupCompletedAt(clock.instant());
        club.setSetupCompletedBy(actorId);
        audit.record(actorId, "CLUB_SETUP_COMPLETED", "club", 1);
        audit.record(actorId, "USER_ROLE_CHANGED", "users", actorId);
        return UserResponse.from(user);
    }
}
