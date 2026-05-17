package com.lmscrm.backend.dto.admin;

import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSummaryDto {
    private UUID id;
    private String fullName;
    private String email;
    private String username;
    private UUID organizationId;
}
