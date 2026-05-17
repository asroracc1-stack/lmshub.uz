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
    private final NotificationService notificationService;
    private final CommunicationMapper mapper;

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
    public ChatMessageDto sendMessage(UUID threadId, String body, User sender) {
        ChatThread thread = threadRepository.findById(threadId)
                .orElseThrow(() -> new ResourceNotFoundException("Thread not found"));

        if (!participantRepository.existsByThreadIdAndUserId(threadId, sender.getId())) {
            throw new BusinessException("You are not a participant in this chat thread");
        }

        ChatMessage message = ChatMessage.builder()
                .thread(thread)
                .sender(sender)
                .body(body)
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
        for (ChatParticipant participant : participants) {
            if (!participant.getUser().getId().equals(sender.getId())) {
                // In a real app with WebSockets, we'd check if they are actively connected
                // If not connected, send DB Notification
                notificationService.createNotification(
                        participant.getUser(),
                        "New message in " + (thread.getTitle() != null ? thread.getTitle() : "Chat"),
                        sender.getEmail() + ": " + (body.length() > 50 ? body.substring(0, 50) + "..." : body),
                        NotificationType.NEW_MESSAGE
                );
            }
        }

        return mapper.toChatMessageDto(message);
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
}
