package cz.jpmad.springprojecttemplate.api.sport.dto;
import cz.jpmad.springprojecttemplate.model.sport.Sport;
import java.util.UUID;
public record SportResponse(UUID id, String code, String name, boolean active) {
    public static SportResponse from(Sport sport) { return new SportResponse(sport.getId(), sport.getCode(), sport.getName(), sport.isActive()); }
}
