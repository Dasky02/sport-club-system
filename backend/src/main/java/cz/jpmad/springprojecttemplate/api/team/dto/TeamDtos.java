package cz.jpmad.springprojecttemplate.api.team.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonCreator;
import tools.jackson.databind.JsonNode;
import java.util.Set;
import cz.jpmad.springprojecttemplate.api.person.dto.PersonRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Oddělené vstupy a výstupy; scoped výstupy nikdy neobsahují kontakty ani datum narození. */
public final class TeamDtos {
    private TeamDtos() { }
    public record Page<T>(List<T> items, int page, int size, String totalElements, int totalPages) { }
    public record SeasonRequest(@NotBlank @Size(max=100) String name, @NotNull LocalDate startsOn, @NotNull LocalDate endsOn) { }
    public record SeasonPatch(@Size(min=1,max=100) String name,
                              LocalDate startsOn,
                              LocalDate endsOn) {
        @JsonCreator(mode=JsonCreator.Mode.DELEGATING)
        public static SeasonPatch parse(JsonNode n) {
            var p=new PatchInput(n,Set.of("name","startsOn","endsOn"));
            return new SeasonPatch(p.text("name"),p.date("startsOn"),p.date("endsOn"));
        }
        @JsonIgnore @AssertTrue public boolean isChangePresent() { return name!=null || startsOn!=null || endsOn!=null; }
    }
    public record SeasonResponse(UUID id,String name,LocalDate startsOn,LocalDate endsOn,boolean archived) { }
    public record TeamRequest(@NotNull UUID sportId,@NotBlank @Size(max=120) String name,@NotNull Boolean isClubTeam) { }
    public record TeamPatch(UUID sportId,
                            @Size(min=1,max=120) String name,
                            Boolean isClubTeam) {
        @JsonCreator(mode=JsonCreator.Mode.DELEGATING)
        public static TeamPatch parse(JsonNode n) {
            var p=new PatchInput(n,Set.of("sportId","name","isClubTeam"));
            String sport=p.text("sportId");
            return new TeamPatch(sport==null?null:UUID.fromString(sport),p.text("name"),p.bool("isClubTeam"));
        }
        @JsonIgnore @AssertTrue public boolean isChangePresent() { return sportId!=null || name!=null || isClubTeam!=null; }
    }
    public record TeamResponse(UUID id,UUID sportId,String sportName,String name,boolean isClubTeam) { }
    public record TeamSeasonRequest(@NotNull UUID teamId,@NotNull UUID seasonId,@NotBlank @Size(max=120) String displayName) { }
    public record TeamSeasonPatch(@NotBlank @Size(max=120) String displayName) { }
    public record TeamSeasonResponse(UUID id,UUID teamId,UUID seasonId,UUID sportId,String sportName,String teamName,
                                     String displayName,boolean isClubTeam,String seasonName,LocalDate startsOn,LocalDate endsOn,boolean archived) { }
    public record RosterResponse(UUID playerId,String firstName,String lastName,UUID membershipId,LocalDate validFrom,LocalDate validTo) { }
    public record PlayerRequest(UUID personId,@Valid PersonRequest person) {
        @JsonIgnore @AssertTrue public boolean isExactlyOneIdentity() { return (personId!=null) != (person!=null); }
    }
    public record PlayerResponse(UUID id,UUID personId,String firstName,String lastName,LocalDate birthDate) { }
    public record PlayerBasicResponse(UUID id,String firstName,String lastName) { }
    public record PlayerHistoryResponse(UUID membershipId,UUID teamSeasonId,String displayName,String seasonName,String sportName,LocalDate validFrom,LocalDate validTo) { }
    public record PlayerMembershipRequest(@NotNull UUID playerId,@NotNull LocalDate validFrom,LocalDate validTo) { }
    public record CoachMembershipRequest(@NotNull UUID coachUserId,@NotNull LocalDate validFrom,LocalDate validTo) { }
    public record MembershipPatch(@NotNull LocalDate validFrom,@com.fasterxml.jackson.annotation.JsonProperty(required=true) LocalDate validTo) { }
    public record PlayerMembershipResponse(UUID id,UUID teamSeasonId,UUID playerId,String firstName,String lastName,LocalDate validFrom,LocalDate validTo) { }
    public record CoachMembershipResponse(UUID id,UUID teamSeasonId,UUID coachUserId,String username,String firstName,String lastName,LocalDate validFrom,LocalDate validTo) { }
    public record CoachCandidateResponse(UUID id,String username,String firstName,String lastName) { }
    public record EmptyRequest() { }
    private record PatchInput(JsonNode node,Set<String> fields) {
        private PatchInput {
            if(!node.isObject() || fields.stream().filter(node::has).count()!=node.size()) throw new IllegalArgumentException("Invalid patch fields");
            for(String field:fields) if(node.has(field) && node.get(field).isNull()) throw new IllegalArgumentException("Null patch value");
        }
        String text(String field) {
            if(!node.has(field)) return null;
            if(!node.get(field).isTextual()) throw new IllegalArgumentException("Invalid patch value type");
            return node.get(field).asText();
        }
        LocalDate date(String field) { String s=text(field); return s==null?null:LocalDate.parse(s); }
        Boolean bool(String field) {
            if(!node.has(field)) return null;
            if(!node.get(field).isBoolean()) throw new IllegalArgumentException("Invalid patch value type");
            return node.get(field).asBoolean();
        }
    }
}
