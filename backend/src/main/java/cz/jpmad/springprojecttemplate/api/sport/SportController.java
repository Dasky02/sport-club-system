package cz.jpmad.springprojecttemplate.api.sport;
import cz.jpmad.springprojecttemplate.api.sport.dto.*;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.service.sport.SportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController
@RequestMapping("/sports")
@RequiredArgsConstructor
public class SportController {
    private final SportService sports;
    @GetMapping public SportPageResponse list(@AuthenticationPrincipal User user, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) { return sports.list(user.getId(), page, size); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public SportResponse create(@AuthenticationPrincipal User user, @Valid @RequestBody SportRequest request) { return sports.create(user.getId(), request); }
    @PatchMapping("/{id}")
    public SportResponse update(@AuthenticationPrincipal User user, @PathVariable UUID id, @Valid @RequestBody SportUpdateRequest request) { return sports.update(user.getId(), id, request); }
}
