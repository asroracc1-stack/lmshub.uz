package com.lmscrm.backend.mapper;

import com.lmscrm.backend.domain.entity.ChatMessage;
import com.lmscrm.backend.domain.entity.ChatThread;
import com.lmscrm.backend.domain.entity.Notification;
import com.lmscrm.backend.dto.communication.ChatMessageDto;
import com.lmscrm.backend.dto.communication.ChatThreadDto;
import com.lmscrm.backend.dto.communication.NotificationDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CommunicationMapper {

    @Mapping(source = "group.id", target = "groupId")
    ChatThreadDto toChatThreadDto(ChatThread chatThread);

    @Mapping(source = "thread.id", target = "threadId")
    @Mapping(source = "sender.id", target = "senderId")
    @Mapping(source = "sender.email", target = "senderName")
    ChatMessageDto toChatMessageDto(ChatMessage chatMessage);

    @Mapping(source = "user.id", target = "userId")
    NotificationDto toNotificationDto(Notification notification);

    @Mapping(source = "user.id", target = "userId")
    com.lmscrm.backend.dto.communication.ChatParticipantDto toChatParticipantDto(com.lmscrm.backend.domain.entity.ChatParticipant participant);

    default com.lmscrm.backend.dto.admin.UserSummaryDto toUserSummaryDto(com.lmscrm.backend.domain.entity.User user) {
        if (user == null) return null;
        return com.lmscrm.backend.dto.admin.UserSummaryDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .username(user.getUsername())
                .organizationId(user.getOrganizationId())
                .role(user.getRole() != null ? user.getRole().name() : "USER")
                .build();
    }
}
