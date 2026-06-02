package com.lmscrm.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Talabaning Dashboard sahifasi uchun yig'ma statistika DTO-si.
 * Barcha maydonlar null-safe va frontend bilan mos keladi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.ALWAYS)
public class StudentDashboardSummaryDto {

    /** Talaba a'zo bo'lgan faol guruhlar soni (users.group_id + group_members) */
    @JsonProperty("myGroupsCount")
    private long myGroupsCount;

    /** Talaba topshirgan jami mock/imtihon urinishlari soni */
    @JsonProperty("mockExamsCount")
    private long mockExamsCount;

    /**
     * O'rtacha IELTS Band Score (overall_band).
     * Null bo'lsa frontend "—" ko'rsatadi.
     */
    @JsonProperty("averageBandScore")
    private Double averageBandScore;

    /**
     * Talabaning PENDING (kutilmoqda) to'lovlari yig'indisi (UZS).
     * Manba: payment_transactions jadvali.
     */
    @JsonProperty("pendingBalance")
    private Double pendingBalance;

    /** Foydalanuvchining yig'gan coinlari */
    @JsonProperty("coins")
    private long coins;

    /** Keyingi IELTS imtihon sanasi (YYYY-MM-DD). Null bo'lsa frontend "—" ko'rsatadi. */
    @JsonProperty("nextExamDate")
    private String nextExamDate;

    /** Keyingi imtihon label-i (masalan: "Maqsad: 7.0 band") */
    @JsonProperty("nextExamLabel")
    private String nextExamLabel;
}

