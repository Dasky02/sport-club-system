package cz.jpmad.springprojecttemplate.repository;
import cz.jpmad.springprojecttemplate.model.club.Club;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
public interface ClubRepository extends JpaRepository<Club, Short> {
    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("select c from Club c where c.id = 1")
    Club lockForRead();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Club c where c.id = 1")
    Club lockForWrite();
}
