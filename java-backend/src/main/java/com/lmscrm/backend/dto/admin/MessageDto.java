package com.lmscrm.backend.dto.admin;

import com.lmscrm.backend.domain.enums.MessageType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageDto {
    private UUID id;
    private UserSummaryDto sender;
    private UserSummaryDto receiver;
    private String subject;
    private String content;
    private Boolean isRead;
    private MessageType type;
    private LocalDateTime sentAt;
}
