package cz.jpmad.springprojecttemplate.api.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.model.user.enums.AccountType;
import cz.jpmad.springprojecttemplate.model.user.enums.Role;
import java.time.Instant;
import java.util.UUID;

/** Nikdy neobsahuje hash, legacy_role ani budoucí oprávnění. */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record UserResponse(UUID id, String username, Role role, AccountType accountType, UUID personId,
                           String profileState, Instant createdAt) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getRole(), user.getAccountType(), user.getPersonId(),
                user.getPersonId() == null ? "PENDING" : "COMPLETE", user.getCreatedAt());
    }
}
