package cz.jpmad.springprojecttemplate.model.person;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "persons")
@Getter
@Setter
public class Person {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;
    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;
    @Column(name = "birth_date")
    private LocalDate birthDate;
    @Column(length = 254)
    private String email;
    @Column(length = 40)
    private String phone;
}
