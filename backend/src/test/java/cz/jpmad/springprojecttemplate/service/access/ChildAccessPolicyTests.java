package cz.jpmad.springprojecttemplate.service.access;

import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.model.user.enums.AccountType;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class ChildAccessPolicyTests {
    @Test void explicitAllowlistSupportsOnlyImplementedSportOperations() {
        String id=UUID.randomUUID().toString();
        for(String path:List.of("/auth/me","/auth/csrf","/me/person","/me/context","/team-seasons","/team-seasons/"+id,"/team-seasons/"+id+"/players","/players/"+id,"/players/"+id+"/memberships","/info/version","/actuator/health","/events","/events/"+id,"/notifications","/notifications/unread-count","/notifications/"+id))
            assertThat(ChildAccessPolicy.allowedRequest("GET",path)).as(path).isTrue();
        assertThat(ChildAccessPolicy.allowedRequest("POST","/auth/logout")).isTrue();
        for(String path:List.of("/me/fees","/notifications/count","/me/children","/club/setup","/admin/users","/team-seasons/"+id+"/coach-memberships","/players","/players/"+id+"/guardians"))
            assertThat(ChildAccessPolicy.allowedRequest("GET",path)).as(path).isFalse();
        assertThat(ChildAccessPolicy.allowedRequest("PUT","/events/"+id+"/participants/"+id+"/availability")).isTrue();
        assertThat(ChildAccessPolicy.allowedRequest("PUT","/events/"+id+"/participants/"+id+"/attendance")).isFalse();
        assertThat(ChildAccessPolicy.allowedRequest("POST","/notifications/"+id+"/read")).isTrue();
        assertThat(ChildAccessPolicy.allowedRequest("POST","/events/"+id+"/publish")).isFalse();
        for(String method:List.of("PUT","PATCH","DELETE","POST")) assertThat(ChildAccessPolicy.allowedRequest(method,"/me/person")).isFalse();
        assertThat(ChildAccessPolicy.allowedRequest("GET","/players/not-a-uuid")).isFalse();
    }
    @Test void financialRuleIsIndependentOfOwnershipAndRole() {
        var child=new User();child.setAccountType(AccountType.CHILD);
        assertThatThrownBy(()->ChildAccessPolicy.requireFinancialAccess(child)).isInstanceOf(AccessDeniedException.class);
        var standard=new User();assertThatCode(()->ChildAccessPolicy.requireFinancialAccess(standard)).doesNotThrowAnyException();
        assertThat(ChildAccessPolicy.isFinancialNotification("FEE_DUE_SOON")).isTrue();
        assertThat(ChildAccessPolicy.isFinancialNotification("FEE_OVERDUE")).isTrue();
        assertThat(ChildAccessPolicy.isFinancialNotification("EVENT_CREATED")).isFalse();
        assertThat(ChildAccessPolicy.isFinancialPath("/me/children/"+UUID.randomUUID()+"/fees/export")).isTrue();
    }
}
