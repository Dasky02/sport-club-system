package cz.jpmad.springprojecttemplate.service.user;

import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.model.user.enums.Role;
import cz.jpmad.springprojecttemplate.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserServiceTests {
    @Test
    void registrationPersistsOnlyUserRoleAndBcryptHash() {
        var repository = mock(UserRepository.class);
        var encoder = new BCryptPasswordEncoder();
        when(repository.findByUsername("newuser")).thenReturn(Optional.empty());
        when(repository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        var result = new UserService(repository, encoder).register("newuser", "test-password");
        assertThat(result.getRole()).isEqualTo(Role.USER);
        assertThat(encoder.matches("test-password", result.getPasswordHash())).isTrue();
        assertThat(result.getPasswordHash()).doesNotContain("test-password");
    }

    @Test
    void duplicateUsernameCannotOverwriteExistingAccount() {
        var repository = mock(UserRepository.class);
        when(repository.findByUsername("existing")).thenReturn(Optional.of(new User()));
        var service = new UserService(repository, new BCryptPasswordEncoder());
        assertThatThrownBy(() -> service.register("existing", "test-password")).isInstanceOf(IllegalStateException.class);
        verify(repository, never()).save(any());
    }
}
