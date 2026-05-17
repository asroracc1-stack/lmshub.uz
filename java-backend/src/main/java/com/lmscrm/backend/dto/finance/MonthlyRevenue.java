package com.lmscrm.backend.dto.finance;

import java.math.BigDecimal;

public interface MonthlyRevenue {
    String getPeriod();
    BigDecimal getAmount();
}
