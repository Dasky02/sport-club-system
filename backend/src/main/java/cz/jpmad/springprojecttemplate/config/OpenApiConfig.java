package cz.jpmad.springprojecttemplate.config;

import cz.jpmad.springprojecttemplate.service.info.InfoService;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.OpenAPI;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

/**
 * Konfigurace OpenAPI pro dokumentaci API
 */
@Configuration
@RequiredArgsConstructor
public class OpenApiConfig {

    private final InfoService infoService;

    @Bean
    public OpenAPI openAPI() throws IOException {
        return new OpenAPI().info(new Info()
                .title("Sport Club System API")
                .version(infoService.getProjectVersion())
                .description("Technický základ systému pro správu sportovního klubu"));
    }
}