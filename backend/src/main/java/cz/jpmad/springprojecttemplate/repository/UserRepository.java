package cz.jpmad.springprojecttemplate.repository;

import cz.jpmad.springprojecttemplate.model.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository pro správu uživatelů.
 * Poskytuje základní CRUD operace a možnost hledat uživatele podle uživatelského jména.
 */
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUsername(String username);
}
