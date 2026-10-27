package cz.jpmad.springprojecttemplate.api.person.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record PersonRequest(
        @NotBlank(message = "Vyplňte jméno.") @Size(max = 100, message = "Jméno smí mít nejvýše 100 znaků.") String firstName,
        @NotBlank(message = "Vyplňte příjmení.") @Size(max = 100, message = "Příjmení smí mít nejvýše 100 znaků.") String lastName,
        LocalDate birthDate,
        @Email(message = "Vyplňte platný e-mail.") @Size(max = 254, message = "E-mail je příliš dlouhý.") String email,
        @Size(max = 40, message = "Telefon smí mít nejvýše 40 znaků.") String phone
) { }
