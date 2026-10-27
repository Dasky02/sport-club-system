package cz.jpmad.springprojecttemplate.api.club.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record SetupRequest(@NotBlank(message = "Vyplňte instalační token.") @Size(max = 4096, message = "Neplatný instalační token.") String token) {
    @Override public String toString() { return "SetupRequest[token=REDACTED]"; }
}
