package cz.jpmad.springprojecttemplate.service.club;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SetupTokenVerifierTests {
    @Test
    void absentOrBlankConfigurationDisablesAllClaims() {
        for (String configured : new String[]{null, "", "  "}) {
            var verifier = new SetupTokenVerifier(configured);
            assertThat(verifier.isConfigured()).isFalse();
            assertThat(verifier.matches(configured)).isFalse();
            assertThat(verifier.matches("arbitrary-test-token")).isFalse();
        }
    }

    @Test
    void tokenMustMatchExactlyWithoutTrimmingOrPrefixAcceptance() {
        var verifier = new SetupTokenVerifier("private-test-installation-token");
        assertThat(verifier.isConfigured()).isTrue();
        assertThat(verifier.matches("private-test-installation-token")).isTrue();
        for (String supplied : new String[]{null, "", "private-test-installation", " private-test-installation-token", "private-test-installation-token "}) {
            assertThat(verifier.matches(supplied)).isFalse();
        }
    }
}
