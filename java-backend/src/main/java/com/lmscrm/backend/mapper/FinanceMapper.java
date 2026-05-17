package com.lmscrm.backend.mapper;

import com.lmscrm.backend.domain.entity.CoinTransaction;
import com.lmscrm.backend.domain.entity.Invoice;
import com.lmscrm.backend.domain.entity.Payment;
import com.lmscrm.backend.dto.finance.CoinTransactionDto;
import com.lmscrm.backend.dto.finance.InvoiceDto;
import com.lmscrm.backend.dto.finance.PaymentDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface FinanceMapper {

    @Mapping(source = "student.id", target = "studentId")
    @Mapping(source = "student.email", target = "studentName")
    @Mapping(source = "group.id", target = "groupId")
    @Mapping(source = "group.name", target = "groupName")
    @Mapping(source = "organization.id", target = "organizationId")
    InvoiceDto toInvoiceDto(Invoice invoice);

    @Mapping(source = "invoice.id", target = "invoiceId")
    @Mapping(source = "invoice.invoiceNumber", target = "invoiceNumber")
    @Mapping(source = "student.id", target = "studentId")
    @Mapping(source = "student.email", target = "studentName")
    PaymentDto toPaymentDto(Payment payment);

    @Mapping(source = "student.id", target = "studentId")
    @Mapping(source = "student.email", target = "studentName")
    CoinTransactionDto toCoinTransactionDto(CoinTransaction coinTransaction);
}
