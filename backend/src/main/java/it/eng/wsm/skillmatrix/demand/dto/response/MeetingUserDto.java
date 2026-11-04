package it.eng.wsm.skillmatrix.demand.dto.response;

import java.util.UUID;

/** A system user that can be added to a meeting (N-01). Mirrors the frontend {@code MeetingUser}. */
public record MeetingUserDto(UUID id, String name, String roleLabel) {
}

