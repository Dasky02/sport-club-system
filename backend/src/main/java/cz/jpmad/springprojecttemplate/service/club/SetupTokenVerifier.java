package cz.jpmad.springprojecttemplate.service.club;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Component
public class SetupTokenVerifier {
    private final boolean configured;
    private final byte[] expectedHash;
    public SetupTokenVerifier(@Value("${app.club.setup-token:}") String token) {
        configured = token != null && !token.isBlank();
        expectedHash = digest(configured ? token : "");
    }
    public boolean isConfigured() { return configured; }
    public boolean matches(String supplied) {
        // Stejně dlouhé digesty, žádné porovnávání tajného řetězce pomocí equals.
        return configured && supplied != null && MessageDigest.isEqual(expectedHash, digest(supplied));
    }
    private static byte[] digest(String value) {
        try { return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException("SHA-256 unavailable"); }
    }
}
