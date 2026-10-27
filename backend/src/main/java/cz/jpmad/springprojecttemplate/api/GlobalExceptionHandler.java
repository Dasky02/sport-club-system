package cz.jpmad.springprojecttemplate.api;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/** Chyby obsahují pouze serverem definované zprávy, nikdy vstup ani SQL diagnostiku. */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApi(ApiException ex) {
        return ResponseEntity.status(ex.status()).body(withFields(ex.code(), ex.getMessage(), ex.fieldErrors()));
    }
    @ExceptionHandler(BindException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(BindException ex) {
        var fields = ex.getBindingResult().getFieldErrors().stream().map(this::safeField).toList();
        return ResponseEntity.badRequest().body(withFields("VALIDATION_ERROR", "Validation failed for one or more fields", fields));
    }
    private FieldErrorResponse safeField(FieldError field) {
        String name = field.getField();
        if (name.equals("passwordWithinBcryptLimit")) name = "password";
        if (name.equals("changePresent")) name = "name";
        if (name.equals("exactlyOneIdentity")) name = "personId";
        String code = field.getCode() == null ? "Invalid" : field.getCode();
        String message = switch (code) {
            case "NotNull", "NotBlank" -> "This field is required";
            case "Size" -> "Length is outside the allowed range";
            case "Email" -> "Invalid email address";
            case "Pattern" -> "Invalid format";
            default -> "Invalid value";
        };
        return new FieldErrorResponse(name, code, message);
    }
    @ExceptionHandler({HttpMessageNotReadableException.class, IllegalArgumentException.class})
    public ResponseEntity<Map<String, Object>> handleBadRequest(Exception ex) {
        return ResponseEntity.badRequest().body(error("BAD_REQUEST", "Invalid request body or value"));
    }
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.badRequest().body(withFields("VALIDATION_ERROR", "Invalid request parameter",
                List.of(new FieldErrorResponse(ex.getName(), "TYPE", "Invalid value"))));
    }
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error("CONFLICT", "Operation conflicts with current state"));
    }
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Resource not found"));
    }
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleMissingRoute(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", "Resource not found"));
    }
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleUnsupportedMethod(HttpRequestMethodNotSupportedException ex) {
        var response = ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED);
        if (ex.getSupportedHttpMethods() != null) {
            response.allow(ex.getSupportedHttpMethods().toArray(org.springframework.http.HttpMethod[]::new));
        }
        return response.body(error("METHOD_NOT_ALLOWED", "HTTP method is not supported"));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error("CONFLICT", "Operation conflicts with existing data"));
    }
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED", "Authentication required"));
    }
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("FORBIDDEN", "Access denied"));
    }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(error(ex.getStatusCode().toString(), "Request could not be completed"));
    }
    @ExceptionHandler(IOException.class)
    public ResponseEntity<Map<String, Object>> handleIO(IOException ex) {
        log.error("Application resource I/O failure ({})", ex.getClass().getSimpleName());
        return ResponseEntity.internalServerError().body(error("INTERNAL_SERVER_ERROR", "Failed to read application resource"));
    }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleOther(Exception ex) {
        log.error("Unexpected request failure ({})", ex.getClass().getSimpleName());
        return ResponseEntity.internalServerError().body(error("INTERNAL_SERVER_ERROR", "Unexpected error"));
    }
    private static Map<String, Object> withFields(String code, String message, List<FieldErrorResponse> fields) {
        Map<String, Object> result = new LinkedHashMap<>(error(code, message));
        if (!fields.isEmpty()) {
            result.put("details", "Validation failed for one or more fields");
            result.put("fieldErrors", fields);
        }
        return result;
    }
    public static Map<String, Object> error(String code, String message) {
        return Map.of("timestamp", OffsetDateTime.now().toString(), "code", code, "message", message);
    }
    public static Map<String, Object> error(String code, String message, String details) {
        Map<String, Object> result = new LinkedHashMap<>(error(code, message)); result.put("details", details); return result;
    }
}
