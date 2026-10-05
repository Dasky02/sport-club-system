package cz.jpmad.springprojecttemplate.api;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Globální zpracování výjimek pro REST API.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Zpracování neplatných argumentů (400).
     */
    @ExceptionHandler({IllegalArgumentException.class})
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        log.warn("Unvalid request: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error("BAD_REQUEST", ex.getMessage()));
    }

    /**
     * Zpracování konfliktů (409).
     */
    @ExceptionHandler({IllegalStateException.class})
    public ResponseEntity<Map<String, Object>> handleConflict(IllegalStateException ex) {
        log.warn("Conflict: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error("CONFLICT", ex.getMessage()));
    }

    /**
     * Zpracování validačních chyb (400).
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        var fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> Map.of(
                        "field", fe.getField(),
                        "message", fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Invalid value"
                ))
                .toList();
        log.warn("Validation failed: {}", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error("VALIDATION_ERROR",
                "Validation failed for one or more fields", fieldErrors.toString()
        ));
    }

    /**
     * Zpracování chyb při bindování dat (400).
     */
    @ExceptionHandler(BindException.class)
    public ResponseEntity<Map<String, Object>> handleBind(BindException ex) {
        var fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> Map.of(
                        "field", fe.getField(),
                        "message", fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Invalid value"
                ))
                .toList();
        log.warn("Binding failed: {}", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error("VALIDATION_ERROR",
                "Binding failed for one or more fields", fieldErrors.toString()));
    }

    /**
     * Zpracování nenalezených entit (404).
     */
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NoSuchElementException ex) {
        log.warn("Entity not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", ex.getMessage()));
    }

    /**
     * Zpracování nenalezených uživatelů (404).
     */
    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleUsernameNotFound(UsernameNotFoundException ex) {
        log.warn("Username not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", ex.getMessage()));
    }

    /**
     * Zpracování odmítnuté autorizace (403).
     */
    @ExceptionHandler({AuthorizationDeniedException.class})
    public ResponseEntity<Map<String, Object>> handleForbidden(AuthorizationDeniedException ex) {
        log.warn("Authorization denied: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("FORBIDDEN", "Authorization denied"));
    }

    /**
     * Zpracování porušení integrity dat (409).
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(error("CONFLICT", "Unique constraint violated"));
    }

    /**
     * Zpracování špatných přihlašovacích údajů (401).
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex) {
        log.warn("Bad credentials: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(error("UNAUTHORIZED", "Bad credentials"));
    }

    /**
     * Zpracování odmítnutého přístupu (403).
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("FORBIDDEN", "Access denied"));
    }

    /**
     * Zpracování výjimek s nastaveným HTTP statusem.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        log.warn("Response status exception: {}", ex.getMessage());
        return ResponseEntity.status(ex.getStatusCode())
                .body(error(ex.getStatusCode().toString(), ex.getReason() != null ? ex.getReason() : ex.getMessage()));
    }

    /**
     * Zpracování I/O chyb při načítání zdrojů (500).
     */
    @ExceptionHandler(IOException.class)
    public ResponseEntity<Map<String, Object>> handleIO(IOException ex) {
        log.error("I/O error: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error("INTERNAL_SERVER_ERROR", "Failed to read application resource"));
    }

    /**
     * Zpracování neočekávaných výjimek (500).
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleOther(Exception ex) {
        log.error("Unexpected error: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error("INTERNAL_SERVER_ERROR", "Unexpected error"));
    }

    /**
     * Pomocná metoda pro vytvoření strukturované chybové odpovědi.
     */
    public static Map<String, Object> error(String code, String message) {
        return Map.of(
                "timestamp", OffsetDateTime.now().toString(),
                "code", code,
                "message", message
        );
    }

    /**
     * Přetížená pomocná metoda pro vytvoření strukturované chybové odpovědi s detaily.
     */
    public static Map<String, Object> error(String code, String message, String details) {
        return Map.of(
                "timestamp", OffsetDateTime.now().toString(),
                "code", code,
                "message", message,
                "details", details
        );
    }
}
