package cz.jpmad.springprojecttemplate.config;

import cz.jpmad.springprojecttemplate.api.GlobalExceptionHandler;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.DefaultCorsProcessor;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;

import java.util.Arrays;
import java.util.List;

@Configuration
public class WebConfig {

    @Bean
    CorsFilter corsFilter(@Qualifier("corsConfigurationSource") CorsConfigurationSource source, JsonMapper mapper) {
        var filter = new CorsFilter(source);
        filter.setCorsProcessor(new DefaultCorsProcessor() {
            @Override
            protected void rejectRequest(ServerHttpResponse response) throws IOException {
                response.setStatusCode(HttpStatus.FORBIDDEN);
                response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
                mapper.writeValue(response.getBody(), GlobalExceptionHandler.error("FORBIDDEN", "CORS request denied"));
                response.flush();
            }
        });
        return filter;
    }

    @Bean
    FilterRegistrationBean<CorsFilter> corsFilterRegistration(CorsFilter corsFilter) {
        // Pouze Spring Security chain: automatická servlet registrace by filtr spouštěla dvakrát.
        var registration = new FilterRegistrationBean<>(corsFilter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") String origins) {
        var config = new CorsConfiguration();
        var allowedOrigins = Arrays.stream(origins.split(",")).map(String::trim)
                .filter(origin -> !origin.isEmpty()).toList();
        if (allowedOrigins.contains("*")) {
            throw new IllegalArgumentException("CORS origins must be explicit when credentials are enabled");
        }
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Accept", "X-CSRF-TOKEN"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource();
        // CORS resolves servlet-relative paths: /api is already the context path.
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
