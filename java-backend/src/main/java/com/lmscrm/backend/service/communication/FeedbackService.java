package com.lmscrm.backend.service.communication;

import com.lmscrm.backend.domain.entity.Feedback;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.FeedbackStatus;
import com.lmscrm.backend.dto.communication.FeedbackDto;
import com.lmscrm.backend.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;

    @Transactional
    public FeedbackDto createFeedback(String subject, String message, User user) {
        Feedback feedback = Feedback.builder()
                .user(user)
                .subject(subject)
                .message(message)
                .status(FeedbackStatus.PENDING)
                .build();
        
        return mapToDto(feedbackRepository.save(feedback));
    }

    public List<FeedbackDto> getMyFeedbacks(UUID userId) {
        return feedbackRepository.findAllByUserId(userId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public List<FeedbackDto> getAllFeedbacks(FeedbackStatus status) {
        List<Feedback> feedbacks = (status == null) 
                ? feedbackRepository.findAll() 
                : feedbackRepository.findAllByStatus(status);
        
        return feedbacks.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public FeedbackDto updateFeedbackStatus(UUID id, FeedbackStatus status, String comment) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Feedback not found"));
        
        feedback.setStatus(status);
        feedback.setSupportComment(comment);
        
        return mapToDto(feedbackRepository.save(feedback));
    }

    private FeedbackDto mapToDto(Feedback feedback) {
        FeedbackDto dto = new FeedbackDto();
        dto.setId(feedback.getId());
        dto.setUserId(feedback.getUser().getId());
        dto.setUserEmail(feedback.getUser().getEmail());
        dto.setSubject(feedback.getSubject());
        dto.setMessage(feedback.getMessage());
        dto.setStatus(feedback.getStatus());
        dto.setSupportComment(feedback.getSupportComment());
        dto.setCreatedAt(feedback.getCreatedAt());
        dto.setUpdatedAt(feedback.getUpdatedAt());
        return dto;
    }
}
