package cz.jpmad.springprojecttemplate.api.sport.dto;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
public record SportUpdateRequest(@Size(min = 1, max = 100, message = "Název smí mít 1–100 znaků.") String name, Boolean active) {
    @JsonIgnore @AssertTrue(message = "Vyplňte alespoň jednu změnu.")
    public boolean isChangePresent() { return name != null || active != null; }
}
