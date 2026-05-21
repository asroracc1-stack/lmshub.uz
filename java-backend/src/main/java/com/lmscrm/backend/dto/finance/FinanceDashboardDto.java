package com.lmscrm.backend.dto.finance;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinanceDashboardDto {
    private DashboardSummary summary;
    private List<MonthlyRevenue> monthlyRevenue;
    private List<StatusDistributionItem> statusDistribution;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardSummary {
        private BigDecimal totalRevenue;
        private BigDecimal pendingAmount;
        private BigDecimal overdueAmount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyRevenue {
        private String month;
        private BigDecimal amount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusDistributionItem {
        private String status;
        private long count;
        private BigDecimal amount;
    }
}
