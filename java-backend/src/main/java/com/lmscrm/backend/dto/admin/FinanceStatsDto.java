package com.lmscrm.backend.dto.admin;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class FinanceStatsDto {
    private BigDecimal totalRevenue;
    private BigDecimal pendingAmount;
    private BigDecimal overdueAmount;
    private List<MonthlyRevenueDto> monthlyRevenue;

    @Data
    @Builder
    public static class MonthlyRevenueDto {
        private String month;
        private BigDecimal amount;
    }
}
