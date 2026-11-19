package cz.jpmad.springprojecttemplate.api.event;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class EventDtos {
    private EventDtos() {}

    public enum Type { TRAINING, MATCH, OTHER }
    public enum Status { DRAFT, PUBLISHED, CANCELLED, COMPLETED }
    public enum Availability { UNKNOWN, AVAILABLE, UNAVAILABLE }
    public enum Nomination { NOT_SELECTED, SELECTED, RESERVE }
    public enum Attendance { PRESENT, ABSENT, EXCUSED, LATE }
    public enum NotificationType { EVENT_CREATED, EVENT_CHANGED, EVENT_CANCELLED, NOMINATION_PUBLISHED, NOMINATION_CHANGED }

    public record Schedule(@NotBlank @Size(max=160) String title, @Size(max=4000) String description,
                           @NotNull OffsetDateTime startsAt, @NotNull OffsetDateTime endsAt,
                           @Size(max=200) String location, OffsetDateTime availabilityDeadline) {}
    public record MatchInput(UUID competitionSeasonId, @NotNull UUID matchFormatId,
                             @NotNull UUID homeTeamSeasonId, @NotNull UUID awayTeamSeasonId) {}
    public record Create(@NotNull UUID seasonId, @NotNull Type type, @NotNull @Valid Schedule schedule,
                         @NotNull @Size(max=100) List<@NotNull UUID> teamSeasonIds, @Valid MatchInput match) {}
    public record Edit(@NotBlank String version, @NotNull @Valid Schedule schedule) {}
    public record Version(@NotBlank String version) {}
    public record AvailabilityRequest(@NotBlank String version, @NotNull Availability availability,
                                      @Size(max=500) String availabilityComment, @Size(max=500) String reason) {}
    public record NominationEntry(@NotNull UUID playerId, @NotBlank String version, @NotNull Nomination nomination) {}
    public record NominationRequest(@NotBlank String version, @NotEmpty @Size(max=500) List<@NotNull @Valid NominationEntry> entries) {}
    public record AttendanceRequest(@NotBlank String version, @NotNull Attendance attendance,
                                    @Size(max=500) String attendanceComment, Boolean played, @Size(max=500) String reason) {}
    public record ParticipantChange(@NotBlank String version, @NotBlank @Size(max=500) String reason) {}
    public record AddParticipant(@NotBlank String version, @NotNull UUID playerId, @NotNull UUID teamSeasonId) {}

    public record Event(UUID id, UUID seasonId, Type type, Status status, Schedule schedule,
                        String version, OffsetDateTime nominationPublishedAt, boolean canManage) {}
    public record Team(UUID id, UUID seasonId, UUID sportId, String name, boolean clubTeam) {}
    public record Season(UUID id, String name, LocalDate startsOn, LocalDate endsOn, boolean archived) {}
    public record Format(UUID id, UUID sportId, String name) {}
    public record CompetitionOption(UUID id, UUID matchFormatId, String name, List<UUID> teamSeasonIds) {}
    public record Options(List<Season> seasons, List<Team> teams, List<Format> formats, List<CompetitionOption> competitions) {}
    public record Participant(UUID playerId, UUID teamSeasonId, String name, String version,
                              Availability availability, String availabilityComment,
                              Nomination nomination, Nomination publishedNomination,
                              Attendance attendance, String attendanceComment, Boolean played,
                              boolean withdrawn, boolean canAnswer, boolean canManage) {}
    public record MatchDetails(UUID competitionSeasonId, UUID matchFormatId, UUID homeTeamSeasonId, UUID awayTeamSeasonId,
                               String homeTeamName, String awayTeamName, String competitionName, String formatName) {}
    public record EligiblePlayer(UUID id, String name) {}
    public record EventDetails(Event event, List<Team> teams, MatchDetails match, List<Participant> participants) {}
    public record Page<T>(List<T> items, int page, int size, String totalElements, long totalPages) {
        public Page(List<T> items,int page,int size,long total) {
            this(items,page,size,Long.toString(total),(total+size-1)/size);
        }
    }
    public record Notification(UUID id, NotificationType type, UUID eventId, String title, String body,
                               OffsetDateTime deliveredAt, OffsetDateTime readAt) {}
    public record UnreadCount(long count) {}
}
