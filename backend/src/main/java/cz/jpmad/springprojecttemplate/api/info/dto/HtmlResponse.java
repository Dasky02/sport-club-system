package cz.jpmad.springprojecttemplate.api.info.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO pro odpověď s HTML obsahem.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record HtmlResponse(

        @JsonProperty("content")
        String content
) {
}
