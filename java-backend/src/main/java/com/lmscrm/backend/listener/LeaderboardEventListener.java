package com.lmscrm.backend.listener;

import com.lmscrm.backend.event.ExamSubmittedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class LeaderboardEventListener {

    @EventListener
    @Async
    public void onExamSubmitted(ExamSubmittedEvent event) {
        log.info("Leaderboard update triggered asynchronously for user: {}", event.getStudent().getEmail());
        // Since leaderboards are query-based on user XP, we simply log the update.
    }
}
