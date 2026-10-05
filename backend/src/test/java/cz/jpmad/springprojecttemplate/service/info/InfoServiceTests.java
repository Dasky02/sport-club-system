package cz.jpmad.springprojecttemplate.service.info;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class InfoServiceTests {
    @Test
    void readsTrimmedVersionAndRendersMarkdownWithConfiguredCache() throws Exception {
        var version = new ByteArrayResource("0.1.0\n".getBytes(StandardCharsets.UTF_8));
        var markdown = new ByteArrayResource("# Klub\n".getBytes(StandardCharsets.UTF_8));
        var service = new InfoService(version, markdown, markdown, markdown, 600000);
        assertThat(service.getProjectVersion()).isEqualTo("0.1.0");
        assertThat(service.getReleaseNotes()).contains("<h1>Klub</h1>");
        assertThat(service.getReleaseNotes()).isEqualTo(service.getTermsOfService());
    }
}
