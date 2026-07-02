package com.lmscrm.backend.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiRecognitionResultListener {

    private final AttendanceEngineService engineService;
    private final ObjectMapper objectMapper;

    /**
     * Consumes AI Face Recognition results from RabbitMQ pipeline.
     */
    @RabbitListener(queues = "attendance.engine.queue")
    public void receiveRecognitionResult(String jsonPayload) {
        try {
            log.info("Received AI Recognition message: {}", jsonPayload);
            
            RecognitionResultMessage message = objectMapper.readValue(jsonPayload, RecognitionResultMessage.class);
            
            if (message.getLessonId() == null) {
                log.warn("Invalid recognition result payload (missing lessonId)");
                return;
            }

            engineService.processRecognitionResult(
                    message.getLessonId(),
                    message.getPresentStudentIds(),
                    message.getConfidences()
            );

        } catch (Exception e) {
            log.error("Failed to parse and process AI Recognition message", e);
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecognitionResultMessage {
        private UUID lessonId;
        private List<UUID> presentStudentIds;
        private List<Double> confidences;
    }
}
