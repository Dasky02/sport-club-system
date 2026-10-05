package cz.jpmad.springprojecttemplate.api.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.model.user.enums.Role;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO pro odpověď s uživatelskými údaji.
 * Nikdy neobsahuje heslo ani hash hesla.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserResponse(

        @JsonProperty("id")
        UUID id,

        @JsonProperty("username")
        String username,

        @JsonProperty("role")
        Role role,

        @JsonProperty("createdAt")
        Instant createdAt
) {
    public static UserResponse from(final User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}
