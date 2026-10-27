package cz.jpmad.springprojecttemplate.api.sport.dto;
import jakarta.validation.constraints.*;
public record SportRequest(
        @NotNull(message = "Vyplňte kód sportu.") @Pattern(regexp = "[A-Z][A-Z0-9_]{0,39}", message = "Kód tvoří 1–40 velkých písmen, číslic a podtržítek a začíná písmenem.") String code,
        @NotBlank(message = "Vyplňte název sportu.") @Size(max = 100, message = "Název smí mít nejvýše 100 znaků.") String name
) { }
