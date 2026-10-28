package cz.jpmad.springprojecttemplate.service.user;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;
import java.util.UUID;

/** Pouze vlastní onboarding a jednorázový setup obnovují svou právě ověřenou session. */
@Component
@RequiredArgsConstructor
public class SelfSessionRefresher {
    private final CurrentAccountService accounts;
    private final SecurityContextRepository contexts;
    public void refresh(UUID id,long previousRevision,HttpServletRequest request,HttpServletResponse response) {
        var user=accounts.afterOwnOnboardingOrSetup(id);
        if(user.getAuthRevision()!=previousRevision+1) throw new org.springframework.security.authentication.BadCredentialsException("Authentication required");
        var context=SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user,null,user.getAuthorities()));
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context,request,response);
    }
}
