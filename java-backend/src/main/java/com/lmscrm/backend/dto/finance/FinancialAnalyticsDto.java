package com.lmscrm.backend.dto.finance;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class FinancialAnalyticsDto {
    private BigDecimal totalRevenue;
    private BigDecimal pendingPayments;
    private List<MonthlyRevenue> monthlyRevenue;
}
