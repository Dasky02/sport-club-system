package cz.jpmad.springprojecttemplate.service.access;

import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.model.user.enums.AccountType;
import org.springframework.security.access.AccessDeniedException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

/** Společná hranice pro dnešní HTTP i budoucí finanční a notifikační služby. */
public final class ChildAccessPolicy {
    private ChildAccessPolicy() { }
    private static final Set<String> FINANCIAL_SEGMENTS=Set.of("fees","fee-assessments","fee-payments","payments","finance","financial-notifications");
    public static boolean isFinancialPath(String path) {
        return Arrays.stream(path.toLowerCase(Locale.ROOT).split("/")).anyMatch(FINANCIAL_SEGMENTS::contains);
    }
    private static final String UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

    public static boolean allowedRequest(String method,String path) {
        if(method.equals("POST")) return path.equals("/auth/logout") || path.equals("/auth/login") || path.equals("/auth/register")
                || path.matches("/notifications/"+UUID+"/read");
        if(method.equals("PUT")) return path.matches("/events/"+UUID+"/participants/"+UUID+"/availability");
        if(!method.equals("GET")) return false;
        if(Set.of("/auth/me","/auth/csrf","/me/person","/me/context","/team-seasons","/actuator/health","/events","/notifications","/notifications/unread-count").contains(path)) return true;
        if(path.startsWith("/info/") || path.startsWith("/v3/api-docs") || path.startsWith("/swagger-ui")) return true;
        return path.matches("/team-seasons/"+UUID+"(/players)?") || path.matches("/players/"+UUID+"(/memberships)?")
                || path.matches("/events/"+UUID) || path.matches("/notifications/"+UUID);
    }
    public static boolean isFinancialNotification(String type) {
        return "FEE_DUE_SOON".equals(type) || "FEE_OVERDUE".equals(type);
    }
    public static void requireFinancialAccess(User user) {
        if(user.getAccountType()==AccountType.CHILD) throw new AccessDeniedException("Access denied");
    }
}
