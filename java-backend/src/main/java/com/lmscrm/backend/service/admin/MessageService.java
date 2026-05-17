package com.lmscrm.backend.service.admin;

import com.lmscrm.backend.domain.entity.Message;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.admin.MessageDto;
import com.lmscrm.backend.dto.admin.MessageRequestDto;
import com.lmscrm.backend.dto.admin.UserSummaryDto;
import com.lmscrm.backend.repository.MessageRepository;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public List<MessageDto> getMessagesForUser(UUID userId) {
        return messageRepository.findMessagesForUser(userId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public Map<String, Long> getMessageStats(UUID userId) {
        return Map.of(
                "total", messageRepository.countMessagesForUser(userId),
                "sent", messageRepository.countSentMessagesByUser(userId),
                "broadcast", messageRepository.countBroadcastMessages()
        );
    }

    @Transactional
    public MessageDto sendMessage(UUID senderId, MessageRequestDto request) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        
        User receiver = null;
        if (request.getReceiverId() != null) {
            receiver = userRepository.findById(request.getReceiverId())
                    .orElseThrow(() -> new RuntimeException("Receiver not found"));
        }

        Message message = Message.builder()
                .sender(sender)
                .receiver(receiver)
                .subject(request.getSubject())
                .content(request.getContent())
                .type(request.getType())
                .isRead(false)
                .build();

        return mapToDto(messageRepository.save(message));
    }

    @Transactional
    public MessageDto markAsRead(UUID messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        message.setIsRead(true);
        return mapToDto(messageRepository.save(message));
    }

    @Transactional
    public void deleteMessage(UUID messageId) {
        messageRepository.deleteById(messageId);
    }

    private MessageDto mapToDto(Message message) {
        UserSummaryDto senderDto = null;
        if (message.getSender() != null) {
            senderDto = UserSummaryDto.builder()
                    .id(message.getSender().getId())
                    .fullName(message.getSender().getFullName())
                    .email(message.getSender().getEmail())
                    .build();
        }

        UserSummaryDto receiverDto = null;
        if (message.getReceiver() != null) {
            receiverDto = UserSummaryDto.builder()
                    .id(message.getReceiver().getId())
                    .fullName(message.getReceiver().getFullName())
                    .email(message.getReceiver().getEmail())
                    .build();
        }

        return MessageDto.builder()
                .id(message.getId())
                .sender(senderDto)
                .receiver(receiverDto)
                .subject(message.getSubject())
                .content(message.getContent())
                .isRead(message.getIsRead())
                .type(message.getType())
                .sentAt(message.getSentAt())
                .build();
    }
}
