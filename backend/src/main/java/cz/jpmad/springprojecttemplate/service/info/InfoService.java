package cz.jpmad.springprojecttemplate.service.info;

import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Poskytuje informace o aplikaci – verzi, release notes, ToS, privacy policy.
 * Markdown soubory jsou renderovány do HTML a volitelně kešovány.
 */
@Slf4j
@Service
public class InfoService {

    private final Resource versionResource;
    private final Resource releaseNotesResource;
    private final Resource tosResource;
    private final Resource privacyPolicyResource;
    private final long cacheTtlMs;

    private final Parser parser = Parser.builder().build();
    private final HtmlRenderer renderer = HtmlRenderer.builder().build();

    private final ConcurrentMap<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public InfoService(
            @Value("classpath:VERSION") final Resource versionResource,
            @Value("classpath:RELEASE-NOTES.md") final Resource releaseNotesResource,
            @Value("classpath:TERMS_OF_USE.md") final Resource tosResource,
            @Value("classpath:PRIVACY_POLICY.md") final Resource privacyPolicyResource,
            @Value("${info.cacheTtlMs:0}") final long cacheTtlMs
    ) {
        this.versionResource = versionResource;
        this.releaseNotesResource = releaseNotesResource;
        this.tosResource = tosResource;
        this.privacyPolicyResource = privacyPolicyResource;
        this.cacheTtlMs = cacheTtlMs;
    }

    public String getProjectVersion() throws IOException {
        return readResource(versionResource).trim();
    }

    public String getReleaseNotes() throws IOException {
        return getCachedOrRender("releaseNotes", releaseNotesResource);
    }

    public String getTermsOfService() throws IOException {
        return getCachedOrRender("tos", tosResource);
    }

    public String getPrivacyPolicy() throws IOException {
        return getCachedOrRender("privacyPolicy", privacyPolicyResource);
    }

    private String getCachedOrRender(final String key, final Resource resource) throws IOException {
        if (cacheTtlMs <= 0) {
            return renderMarkdown(resource);
        }

        final long now = System.currentTimeMillis();
        final CacheEntry entry = cache.get(key);

        if (entry != null && (now - entry.createdAtMs()) < cacheTtlMs) {
            return entry.html();
        }

        final String html = renderMarkdown(resource);
        cache.put(key, new CacheEntry(html, now));
        log.info("Cached '{}' at {}", key, now);
        return html;
    }

    private String renderMarkdown(final Resource resource) throws IOException {
        final String markdown = readResource(resource);
        return renderer.render(parser.parse(markdown));
    }

    private String readResource(final Resource resource) throws IOException {
        if (resource == null || !resource.exists()) {
            throw new NoSuchElementException("Resource not found on classpath");
        }
        try (var in = resource.getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("Failed to read resource: {}", resource.getFilename(), e);
            throw new UncheckedIOException("Failed to read resource: " + resource.getFilename(), e);
        }
    }

    private record CacheEntry(String html, long createdAtMs) {
    }
}
