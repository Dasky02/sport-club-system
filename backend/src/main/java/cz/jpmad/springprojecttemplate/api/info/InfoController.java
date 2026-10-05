package cz.jpmad.springprojecttemplate.api.info;

import cz.jpmad.springprojecttemplate.api.info.dto.HtmlResponse;
import cz.jpmad.springprojecttemplate.api.info.dto.VersionResponse;
import cz.jpmad.springprojecttemplate.service.info.InfoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/**
 * REST controller pro základní informace o aplikaci – verze, release notes, ToS, privacy policy.
 */
@RestController
@RequestMapping("/info")
@RequiredArgsConstructor
@Tag(name = "Info", description = "Základní informace o aplikaci – verze, release notes, ToS, privacy policy")
public class InfoController {

    private final InfoService info;

    @Operation(summary = "Vrátí verzi aplikace")
    @GetMapping("/version")
    public ResponseEntity<VersionResponse> getVersion() throws IOException {
        return ResponseEntity.status(HttpStatus.OK).body(new VersionResponse(info.getProjectVersion()));
    }

    @Operation(summary = "Vrátí release notes jako HTML")
    @GetMapping("/release-notes")
    public ResponseEntity<HtmlResponse> getReleaseNotes() throws IOException {
        return ResponseEntity.status(HttpStatus.OK).body(new HtmlResponse(info.getReleaseNotes()));
    }

    @Operation(summary = "Vrátí podmínky použití jako HTML")
    @GetMapping("/terms-of-service")
    public ResponseEntity<HtmlResponse> getToS() throws IOException {
        return ResponseEntity.status(HttpStatus.OK).body(new HtmlResponse(info.getTermsOfService()));
    }

    @Operation(summary = "Vrátí zásady ochrany osobních údajů jako HTML")
    @GetMapping("/privacy-policy")
    public ResponseEntity<HtmlResponse> getPrivacyPolicy() throws IOException {
        return ResponseEntity.status(HttpStatus.OK).body(new HtmlResponse(info.getPrivacyPolicy()));
    }
}
