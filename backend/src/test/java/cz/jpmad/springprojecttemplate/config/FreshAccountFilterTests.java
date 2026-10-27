package cz.jpmad.springprojecttemplate.config;

import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.model.user.enums.Role;
import cz.jpmad.springprojecttemplate.service.user.CurrentAccountService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import tools.jackson.databind.json.JsonMapper;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

class FreshAccountFilterTests {

    @AfterEach
    void clearRequestContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void refreshIsRequestLocalEvenWhenRequestsLoadTheSameSessionContext() throws Exception {
        UUID accountId = UUID.randomUUID();
        UUID personId = UUID.randomUUID();
        User original = account(accountId, personId, Role.ADMIN);
        var originalAuthentication = UsernamePasswordAuthenticationToken.authenticated(
                original, null, original.getAuthorities());
        SecurityContext sharedSessionContext = SecurityContextHolder.createEmptyContext();
        sharedSessionContext.setAuthentication(originalAuthentication);
        var session = new MockHttpSession();
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, sharedSessionContext);

        User firstSnapshot = account(accountId, personId, Role.ADMIN);
        User afterRevocation = account(accountId, personId, Role.USER);
        var accounts = mock(CurrentAccountService.class);
        when(accounts.requireUsable(accountId)).thenReturn(firstSnapshot, afterRevocation);
        var filter = new FreshAccountFilter(accounts, JsonMapper.builder().build());
        var repository = new HttpSessionSecurityContextRepository();

        // Both request loaders return the same object from the session, as they can
        // for concurrent browser requests. Keep the first request's downstream
        // context alive while refreshing the second to model their overlap.
        var firstRequest = request(session);
        var secondRequest = request(session);
        SecurityContext firstLoaded = repository.loadDeferredContext(firstRequest).get();
        SecurityContext secondLoaded = repository.loadDeferredContext(secondRequest).get();
        assertThat(firstLoaded).isSameAs(sharedSessionContext);
        assertThat(secondLoaded).isSameAs(sharedSessionContext);

        var firstDownstream = new AtomicReference<SecurityContext>();
        SecurityContextHolder.setContext(firstLoaded);
        filter.doFilter(firstRequest, new MockHttpServletResponse(),
                (request, response) -> firstDownstream.set(SecurityContextHolder.getContext()));

        var secondDownstream = new AtomicReference<SecurityContext>();
        SecurityContextHolder.setContext(secondLoaded);
        filter.doFilter(secondRequest, new MockHttpServletResponse(),
                (request, response) -> secondDownstream.set(SecurityContextHolder.getContext()));

        assertThat(firstDownstream.get()).isNotSameAs(sharedSessionContext);
        assertThat(secondDownstream.get()).isNotSameAs(sharedSessionContext).isNotSameAs(firstDownstream.get());
        assertThat(firstDownstream.get().getAuthentication().getPrincipal()).isSameAs(firstSnapshot);
        assertThat(firstDownstream.get().getAuthentication().getAuthorities())
                .extracting("authority").containsExactly("ROLE_ADMIN");
        assertThat(secondDownstream.get().getAuthentication().getPrincipal()).isSameAs(afterRevocation);
        assertThat(secondDownstream.get().getAuthentication().getAuthorities())
                .extracting("authority").containsExactly("ROLE_USER");
        assertThat(sharedSessionContext.getAuthentication()).isSameAs(originalAuthentication);
        assertThat(session.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY))
                .isSameAs(sharedSessionContext);
        verify(accounts, times(2)).requireUsable(accountId);
    }

    private MockHttpServletRequest request(MockHttpSession session) {
        var request = new MockHttpServletRequest("GET", "/api/actuator/metrics");
        request.setContextPath("/api");
        request.setServletPath("/actuator/metrics");
        request.setSession(session);
        return request;
    }

    private User account(UUID id, UUID personId, Role role) {
        var user = new User();
        user.setId(id);
        user.setPersonId(personId);
        user.setUsername("session-test");
        user.setRole(role);
        return user;
    }
}
