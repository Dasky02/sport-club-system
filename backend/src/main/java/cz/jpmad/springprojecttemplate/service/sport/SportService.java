package cz.jpmad.springprojecttemplate.service.sport;

import cz.jpmad.springprojecttemplate.api.ApiException;
import cz.jpmad.springprojecttemplate.api.sport.dto.*;
import cz.jpmad.springprojecttemplate.model.sport.Sport;
import cz.jpmad.springprojecttemplate.repository.*;
import cz.jpmad.springprojecttemplate.service.user.CurrentAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SportService {
    private final ClubRepository clubs;
    private final CurrentAccountService accounts;
    private final SportRepository sports;
    private final AuditRepository audit;
    @Transactional
    public SportPageResponse list(UUID actorId, int page, int size) {
        clubs.lockForRead();
        accounts.requireAdmin(actorId);
        if (page < 0) throw ApiException.invalidField("page", "Stránka nesmí být záporná.");
        if (size < 1 || size > 100) throw ApiException.invalidField("size", "Velikost stránky musí být 1–100.");
        var result = sports.findAll(PageRequest.of(page, size, Sort.by("code").ascending().and(Sort.by("id"))));
        return new SportPageResponse(result.getContent().stream().map(SportResponse::from).toList(), page, size,
                Long.toString(result.getTotalElements()), result.getTotalPages());
    }
    @Transactional
    public SportResponse create(UUID actorId, SportRequest request) {
        clubs.lockForWrite();
        accounts.requireAdmin(actorId);
        if (sports.existsByCode(request.code())) throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_RESOURCE", "Sport s tímto kódem už existuje.");
        var sport = new Sport();
        sport.setCode(request.code());
        sport.setName(request.name().strip());
        sports.saveAndFlush(sport);
        audit.record(actorId, "SPORT_CREATED", "sports", sport.getId());
        return SportResponse.from(sport);
    }
    @Transactional
    public SportResponse update(UUID actorId, UUID sportId, SportUpdateRequest request) {
        clubs.lockForWrite();
        accounts.requireAdmin(actorId);
        var sport = sports.findById(sportId).orElseThrow(() -> new java.util.NoSuchElementException("Sport nebyl nalezen."));
        if (request.name() != null) {
            if (request.name().isBlank()) throw ApiException.invalidField("name", "Vyplňte název sportu.");
            sport.setName(request.name().strip());
        }
        if (request.active() != null) sport.setActive(request.active());
        audit.record(actorId, "SPORT_UPDATED", "sports", sportId);
        return SportResponse.from(sport);
    }
}
