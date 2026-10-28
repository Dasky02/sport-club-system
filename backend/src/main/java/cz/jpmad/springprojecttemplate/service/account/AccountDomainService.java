package cz.jpmad.springprojecttemplate.service.account;

import cz.jpmad.springprojecttemplate.api.ApiException;
import cz.jpmad.springprojecttemplate.api.account.dto.AccountDtos.*;
import cz.jpmad.springprojecttemplate.api.team.dto.TeamDtos.Page;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.model.user.enums.*;
import cz.jpmad.springprojecttemplate.repository.*;
import cz.jpmad.springprojecttemplate.service.user.CurrentAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.util.*;

@Service
@Transactional
@RequiredArgsConstructor
public class AccountDomainService {
    private final ClubRepository clubs;
    private final CurrentAccountService current;
    private final AccountDomainRepository data;
    private final TeamDomainRepository teams;
    private final AuditRepository audit;
    private final PasswordEncoder passwords;
    private final Clock clock;
    private User actor(UUID id,boolean write,boolean admin) {
        if(write) clubs.lockForWrite(); else clubs.lockForRead();
        return admin?current.requireAdmin(id):current.requireComplete(id);
    }
    private void page(int page,int size) {
        if(page<0) throw ApiException.invalidField("page","Stránka nesmí být záporná.");
        if(size<1 || size>100) throw ApiException.invalidField("size","Velikost stránky musí být 1–100.");
    }
    private void conflict(String code,String message) { throw new ApiException(HttpStatus.CONFLICT,code,message); }
    private String reason(String value) {
        if(value==null || value.isBlank() || value.length()>500) throw ApiException.invalidField("reason","Vyplňte odůvodnění o délce 1–500 znaků.");
        return value.strip();
    }
    private void lastAdmin(AdminAccount old,Role role,AccountType type,boolean enabled) {
        if(old.role()==Role.ADMIN && old.accountType()==AccountType.STANDARD && old.enabled() && old.personId()!=null &&
                !(role==Role.ADMIN && type==AccountType.STANDARD && enabled) && data.usableAdmins()<=1)
            conflict("LAST_ADMIN_REQUIRED","V klubu musí zůstat alespoň jeden aktivní administrátor s dokončenou osobou.");
    }
    private void childIdentity(UUID person) {
        if(person==null || teams.ownPlayer(person).isEmpty()) conflict("CHILD_ACTIVATION_CONFLICT","Dětský účet vyžaduje vlastní hráčský profil s datem narození.");
        if(teams.person(person).birthDate()==null) conflict("CHILD_ACTIVATION_CONFLICT","Dětský účet vyžaduje datum narození.");
    }
    private void auditBlocked(UUID actor,List<UUID> before,String reason) {
        for(UUID child:before) if(!data.enabled(child) && data.account(child).accountType()==AccountType.CHILD) audit.record(actor,"CHILD_PARENT_LOST","users",child,reason);
    }
    public Page<AdminAccount> accounts(UUID actor,int page,int size) { actor(actor,false,true);page(page,size);return data.accounts(page,size); }
    public AdminAccount account(UUID actor,UUID id) { actor(actor,false,true);return data.account(id); }
    public AdminAccount create(UUID actor,CreateAccountRequest r) {
        actor(actor,true,true); teams.person(r.personId());
        if(data.personHasAccount(r.personId()) || data.usernameUsed(r.username())) conflict("DUPLICATE_RESOURCE","Osoba již má účet nebo přihlašovací jméno existuje.");
        if(r.accountType()==AccountType.CHILD) {
            childIdentity(r.personId());
            if(data.hasGuardianLinks(r.personId())) conflict("STATE_CONFLICT","Oprávněný zástupce nemůže mít dětský účet.");
        }
        UUID id=UUID.randomUUID();data.insertAccount(id,r.personId(),r.username(),passwords.encode(r.password()),r.accountType(),clock.instant());
        audit.record(actor,"USER_CREATED","users",id);return data.account(id);
    }
    public AdminAccount linkPerson(UUID actor,UUID id,PersonLinkRequest r) {
        actor(actor,true,true); String why=reason(r.reason()); var old=data.account(id);
        if(old.personId()!=null) conflict("PROFILE_ALREADY_LINKED","Účet už má propojenou osobu.");
        teams.person(r.personId()); if(data.personHasAccount(r.personId())) conflict("DUPLICATE_RESOURCE","Osoba už má přístupový účet.");
        if(old.accountType()==AccountType.CHILD) { childIdentity(r.personId()); if(old.enabled()) conflict("STATE_CONFLICT","Neúplný dětský účet musí být zakázaný."); }
        data.linkPerson(id,r.personId(),clock.instant());audit.record(actor,"USER_PERSON_LINKED","users",id,why);return data.account(id);
    }
    public AdminAccount role(UUID actor,UUID id,RoleRequest r) {
        actor(actor,true,true);String why=reason(r.reason());var old=data.account(id);
        if(old.accountType()==AccountType.CHILD && r.role()!=Role.USER) conflict("STATE_CONFLICT","Dětský účet nemůže být administrátorem.");
        lastAdmin(old,r.role(),old.accountType(),old.enabled());
        if(old.role()!=r.role()) { data.setRole(id,r.role(),clock.instant());audit.record(actor,"USER_ROLE_CHANGED","users",id,why); }
        return data.account(id);
    }
    public AdminAccount type(UUID actor,UUID id,AccountTypeRequest r) {
        actor(actor,true,true);String why=reason(r.reason());var old=data.account(id);
        if(old.accountType()==r.accountType()) return old;
        lastAdmin(old,old.role(),r.accountType(),false);
        if(r.accountType()==AccountType.CHILD) {
            if(old.role()==Role.ADMIN || data.hasCoaching(id) || data.hasGuardianLinks(old.personId())) conflict("STATE_CONFLICT","Před převodem dítěte odeberte správní roli; trenérská historie nebo rodičovská vazba převod nepovoluje.");
            childIdentity(old.personId());
        }
        var before=data.enabledChildren();data.setType(id,r.accountType(),false,clock.instant());
        audit.record(actor,"USER_ACCOUNT_TYPE_CHANGED","users",id,why);auditBlocked(actor,before,why);return data.account(id);
    }
    public AdminAccount enabled(UUID actor,UUID id,EnabledRequest r) {
        actor(actor,true,true);String why=reason(r.reason());var old=data.account(id);
        if(old.accountType()==AccountType.CHILD && r.enabled()) conflict("CHILD_ACTIVATION_CONFLICT","Použijte výslovnou aktivaci dětského účtu.");
        lastAdmin(old,old.role(),old.accountType(),r.enabled());
        if(old.enabled()!=r.enabled()) {
            var before=data.enabledChildren();data.setEnabled(id,r.enabled(),clock.instant());audit.record(actor,"USER_ENABLED_CHANGED","users",id,why);auditBlocked(actor,before,why);
        }
        return data.account(id);
    }
    public AdminAccount activate(UUID actor,UUID id,ReasonRequest r) {
        actor(actor,true,true);String why=reason(r.reason());var old=data.account(id);
        if(old.accountType()!=AccountType.CHILD) conflict("STATE_CONFLICT","Výslovná dětská aktivace patří pouze dětskému účtu.");
        childIdentity(old.personId());
        if(old.role()!=Role.USER || data.hasCoaching(id) || data.hasGuardianLinks(old.personId()) || !data.activeGuardian(old.personId()))
            conflict("CHILD_ACTIVATION_CONFLICT","Aktivace vyžaduje alespoň jednoho schváleného zástupce s aktivním běžným účtem.");
        if(!old.enabled()) { data.setEnabled(id,true,clock.instant());audit.record(actor,"CHILD_ACCOUNT_ACTIVATED","users",id,why); }
        return data.account(id);
    }
    public Page<GuardianResponse> guardians(UUID actor,UUID player,int page,int size) { actor(actor,false,true);teams.player(player);page(page,size);return data.guardians(player,page,size); }
    public GuardianResponse grant(UUID actor,UUID player,UUID person,ReasonRequest r) {
        actor(actor,true,true);String why=reason(r.reason());var child=teams.player(player);teams.person(person);
        if(child.personId().equals(person) || data.guardianIsChild(person) || data.wouldCreateGuardianCycle(person,child.personId())) conflict("STATE_CONFLICT","Neplatná rodičovská vazba.");
        var old=data.guardian(player,person);if(old.isPresent() && old.get().revokedAt()==null) return old.get();
        data.grant(player,person,actor,clock.instant());audit.recordGuardian(actor,"GUARDIAN_GRANTED",person,player,why);return data.guardian(player,person).orElseThrow();
    }
    public GuardianResponse revoke(UUID actor,UUID player,UUID person,ReasonRequest r) {
        actor(actor,true,true);String why=reason(r.reason());teams.player(player);var old=data.guardian(player,person).orElseThrow();
        if(old.revokedAt()!=null) return old;
        var before=data.enabledChildren();data.revoke(player,person,clock.instant());audit.recordGuardian(actor,"GUARDIAN_REVOKED",person,player,why);auditBlocked(actor,before,why);return data.guardian(player,person).orElseThrow();
    }
    private User parent(UUID actor) { var u=actor(actor,false,false);if(u.getAccountType()!=AccountType.STANDARD) throw new AccessDeniedException("Access denied");return u; }
    public Page<ChildResponse> children(UUID actor,int page,int size) { parent(actor);page(page,size);return data.children(actor,page,size); }
    public ChildResponse child(UUID actor,UUID player) { parent(actor);return data.child(actor,player); }
}
