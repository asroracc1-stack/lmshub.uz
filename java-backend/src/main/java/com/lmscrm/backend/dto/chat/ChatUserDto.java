package com.lmscrm.backend.dto.chat;

import com.lmscrm.backend.domain.enums.AppRole;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ChatUserDto {
    private UUID id;
    private String fullName;
    private String email;
    private AppRole role;
    private UUID organizationId;
    private UUID groupId;
}
