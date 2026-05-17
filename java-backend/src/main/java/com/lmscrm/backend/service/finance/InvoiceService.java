package com.lmscrm.backend.service.finance;

import com.lmscrm.backend.domain.entity.Group;
import com.lmscrm.backend.domain.entity.GroupMember;
import com.lmscrm.backend.domain.entity.Invoice;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.InvoiceStatus;
import com.lmscrm.backend.dto.finance.InvoiceDto;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.mapper.FinanceMapper;
import com.lmscrm.backend.repository.GroupMemberRepository;
import com.lmscrm.backend.repository.GroupRepository;
import com.lmscrm.backend.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final FinanceMapper mapper;

    @Transactional(readOnly = true)
    public List<InvoiceDto> getStudentInvoices(UUID studentId) {
        return invoiceRepository.findByStudentId(studentId).stream()
                .map(mapper::toInvoiceDto)
                .collect(Collectors.toList());
    }

    /**
     * Scheduled task to generate invoices automatically on the 1st of every month.
     * Uses Spring Scheduling.
     */
    @Scheduled(cron = "0 0 0 1 * ?") // Every 1st day of the month at 00:00
    @Transactional
    public void generateMonthlyInvoices() {
        log.info("Starting automatic monthly invoice generation...");
        List<Group> activeGroups = groupRepository.findAll(); // Optimization: find only active groups

        String currentMonthYear = LocalDate.now().format(DateTimeFormatter.ofPattern("MMyyyy"));

        for (Group group : activeGroups) {
            // Assume each group has a standard monthly fee logic (hardcoded here, ideally in Group entity)
            BigDecimal monthlyFee = new BigDecimal("350000.00");

            List<GroupMember> members = groupMemberRepository.findByGroupId(group.getId());
            for (GroupMember member : members) {
                String invoiceNumber = "INV-" + member.getStudent().getId().toString().substring(0, 4).toUpperCase() + "-" + currentMonthYear;

                Invoice invoice = Invoice.builder()
                        .invoiceNumber(invoiceNumber)
                        .student(member.getStudent())
                        .group(group)
                        .amount(monthlyFee)
                        .currency("UZS")
                        .status(InvoiceStatus.PENDING)
                        .description("Monthly fee for " + LocalDate.now().getMonth().toString())
                        .dueDate(LocalDate.now().plusDays(5)) // Due in 5 days
                        .organization(group.getOrganization())
                        .build();

                invoiceRepository.save(invoice);
                log.info("Generated invoice {} for student {}", invoiceNumber, member.getStudent().getEmail());
            }
        }
        log.info("Finished monthly invoice generation.");
    }
}
