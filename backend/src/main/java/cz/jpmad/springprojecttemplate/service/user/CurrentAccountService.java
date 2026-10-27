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
    @Transactional(readOnly = true)
    public User requireUsable(UUID userId) {
        User user = users.findById(userId).orElseThrow(() -> new BadCredentialsException("Authentication required"));
        // Také při volání po club locku načteme novou verzi případné již managed entity.
        entityManager.refresh(user);
        // P1 nemá hráčské profily/guardians; CHILD proto nikdy není platný přihlašovací účet.
        if (!user.isEnabled() || user.getAccountType() != AccountType.STANDARD) {
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
        if (user.getRole() != Role.ADMIN) throw new AccessDeniedException("Access denied");
        return user;
    }
}
