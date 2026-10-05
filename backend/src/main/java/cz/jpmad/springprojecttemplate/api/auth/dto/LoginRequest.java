package cz.jpmad.springprojecttemplate.api.auth.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.nio.charset.StandardCharsets;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LoginRequest(

        @JsonProperty("username")
        @NotBlank(message = "Username must not be blank")
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        String username,

        @JsonProperty("password")
        @NotBlank(message = "Password must not be blank")
        @Size(min = 6, max = 72, message = "Password must be between 6 and 72 characters")
        String password
) {
    @JsonIgnore
    @AssertTrue(message = "Password must not exceed 72 UTF-8 bytes")
    public boolean isPasswordWithinBcryptLimit() {
        return password == null || password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
}
