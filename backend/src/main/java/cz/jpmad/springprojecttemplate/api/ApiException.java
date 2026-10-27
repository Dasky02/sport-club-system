package cz.jpmad.springprojecttemplate.api;

import org.springframework.http.HttpStatus;
import java.util.List;

/** Pouze bezpečné, serverem definované zprávy bez hodnot vstupu. */
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    private final List<FieldErrorResponse> fieldErrors;
    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, List.of());
    }
    public ApiException(HttpStatus status, String code, String message, List<FieldErrorResponse> fieldErrors) {
        super(message);
        this.status = status;
        this.code = code;
        this.fieldErrors = List.copyOf(fieldErrors);
    }
    public HttpStatus status() { return status; }
    public String code() { return code; }
    public List<FieldErrorResponse> fieldErrors() { return fieldErrors; }
    public static ApiException invalidField(String field, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Zkontrolujte vyplněné údaje.",
                List.of(new FieldErrorResponse(field, "INVALID_VALUE", message)));
    }
}
