package cz.jpmad.springprojecttemplate.api.person.dto;
import cz.jpmad.springprojecttemplate.model.user.enums.AccountType;
import java.util.List;
import java.util.UUID;
/** P1 vrací pouze skutečně implementované schopnosti, bez budoucích doménových práv. */
public record ContextResponse(AccountType accountType, List<String> capabilities, UUID ownPlayerId,
                              List<TeamContext> teamContexts, List<ChildContext> children) {
    public record TeamContext(UUID teamSeasonId, List<String> capabilities) { }
    public record ChildContext(UUID playerId, String displayName, List<String> capabilities) { }
}
