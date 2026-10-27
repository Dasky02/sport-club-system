package cz.jpmad.springprojecttemplate.api.person;
import cz.jpmad.springprojecttemplate.api.person.dto.*;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.service.person.PersonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/me")
@RequiredArgsConstructor
public class PersonController {
    private final PersonService people;
    @GetMapping("/person")
    public PersonResponse person(@AuthenticationPrincipal User user) { return people.getOwn(user.getId()); }
    @PostMapping("/person") @ResponseStatus(HttpStatus.CREATED)
    public PersonResponse onboard(@AuthenticationPrincipal User user, @Valid @RequestBody PersonRequest request) { return people.onboard(user.getId(), request); }
    @GetMapping("/context")
    public ContextResponse context(@AuthenticationPrincipal User user) { return people.context(user.getId()); }
}
