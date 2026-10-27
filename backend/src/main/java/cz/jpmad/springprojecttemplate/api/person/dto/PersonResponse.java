package cz.jpmad.springprojecttemplate.api.person.dto;
import cz.jpmad.springprojecttemplate.model.person.Person;
import java.time.LocalDate;
import java.util.UUID;
public record PersonResponse(UUID id, String firstName, String lastName, LocalDate birthDate, String email, String phone) {
    public static PersonResponse from(Person person) {
        return new PersonResponse(person.getId(), person.getFirstName(), person.getLastName(), person.getBirthDate(), person.getEmail(), person.getPhone());
    }
}
