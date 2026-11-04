package it.eng.wsm.skillmatrix.workforce.dto.response;

import java.time.Instant;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AllocationCommentResponseDto {

    private UUID id;
    private UUID allocationId;
    private UUID authorId;
    private String authorName;
    private String commentText;
    private Instant createdAt;
}
