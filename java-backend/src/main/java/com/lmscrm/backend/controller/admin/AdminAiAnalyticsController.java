package com.lmscrm.backend.controller.admin;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.*;

@RestController
@RequestMapping("/api/v1/admin/ai-analytics")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminAiAnalyticsController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAiAnalytics() {
        Map<String, Object> data = new HashMap<>();

        // 1. Cost breakdown by Provider
        Map<String, Double> costByProvider = new HashMap<>();
        costByProvider.put("OpenAI", 145.50);
        costByProvider.put("Gemini", 42.10);
        costByProvider.put("Claude", 88.35);
        data.put("costByProvider", costByProvider);

        // 2. Top AI Users
        List<Map<String, Object>> topUsers = new ArrayList<>();
        topUsers.add(createTopUser("Asror Vali", 152, 12.40, "Speaking"));
        topUsers.add(createTopUser("Dilshod Tursun", 98, 8.10, "Chat"));
        topUsers.add(createTopUser("Zilola Umar", 87, 7.50, "Tutor"));
        topUsers.add(createTopUser("Bobur Karimov", 65, 5.20, "Writing"));
        data.put("topUsers", topUsers);

        // 3. Overall Statistics
        data.put("totalRequests", 14850);
        data.put("monthlyRevenue", 18500000); // 18.5M UZS
        data.put("conversionRate", 8.6); // 8.6%
        data.put("upgradeCount", 48);
        data.put("mostPopularFeature", "AI Speaking IELTS Coach");

        // 4. Heatmap Data (Requests by Hour/Day)
        List<Map<String, Object>> heatmap = new ArrayList<>();
        String[] days = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
        Random random = new Random();
        for (String day : days) {
            Map<String, Object> dayData = new HashMap<>();
            dayData.put("day", day);
            dayData.put("morning", 100 + random.nextInt(150));
            dayData.put("afternoon", 250 + random.nextInt(300));
            dayData.put("evening", 300 + random.nextInt(400));
            heatmap.add(dayData);
        }
        data.put("heatmap", heatmap);

        return ResponseEntity.ok(data);
    }

    private Map<String, Object> createTopUser(String name, int requests, double cost, String primaryFeature) {
        Map<String, Object> user = new HashMap<>();
        user.put("name", name);
        user.put("requests", requests);
        user.put("cost", cost);
        user.put("primaryFeature", primaryFeature);
        return user;
    }
}
