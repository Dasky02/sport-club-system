package cz.jpmad.springprojecttemplate.service.user;

import cz.jpmad.springprojecttemplate.model.user.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SelfSessionRefresherTests {
    @AfterEach void clear() {SecurityContextHolder.clearContext();}
    @Test void concurrentAdministrativeRevisionCannotBeAdoptedByOnboardingRefresh() {
        var accounts=mock(CurrentAccountService.class);var contexts=mock(SecurityContextRepository.class);var user=new User();user.setId(UUID.randomUUID());user.setAuthRevision(5);
        when(accounts.afterOwnOnboardingOrSetup(user.getId())).thenReturn(user);
        assertThatThrownBy(()->new SelfSessionRefresher(accounts,contexts).refresh(user.getId(),3,new MockHttpServletRequest(),new MockHttpServletResponse())).isInstanceOf(BadCredentialsException.class);
        verifyNoInteractions(contexts);
    }
    @Test void exactlyOwnSingleRevisionMayRefreshTheCurrentSession() {
        var accounts=mock(CurrentAccountService.class);var contexts=mock(SecurityContextRepository.class);var user=new User();user.setId(UUID.randomUUID());user.setAuthRevision(4);
        when(accounts.afterOwnOnboardingOrSetup(user.getId())).thenReturn(user);var request=new MockHttpServletRequest();var response=new MockHttpServletResponse();
        new SelfSessionRefresher(accounts,contexts).refresh(user.getId(),3,request,response);
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isSameAs(user);
        verify(contexts).saveContext(SecurityContextHolder.getContext(),request,response);
    }
}
