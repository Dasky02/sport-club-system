package cz.jpmad.springprojecttemplate.api.event;

import cz.jpmad.springprojecttemplate.api.event.EventDtos.*;
import cz.jpmad.springprojecttemplate.model.user.User;
import cz.jpmad.springprojecttemplate.service.event.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class EventController {
    private final EventService service;

    @GetMapping("/events")
    public Page<Event> list(@AuthenticationPrincipal User user,@RequestParam(required=false) UUID teamSeasonId,
                            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
                            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
                            @RequestParam(required=false) Type type,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return service.list(user.getId(),teamSeasonId,from,to,type,page,size);
    }
    @GetMapping("/events/options")
    public Options options(@AuthenticationPrincipal User user) { return service.options(user.getId()); }
    @GetMapping("/events/{id}")
    public EventDetails get(@AuthenticationPrincipal User user,@PathVariable UUID id) { return service.get(user.getId(),id); }
    @PostMapping("/events") @ResponseStatus(HttpStatus.CREATED)
    public EventDetails create(@AuthenticationPrincipal User user,@Valid @RequestBody Create request) { return service.create(user.getId(),request); }
    @DeleteMapping("/events/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void discardDraft(@AuthenticationPrincipal User user,@PathVariable UUID id,@Valid @RequestBody Version request) {
        service.discardDraft(user.getId(),id,request);
    }
    @PatchMapping("/events/{id}")
    public EventDetails edit(@AuthenticationPrincipal User user,@PathVariable UUID id,@Valid @RequestBody Edit request) { return service.edit(user.getId(),id,request); }
    @PostMapping("/events/{id}/publish")
    public EventDetails publish(@AuthenticationPrincipal User user,@PathVariable UUID id,@Valid @RequestBody Version request) { return service.publish(user.getId(),id,request); }
    @PostMapping("/events/{id}/cancel")
    public EventDetails cancel(@AuthenticationPrincipal User user,@PathVariable UUID id,@Valid @RequestBody Version request) { return service.cancel(user.getId(),id,request); }
    @PostMapping("/events/{id}/complete")
    public EventDetails complete(@AuthenticationPrincipal User user,@PathVariable UUID id,@Valid @RequestBody Version request) { return service.complete(user.getId(),id,request); }
    @PutMapping("/events/{id}/participants/{playerId}/availability")
    public Participant availability(@AuthenticationPrincipal User user,@PathVariable UUID id,@PathVariable UUID playerId,@Valid @RequestBody AvailabilityRequest request) {
        return service.availability(user.getId(),id,playerId,request);
    }
    @PutMapping("/events/{id}/nomination")
    public EventDetails nomination(@AuthenticationPrincipal User user,@PathVariable UUID id,@Valid @RequestBody NominationRequest request) { return service.nominate(user.getId(),id,request); }
    @PostMapping("/events/{id}/nomination/publish")
    public EventDetails publishNomination(@AuthenticationPrincipal User user,@PathVariable UUID id,@Valid @RequestBody Version request) { return service.publishNomination(user.getId(),id,request); }
    @PutMapping("/events/{id}/participants/{playerId}/attendance")
    public Participant attendance(@AuthenticationPrincipal User user,@PathVariable UUID id,@PathVariable UUID playerId,@Valid @RequestBody AttendanceRequest request) {
        return service.attendance(user.getId(),id,playerId,request);
    }
    @GetMapping("/events/{id}/eligible-participants")
    public List<EligiblePlayer> eligibleParticipants(@AuthenticationPrincipal User user,@PathVariable UUID id,@RequestParam UUID teamSeasonId) {
        return service.eligibleParticipants(user.getId(),id,teamSeasonId);
    }
    @PostMapping("/events/{id}/participants")
    public EventDetails addParticipant(@AuthenticationPrincipal User user,@PathVariable UUID id,@Valid @RequestBody AddParticipant request) {
        return service.addParticipant(user.getId(),id,request);
    }
    @PostMapping("/events/{id}/participants/{playerId}/withdraw")
    public EventDetails withdraw(@AuthenticationPrincipal User user,@PathVariable UUID id,@PathVariable UUID playerId,@Valid @RequestBody ParticipantChange request) {
        return service.withdrawal(user.getId(),id,playerId,request,false);
    }
    @PostMapping("/events/{id}/participants/{playerId}/restore")
    public EventDetails restore(@AuthenticationPrincipal User user,@PathVariable UUID id,@PathVariable UUID playerId,@Valid @RequestBody ParticipantChange request) {
        return service.withdrawal(user.getId(),id,playerId,request,true);
    }
    @GetMapping("/notifications")
    public Page<Notification> notifications(@AuthenticationPrincipal User user,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return service.notifications(user.getId(),page,size);
    }
    @GetMapping("/notifications/unread-count")
    public UnreadCount unread(@AuthenticationPrincipal User user) { return service.unread(user.getId()); }
    @GetMapping("/notifications/{id}")
    public Notification notification(@AuthenticationPrincipal User user,@PathVariable UUID id) { return service.notification(user.getId(),id); }
    @PostMapping("/notifications/{id}/read") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void read(@AuthenticationPrincipal User user,@PathVariable UUID id) { service.read(user.getId(),id); }
}
