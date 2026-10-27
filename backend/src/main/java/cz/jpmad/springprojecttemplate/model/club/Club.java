package cz.jpmad.springprojecttemplate.model.club;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "club")
@Getter
@Setter
public class Club {
    @Id private Short id;
    @Column(nullable = false, length = 120) private String name;
    @Column(name = "setup_completed_at") private Instant setupCompletedAt;
    @Column(name = "setup_completed_by") private UUID setupCompletedBy;
    public boolean isSetupCompleted() { return setupCompletedAt != null; }
}
