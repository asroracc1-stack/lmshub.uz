package com.lmscrm.backend.service.communication;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.domain.enums.NotificationType;
import com.lmscrm.backend.dto.communication.BroadcastMessageRequest;
import com.lmscrm.backend.dto.communication.ChatMessageDto;
import com.lmscrm.backend.dto.communication.ChatThreadDto;
import com.lmscrm.backend.exception.BusinessException;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.mapper.CommunicationMapper;
import com.lmscrm.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatThreadRepository threadRepository;
    private final ChatMessageRepository messageRepository;
    private final ChatParticipantRepository participantRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final CommunicationMapper mapper;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<ChatThreadDto> getMyThreads(UUID userId) {
        return threadRepository.findThreadsByUserId(userId).stream()
                .map(mapper::toChatThreadDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getThreadMessages(UUID threadId, UUID userId) {
        if (!participantRepository.existsByThreadIdAndUserId(threadId, userId)) {
            throw new BusinessException("You are not a participant in this chat thread");
        }
        return messageRepository.findByThreadIdOrderByCreatedAtAsc(threadId).stream()
                .map(mapper::toChatMessageDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ChatMessageDto sendMessage(UUID threadId, ChatMessageDto request, User sender) {
        ChatThread thread = threadRepository.findById(threadId)
                .orElseThrow(() -> new ResourceNotFoundException("Thread not found"));

        if (!participantRepository.existsByThreadIdAndUserId(threadId, sender.getId())) {
            throw new BusinessException("You are not a participant in this chat thread");
        }

        ChatMessage message = ChatMessage.builder()
                .thread(thread)
                .sender(sender)
                .body(request.getBody())
                .attachmentUrl(request.getAttachmentUrl())
                .build();

        message = messageRepository.save(message);

        // Update sender's last read
        participantRepository.findByThreadIdAndUserId(threadId, sender.getId())
                .ifPresent(p -> {
                    p.setLastReadAt(LocalDateTime.now());
                    participantRepository.save(p);
                });

        // Offline Notification Logic
        // Find other participants who might be offline and send them a notification
        List<ChatParticipant> participants = participantRepository.findByThreadId(threadId);
        ChatMessageDto responseDto = mapper.toChatMessageDto(message);
        
        for (ChatParticipant participant : participants) {
            // Broadcast via WebSocket
            messagingTemplate.convertAndSendToUser(
                    participant.getUser().getEmail(),
                    "/queue/messages",
                    responseDto
            );
            
            if (!participant.getUser().getId().equals(sender.getId())) {
                String msgBody = request.getBody() != null ? request.getBody() : "Attachment";
                notificationService.createNotification(
                        participant.getUser(),
                        "New message in " + (thread.getTitle() != null ? thread.getTitle() : "Chat"),
                        sender.getEmail() + ": " + (msgBody.length() > 50 ? msgBody.substring(0, 50) + "..." : msgBody),
                        NotificationType.NEW_MESSAGE
                );
            }
        }

        return responseDto;
    }

    @Transactional
    public void sendBroadcastMessage(BroadcastMessageRequest request, User sender) {
        // Find group members
        List<GroupMember> members = groupMemberRepository.findByGroupId(request.getGroupId());

        // Create notification for every member
        for (GroupMember member : members) {
            notificationService.createNotification(
                    member.getStudent(),
                    "Broadcast from Teacher",
                    request.getMessage(),
                    NotificationType.INFO
            );
        }
    }

    @Transactional(readOnly = true)
    public List<com.lmscrm.backend.dto.admin.UserSummaryDto> getEligibleUsers(User currentUser) {
        List<User> allUsers = userRepository.findAll();
        
        return allUsers.stream()
                .filter(u -> !u.getId().equals(currentUser.getId()))
                .filter(u -> canUserMessage(currentUser, u))
                .map(u -> com.lmscrm.backend.dto.admin.UserSummaryDto.builder()
                        .id(u.getId())
                        .fullName(u.getFullName())
                        .email(u.getEmail())
                        .build())
                .collect(Collectors.toList());
    }

    private boolean canUserMessage(User sender, User target) {
        if (sender.getRole() == com.lmscrm.backend.domain.enums.AppRole.SUPER_ADMIN) return true;
        
        // Pack Manager can message everyone
        if (sender.getRole() == com.lmscrm.backend.domain.enums.AppRole.PACK_MANAGER) {
            return true;
        }
        
        // Everyone else can ONLY message Super Admin and Pack Manager
        if (target.getRole() == com.lmscrm.backend.domain.enums.AppRole.SUPER_ADMIN || target.getRole() == com.lmscrm.backend.domain.enums.AppRole.PACK_MANAGER) {
            return true;
        }

        return false;
    }

    @Transactional
    public ChatThreadDto createOrGetDirectThread(User currentUser, UUID targetUserId) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new BusinessException("Target user not found"));
                
        if (!canUserMessage(currentUser, targetUser)) {
            throw new BusinessException("RBAC rules prevent messaging this user");
        }
        
        // Find if direct thread already exists
        return threadRepository.findDirectThread(currentUser.getId(), targetUserId)
                .map(mapper::toChatThreadDto)
                .orElseGet(() -> {
                    ChatThread newThread = ChatThread.builder()
                            .isGroup(false)
                            .organization(currentUser.getOrganizationId() != null ? Organization.builder().id(currentUser.getOrganizationId()).build() : null)
                            .createdBy(currentUser)
                            .build();
                    
                    newThread = threadRepository.save(newThread);
                    
                    ChatParticipant p1 = ChatParticipant.builder()
                            .thread(newThread)
                            .user(currentUser)
                            .joinedAt(LocalDateTime.now())
                            .build();
                            
                    ChatParticipant p2 = ChatParticipant.builder()
                            .thread(newThread)
                            .user(targetUser)
                            .joinedAt(LocalDateTime.now())
                            .build();
                            
                    participantRepository.save(p1);
                    participantRepository.save(p2);
                    
                    return mapper.toChatThreadDto(newThread);
                });
    }
}
