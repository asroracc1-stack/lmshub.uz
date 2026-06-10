package com.lmscrm.backend.service.chat;

import com.lmscrm.backend.domain.entity.Conversation;
import com.lmscrm.backend.domain.entity.ConversationParticipant;
import com.lmscrm.backend.domain.entity.Message;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.domain.enums.MessageType;
import com.lmscrm.backend.dto.chat.*;
import com.lmscrm.backend.repository.ConversationParticipantRepository;
import com.lmscrm.backend.repository.ConversationRepository;
import com.lmscrm.backend.repository.MessageRepository;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ConversationDto> getUserConversations(UUID userId) {
        return conversationRepository.findConversationsByUserId(userId).stream()
                .map(this::mapToConversationDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getConversationMessages(UUID userId, UUID conversationId) {
        if (!participantRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw new RuntimeException("Access Denied");
        }
        
        List<Message> messages = messageRepository.findByConversationIdOrderBySentAtAsc(conversationId);
        return messages.stream().map(this::mapToMessageDto).collect(Collectors.toList());
    }

    @Transactional
    public ConversationDto createOrGetDirectConversation(UUID senderId, CreateConversationRequest request) {
        if (!canUserMessage(senderId, request.getTargetUserId())) {
            throw new RuntimeException("Access Denied: RBAC rules prevent messaging this user");
        }

        return conversationRepository.findDirectConversation(senderId, request.getTargetUserId())
                .map(this::mapToConversationDto)
                .orElseGet(() -> {
                    User sender = userRepository.findById(senderId).orElseThrow();
                    User target = userRepository.findById(request.getTargetUserId()).orElseThrow();

                    Conversation conversation = Conversation.builder()
                            .title(request.getTitle())
                            .isGroup(false)
                            .organization(sender.getOrganization())
                            .build();

                    ConversationParticipant p1 = ConversationParticipant.builder()
                            .conversation(conversation)
                            .user(sender)
                            .build();

                    ConversationParticipant p2 = ConversationParticipant.builder()
                            .conversation(conversation)
                            .user(target)
                            .build();

                    conversation.getParticipants().add(p1);
                    conversation.getParticipants().add(p2);

                    return mapToConversationDto(conversationRepository.save(conversation));
                });
    }

    @Transactional(readOnly = true)
    public List<ChatUserDto> getEligibleUsers(UUID userId) {
        User sender = userRepository.findById(userId).orElseThrow();
        List<User> allUsers = userRepository.findAll();
        
        return allUsers.stream()
                .filter(u -> !u.getId().equals(userId))
                .filter(u -> canUserMessage(sender, u))
                .map(this::mapToChatUserDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ChatMessageDto saveMessage(UUID senderId, SendMessageRequest request) {
        if (!participantRepository.existsByConversationIdAndUserId(request.getConversationId(), senderId)) {
            throw new RuntimeException("Access Denied: Not a participant");
        }

        User sender = userRepository.findById(senderId).orElseThrow();
        Conversation conversation = conversationRepository.findById(request.getConversationId()).orElseThrow();

        Message message = Message.builder()
                .sender(sender)
                .conversation(conversation)
                .subject("Chat Message")
                .content(request.getBody() != null ? request.getBody() : "")
                .attachmentUrl(request.getAttachmentUrl())
                .type(MessageType.DIRECT)
                .build();

        return mapToMessageDto(messageRepository.save(message));
    }

    private boolean canUserMessage(UUID senderId, UUID targetId) {
        User sender = userRepository.findById(senderId).orElseThrow();
        User target = userRepository.findById(targetId).orElseThrow();
        return canUserMessage(sender, target);
    }

    private boolean canUserMessage(User sender, User target) {
        if (sender.getRole() == AppRole.SUPER_ADMIN) return true;
        
        // Pack Manager can message everyone
        if (sender.getRole() == AppRole.PACK_MANAGER) {
            return true;
        }
        
        // Everyone else can ONLY message Super Admin and Pack Manager
        if (target.getRole() == AppRole.SUPER_ADMIN || target.getRole() == AppRole.PACK_MANAGER) {
            return true;
        }

        return false;
    }

    private ConversationDto mapToConversationDto(Conversation conversation) {
        List<ChatMessageDto> lastMessages = messageRepository.findByConversationIdOrderBySentAtDesc(conversation.getId());
        ChatMessageDto lastMessage = lastMessages.isEmpty() ? null : mapToMessageDto(lastMessages.get(0));

        return ConversationDto.builder()
                .id(conversation.getId())
                .title(conversation.getTitle())
                .isGroup(conversation.getIsGroup())
                .organizationId(conversation.getOrganization() != null ? conversation.getOrganization().getId() : null)
                .createdAt(conversation.getCreatedAt())
                .participants(conversation.getParticipants().stream().map(this::mapToParticipantDto).collect(Collectors.toList()))
                .messages(lastMessage != null ? List.of(lastMessage) : List.of())
                .build();
    }

    private ConversationParticipantDto mapToParticipantDto(ConversationParticipant participant) {
        return ConversationParticipantDto.builder()
                .id(participant.getId())
                .userId(participant.getUser().getId())
                .user(mapToChatUserDto(participant.getUser()))
                .joinedAt(participant.getJoinedAt())
                .build();
    }

    private ChatUserDto mapToChatUserDto(User user) {
        return ChatUserDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .organizationId(user.getOrganization() != null ? user.getOrganization().getId() : null)
                .groupId(user.getGroup() != null ? user.getGroup().getId() : null)
                .build();
    }

    private ChatMessageDto mapToMessageDto(Message message) {
        return ChatMessageDto.builder()
                .id(message.getId())
                .body(message.getContent())
                .attachmentUrl(message.getAttachmentUrl())
                .senderId(message.getSender().getId())
                .sender(mapToChatUserDto(message.getSender()))
                .conversationId(message.getConversation().getId())
                .createdAt(message.getSentAt())
                .build();
    }
}
