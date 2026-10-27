package cz.jpmad.springprojecttemplate.config;

import cz.jpmad.springprojecttemplate.api.GlobalExceptionHandler;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.service.user.CurrentAccountService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.json.JsonMapper;
import java.io.IOException;
import java.util.Set;

/** Session nese identitu, nikoli autoritativní kopii oprávnění. */
@RequiredArgsConstructor
public class FreshAccountFilter extends OncePerRequestFilter {
    private final CurrentAccountService accounts;
    private final JsonMapper mapper;
    private static final Set<String> ONBOARDING = Set.of("/auth/me", "/auth/csrf", "/auth/logout", "/me/person", "/me/context");
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User previous) {
            User current;
            try {
                current = accounts.requireUsable(previous.getId());
            } catch (BadCredentialsException denied) {
                var session = request.getSession(false);
                if (session != null) session.invalidate();
                SecurityContextHolder.clearContext();
                if (isPublic(request)) { chain.doFilter(request, response); return; }
                writeError(response, 401, "UNAUTHORIZED", "Authentication required");
                return;
            }
            var refreshed = UsernamePasswordAuthenticationToken.authenticated(current, null, current.getAuthorities());
            refreshed.setDetails(auth.getDetails());
            // Repository může vrátit tutéž session instanci dvěma souběžným requestům.
            // Nemutujeme ji: každý request má vlastní čerstvě ověřené authorities.
            var requestContext = SecurityContextHolder.createEmptyContext();
            requestContext.setAuthentication(refreshed);
            SecurityContextHolder.setContext(requestContext);
            if (current.getPersonId() == null && !isPublic(request) && !ONBOARDING.contains(request.getServletPath())) {
                writeError(response, 403, "PROFILE_INCOMPLETE", "Nejprve dokončete vlastní osobní údaje.");
                return;
            }
        }
        chain.doFilter(request, response);
    }
    private boolean isPublic(HttpServletRequest request) {
        String path = request.getServletPath();
        return (request.getMethod().equals("GET") && (path.startsWith("/info/") || path.equals("/actuator/health")
                || path.startsWith("/v3/api-docs") || path.startsWith("/swagger-ui")))
                || (request.getMethod().equals("POST") && (path.equals("/auth/login") || path.equals("/auth/register")))
                || (request.getMethod().equals("GET") && path.equals("/auth/csrf"));
    }
    private void writeError(HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        mapper.writeValue(response.getOutputStream(), GlobalExceptionHandler.error(code, message));
    }
}
