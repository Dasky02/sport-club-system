package cz.jpmad.springprojecttemplate.repository;
import cz.jpmad.springprojecttemplate.model.sport.Sport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface SportRepository extends JpaRepository<Sport, UUID> {
    boolean existsByCode(String code);
}
