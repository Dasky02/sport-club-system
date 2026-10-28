package cz.jpmad.springprojecttemplate.service.user;

import cz.jpmad.springprojecttemplate.api.ApiException;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.model.user.enums.AccountType;
import cz.jpmad.springprojecttemplate.model.user.enums.Role;
import cz.jpmad.springprojecttemplate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import jakarta.persistence.EntityManager;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CurrentAccountService {
    private final UserRepository users;
    private final EntityManager entityManager;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Transactional(readOnly = true)
    public User requireUsable(UUID userId) {
        User user=loadUsable(userId);
        var auth=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if(auth!=null && auth.getPrincipal() instanceof User snapshot && snapshot.getId().equals(userId) && snapshot.getAuthRevision()!=user.getAuthRevision())
            throw new BadCredentialsException("Authentication required");
        return user;
    }
    @Transactional(readOnly=true)
    public User afterOwnOnboardingOrSetup(UUID userId) { return loadUsable(userId); }
    private User loadUsable(UUID userId) {
        User user = users.findById(userId).orElseThrow(() -> new BadCredentialsException("Authentication required"));
        // Také při volání po club locku načteme novou verzi případné již managed entity.
        entityManager.refresh(user);
        if (!user.isEnabled() || (user.getAccountType() == AccountType.CHILD &&
                (user.getRole() != Role.USER || user.getPersonId() == null ||
                 !Boolean.TRUE.equals(jdbc.queryForObject("SELECT p3_has_active_guardian(?) AND EXISTS(SELECT 1 FROM player_profiles WHERE person_id=?)", Boolean.class, user.getPersonId(), user.getPersonId()))))) {
            throw new BadCredentialsException("Authentication required");
        }
        return user;
    }
    @Transactional(readOnly = true)
    public User requireComplete(UUID userId) {
        User user = requireUsable(userId);
        if (user.getPersonId() == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PROFILE_INCOMPLETE", "Nejprve dokončete vlastní osobní údaje.");
        }
        return user;
    }
    @Transactional(readOnly = true)
    public User requireAdmin(UUID userId) {
        User user = requireComplete(userId);
        if (user.getAccountType() != AccountType.STANDARD || user.getRole() != Role.ADMIN) throw new AccessDeniedException("Access denied");
        return user;
    }
}
