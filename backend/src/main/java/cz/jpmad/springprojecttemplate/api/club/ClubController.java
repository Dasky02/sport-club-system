package cz.jpmad.springprojecttemplate.api.club;
import cz.jpmad.springprojecttemplate.api.auth.dto.UserResponse;
import cz.jpmad.springprojecttemplate.api.club.dto.*;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.service.club.ClubService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/club")
@RequiredArgsConstructor
public class ClubController {
    private final ClubService clubs;
    @GetMapping("/setup-status") public SetupStatusResponse status(@AuthenticationPrincipal User user) { return clubs.status(user.getId()); }
    @PostMapping("/setup") public UserResponse setup(@AuthenticationPrincipal User user, @Valid @RequestBody SetupRequest request) { return clubs.setup(user.getId(), request.token()); }
}
