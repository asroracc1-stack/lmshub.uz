package com.lmscrm.backend.service.admin;

import com.lmscrm.backend.domain.entity.Invoice;
import com.lmscrm.backend.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminInvoiceControllerService {

    private final InvoiceRepository invoiceRepository;
    private final com.lmscrm.backend.repository.UserRepository userRepository;
    private final com.lmscrm.backend.repository.OrganizationRepository organizationRepository;
    private final com.lmscrm.backend.repository.GroupRepository groupRepository;
    private final com.lmscrm.backend.mapper.FinanceMapper financeMapper;

    public Page<com.lmscrm.backend.dto.finance.InvoiceDto> getInvoices(String query, String status, Pageable pageable) {
        Page<Invoice> invoices = invoiceRepository.filterInvoices(query, status, pageable);
        return invoices.map(financeMapper::toInvoiceDto);
    }

    public com.lmscrm.backend.dto.finance.InvoiceDto createInvoice(com.lmscrm.backend.dto.admin.InvoiceRequestDto request) {
        Invoice invoice = new Invoice();
        mapDtoToEntity(request, invoice);
        return financeMapper.toInvoiceDto(invoiceRepository.save(invoice));
    }

    public com.lmscrm.backend.dto.finance.InvoiceDto updateInvoice(UUID id, com.lmscrm.backend.dto.admin.InvoiceRequestDto request) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
        mapDtoToEntity(request, invoice);
        return financeMapper.toInvoiceDto(invoiceRepository.save(invoice));
    }

    private void mapDtoToEntity(com.lmscrm.backend.dto.admin.InvoiceRequestDto request, Invoice invoice) {
        invoice.setInvoiceNumber(request.getInvoiceNumber());
        invoice.setAmount(request.getAmount());
        invoice.setCurrency(request.getCurrency());
        invoice.setStatus(request.getStatus());
        invoice.setDescription(request.getDescription());
        invoice.setDueDate(request.getDueDate());

        if (request.getOrganizationId() != null) {
            invoice.setOrganization(organizationRepository.findById(request.getOrganizationId()).orElse(null));
        }
        if (request.getStudentId() != null) {
            invoice.setStudent(userRepository.findById(request.getStudentId()).orElse(null));
        }
        if (request.getGroupId() != null) {
            invoice.setGroup(groupRepository.findById(request.getGroupId()).orElse(null));
        }
    }

    public void markAsPaid(UUID id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
        invoice.setStatus(com.lmscrm.backend.domain.enums.InvoiceStatus.PAID);
        invoice.setPaidAt(java.time.LocalDateTime.now());
        invoiceRepository.save(invoice);
    }

    public void deleteInvoice(UUID id) {
        invoiceRepository.deleteById(id);
    }

    public boolean isNumberAvailable(String number) {
        return !invoiceRepository.existsByInvoiceNumber(number);
    }

    public String generateNextInvoiceNumber() {
        return invoiceRepository.findTopByOrderByCreatedAtDesc()
                .map(invoice -> {
                    String lastNumber = invoice.getInvoiceNumber();
                    try {
                        if (lastNumber.startsWith("INV-")) {
                            int nextVal = Integer.parseInt(lastNumber.substring(4)) + 1;
                            return String.format("INV-%04d", nextVal);
                        }
                    } catch (Exception e) {
                        // fallback if parsing fails
                    }
                    return "INV-" + System.currentTimeMillis() % 10000;
                })
                .orElse("INV-0001");
    }
}
