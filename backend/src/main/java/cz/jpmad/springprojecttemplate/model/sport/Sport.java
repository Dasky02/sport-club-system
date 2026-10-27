package cz.jpmad.springprojecttemplate.model.sport;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.UUID;

@Entity
@Table(name = "sports")
@Getter
@Setter
public class Sport {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false, unique = true, length = 40) private String code;
    @Column(nullable = false, length = 100) private String name;
    @Column(nullable = false) private boolean active = true;
}
