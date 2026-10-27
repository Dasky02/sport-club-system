package cz.jpmad.springprojecttemplate.api.sport.dto;
import java.util.List;
public record SportPageResponse(List<SportResponse> items, int page, int size, String totalElements, int totalPages) { }
