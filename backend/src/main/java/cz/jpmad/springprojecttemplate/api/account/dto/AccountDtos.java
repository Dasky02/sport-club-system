package cz.jpmad.springprojecttemplate.api.account.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import cz.jpmad.springprojecttemplate.model.user.enums.AccountType;
import cz.jpmad.springprojecttemplate.model.user.enums.Role;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

public final class AccountDtos {
    private AccountDtos() { }
    public record AdminAccount(UUID id,String username,Role role,AccountType accountType,boolean enabled,
                               UUID personId,String profileState,String firstName,String lastName,Instant createdAt) { }
    public record CreateAccountRequest(@NotNull UUID personId,@NotBlank @Size(min=3,max=50) String username,
                                       @NotBlank @Size(min=6,max=72) String password,@NotNull AccountType accountType) {
        @JsonIgnore @AssertTrue public boolean isPasswordWithinBcryptLimit() {
            return password==null || password.getBytes(StandardCharsets.UTF_8).length<=72;
        }
    }
    public record PersonLinkRequest(@NotNull UUID personId,@NotBlank @Size(max=500) String reason) { }
    public record RoleRequest(@NotNull Role role,@NotBlank @Size(max=500) String reason) { }
    public record AccountTypeRequest(@NotNull AccountType accountType,@NotBlank @Size(max=500) String reason) { }
    public record EnabledRequest(@NotNull Boolean enabled,@NotBlank @Size(max=500) String reason) { }
    public record ReasonRequest(@NotBlank @Size(max=500) String reason) { }
    public record GuardianResponse(UUID guardianPersonId,UUID playerId,String firstName,String lastName,UUID grantedBy,Instant grantedAt,Instant revokedAt) { }
    public record ChildResponse(UUID playerId,String displayName,String firstName,String lastName) { }
}
