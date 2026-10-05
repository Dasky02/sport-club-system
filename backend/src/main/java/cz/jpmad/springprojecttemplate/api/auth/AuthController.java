package cz.jpmad.springprojecttemplate.api.auth;

import cz.jpmad.springprojecttemplate.api.auth.dto.CsrfResponse;
import cz.jpmad.springprojecttemplate.api.auth.dto.LoginRequest;
import cz.jpmad.springprojecttemplate.api.auth.dto.RegisterRequest;
import cz.jpmad.springprojecttemplate.api.auth.dto.UserResponse;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.service.user.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller pro autentizaci a registraci.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Autentizace uživatelů")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final SecurityContextRepository securityContextRepository;

    @GetMapping("/csrf")
    @Operation(summary = "Vrátí CSRF token pro následující změnový požadavek")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getToken(), token.getHeaderName(), token.getParameterName());
    }

    /**
     * Přihlášení uživatele. Ověří credentials a vrátí údaje uživatele.
     */
    @PostMapping("/login")
    @Operation(summary = "Login uživatele", description = "Vytvoří HTTP session (JSESSIONID) s uživatelem")
    @ApiResponse(responseCode = "200", description = "Uživatel přihlášen",
            content = @Content(schema = @Schema(implementation = UserResponse.class)))
    @ApiResponse(responseCode = "400", description = "Nevalidní vstup")
    @ApiResponse(responseCode = "401", description = "Neplatné přihlašovací údaje")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody final LoginRequest request,
                                              HttpServletRequest httpReq, HttpServletResponse httpRes) {
        var authToken = new UsernamePasswordAuthenticationToken(request.username(), request.password());
        var authentication = authenticationManager.authenticate(authToken); // vyhodí BadCredentials při chybě

        sessionAuthenticationStrategy.onAuthentication(authentication, httpReq, httpRes);

        // Uložení do SecurityContextu a session
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpReq, httpRes);
        final User user = (User) authentication.getPrincipal();

        assert user != null;
        return ResponseEntity.status(HttpStatus.OK).body(UserResponse.from(user));
    }

    /**
     * Registrace nového uživatele.
     */
    @Operation(
            summary = "Registrace uživatele",
            description = "Vytvoří nového uživatele v databázi"
    )
    @ApiResponse(responseCode = "201", description = "Uživatel vytvořen",
            content = @Content(schema = @Schema(implementation = UserResponse.class)))
    @ApiResponse(responseCode = "400", description = "Nevalidní vstup")
    @ApiResponse(responseCode = "409", description = "Uživatel již existuje")
    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody final RegisterRequest request) {
        final User user = userService.register(request.username(), request.password());
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(user));
    }

    /**
     * Vrátí aktuálně přihlášeného uživatele.
     * Vyžaduje autentizaci ze session.
     */
    @Operation(summary = "Vrátí přihlášeného uživatele ze session (JSESSIONID)")
    @ApiResponse(responseCode = "200", description = "Uživatel přihlášen",
            content = @Content(schema = @Schema(implementation = UserResponse.class)))
    @ApiResponse(responseCode = "401", description = "Neplatné přihlašovací údaje")
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal final User user) {
        if (user == null) {
            throw new BadCredentialsException("Not authenticated");
        }
        return ResponseEntity.status(HttpStatus.OK).body(UserResponse.from(user));
    }

    // POST /auth/logout zpracovává výhradně Spring Security LogoutFilter.
}
