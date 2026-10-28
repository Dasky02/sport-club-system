package cz.jpmad.springprojecttemplate.api.account;

import cz.jpmad.springprojecttemplate.api.account.dto.AccountDtos.*;
import cz.jpmad.springprojecttemplate.api.team.dto.TeamDtos.Page;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.service.account.AccountDomainService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class AccountDomainController {
    private final AccountDomainService service;
    @GetMapping("/admin/users") @PreAuthorize("hasRole('ADMIN')")
    public Page<AdminAccount> accounts(@AuthenticationPrincipal User u,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.accounts(u.getId(),page,size); }
    @GetMapping("/admin/users/{id}") @PreAuthorize("hasRole('ADMIN')")
    public AdminAccount account(@AuthenticationPrincipal User u,@PathVariable UUID id) { return service.account(u.getId(),id); }
    @PostMapping("/admin/users") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('ADMIN')")
    public AdminAccount create(@AuthenticationPrincipal User u,@Valid @RequestBody CreateAccountRequest r) { return service.create(u.getId(),r); }
    @PostMapping("/admin/users/{id}/person-link") @PreAuthorize("hasRole('ADMIN')")
    public AdminAccount link(@AuthenticationPrincipal User u,@PathVariable UUID id,@Valid @RequestBody PersonLinkRequest r) { return service.linkPerson(u.getId(),id,r); }
    @PatchMapping("/admin/users/{id}/role") @PreAuthorize("hasRole('ADMIN')")
    public AdminAccount role(@AuthenticationPrincipal User u,@PathVariable UUID id,@Valid @RequestBody RoleRequest r) { return service.role(u.getId(),id,r); }
    @PatchMapping("/admin/users/{id}/account-type") @PreAuthorize("hasRole('ADMIN')")
    public AdminAccount type(@AuthenticationPrincipal User u,@PathVariable UUID id,@Valid @RequestBody AccountTypeRequest r) { return service.type(u.getId(),id,r); }
    @PatchMapping("/admin/users/{id}/enabled") @PreAuthorize("hasRole('ADMIN')")
    public AdminAccount enabled(@AuthenticationPrincipal User u,@PathVariable UUID id,@Valid @RequestBody EnabledRequest r) { return service.enabled(u.getId(),id,r); }
    @PostMapping("/admin/users/{id}/activate") @PreAuthorize("hasRole('ADMIN')")
    public AdminAccount activate(@AuthenticationPrincipal User u,@PathVariable UUID id,@Valid @RequestBody ReasonRequest r) { return service.activate(u.getId(),id,r); }
    @GetMapping("/players/{playerId}/guardians") @PreAuthorize("hasRole('ADMIN')")
    public Page<GuardianResponse> guardians(@AuthenticationPrincipal User u,@PathVariable UUID playerId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.guardians(u.getId(),playerId,page,size); }
    @PutMapping("/players/{playerId}/guardians/{guardianPersonId}") @PreAuthorize("hasRole('ADMIN')")
    public GuardianResponse grant(@AuthenticationPrincipal User u,@PathVariable UUID playerId,@PathVariable UUID guardianPersonId,@Valid @RequestBody ReasonRequest r) { return service.grant(u.getId(),playerId,guardianPersonId,r); }
    @PostMapping("/players/{playerId}/guardians/{guardianPersonId}/revoke") @PreAuthorize("hasRole('ADMIN')")
    public GuardianResponse revoke(@AuthenticationPrincipal User u,@PathVariable UUID playerId,@PathVariable UUID guardianPersonId,@Valid @RequestBody ReasonRequest r) { return service.revoke(u.getId(),playerId,guardianPersonId,r); }
    @GetMapping("/me/children")
    public Page<ChildResponse> children(@AuthenticationPrincipal User u,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.children(u.getId(),page,size); }
    @GetMapping("/me/children/{playerId}")
    public ChildResponse child(@AuthenticationPrincipal User u,@PathVariable UUID playerId) { return service.child(u.getId(),playerId); }
}
