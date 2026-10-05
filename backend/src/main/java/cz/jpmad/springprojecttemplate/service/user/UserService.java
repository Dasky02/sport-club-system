package cz.jpmad.springprojecttemplate.service.user;

import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.model.user.enums.Role;
import cz.jpmad.springprojecttemplate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Služba pro správu uživatelů a autentizaci.
 * Implementuje UserDetailsService pro integraci s Spring Security.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Načte uživatele podle username pro autentizaci.
     *
     * @throws UsernameNotFoundException pokud uživatel neexistuje
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(final String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }

    /**
     * Registrace nového uživatele s výchozí rolí USER.
     *
     * @throws IllegalStateException pokud uživatelské jméno již existuje
     */
    @Transactional
    public User register(final String username, final String rawPassword) {
        if (userRepository.findByUsername(username).isPresent()) {
            throw new IllegalStateException("Username already exists: " + username);
        }

        final User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(Role.USER);

        final User saved = userRepository.save(user);
        log.info("Registered new user: {}", saved.getUsername());
        return saved;
    }

    /**
     * Vrátí uživatele podle username.
     *
     * @throws java.util.NoSuchElementException pokud uživatel neexistuje
     */
    @Transactional(readOnly = true)
    public User getByUsername(final String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new java.util.NoSuchElementException("User not found: " + username));
    }
}
