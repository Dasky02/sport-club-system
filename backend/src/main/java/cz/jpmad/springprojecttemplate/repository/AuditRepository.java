package cz.jpmad.springprojecttemplate.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.UUID;

/** Audit obsahuje pouze identifikaci cíle a druh operace, nikdy obsah requestu. */
@Repository
@RequiredArgsConstructor
public class AuditRepository {
    private final JdbcTemplate jdbc;
    private final Clock clock;
    public void record(UUID actorId, String action, String entityType, Object targetId) {
        String key = targetId instanceof Number ? "{\"id\":" + targetId + "}" : "{\"id\":\"" + targetId + "\"}";
        jdbc.update("INSERT INTO audit_log (id, actor_user_id, occurred_at, action, entity_type, entity_key) VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb))",
                UUID.randomUUID(), actorId, Timestamp.from(clock.instant()), action, entityType, key);
    }
}
