package cz.jpmad.springprojecttemplate.api.auth.dto;

/** Token po přihlášení/odhlášení znovu načtěte; v aplikaci se neukládá do localStorage. */
public record CsrfResponse(String token, String headerName, String parameterName) {
}
