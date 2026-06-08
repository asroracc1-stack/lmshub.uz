package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.Invoice;
import com.lmscrm.backend.domain.entity.Organization;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.InvoiceStatus;
import com.lmscrm.backend.repository.InvoiceRepository;
import com.lmscrm.backend.repository.OrganizationRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/invoices")
@RequiredArgsConstructor
@Tag(name = "Invoice Controller", description = "Endpoints for managing and generating invoices PDF")
@Slf4j
public class InvoiceController {

    private final UserRepository userRepository;
    private final InvoiceRepository invoiceRepository;
    private final OrganizationRepository organizationRepository;

    @GetMapping("/generate/{studentId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR')")
    @Operation(summary = "Generate PDF invoice for a specific student")
    public ResponseEntity<byte[]> generateInvoice(@PathVariable UUID studentId) {
        log.info("📄 Generating Invoice PDF for Student ID: {}", studentId);

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Talaba topilmadi"));

        List<Invoice> invoices = invoiceRepository.findByStudentId(studentId);

        // Fetch organization details
        UUID orgId = student.getOrganizationId();
        Organization org = null;
        if (orgId != null) {
            org = organizationRepository.findById(orgId).orElse(null);
        }

        String orgName = org != null && org.getName() != null ? org.getName() : "LMSHub Ta'lim Markazi";
        String orgPhone = org != null && org.getPhone() != null ? org.getPhone() : "+998 90 123 4567";
        String orgEmail = org != null && org.getEmail() != null ? org.getEmail() : "info@lmshub.uz";
        String orgAddress = "Toshkent sh, O'zbekiston";
        if (org != null && org.getAddress() != null) {
            orgAddress = org.getAddress().toString();
        }

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter.getInstance(document, out);

            document.open();

            // --- Header Bar ---
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{3.0f, 2.0f});
            headerTable.setSpacingAfter(20);

            // Title and branding
            Font brandFont = new Font(Font.HELVETICA, 22, Font.BOLD, new Color(245, 158, 11)); // Amber brand
            PdfPCell brandCell = new PdfPCell(new Phrase("LMSHub Billing", brandFont));
            brandCell.setBorder(Rectangle.NO_BORDER);
            headerTable.addCell(brandCell);

            // Document Title right-aligned
            Font docTitleFont = new Font(Font.HELVETICA, 16, Font.BOLD, new Color(30, 41, 59));
            PdfPCell docTitleCell = new PdfPCell(new Phrase("TO'LOV SCHOT-FAKTURASI", docTitleFont));
            docTitleCell.setBorder(Rectangle.NO_BORDER);
            docTitleCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            headerTable.addCell(docTitleCell);

            document.add(headerTable);

            // Sleek orange divider line
            Paragraph divider = new Paragraph("______________________________________________________________________________", 
                    new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(245, 158, 11)));
            divider.setSpacingAfter(25);
            document.add(divider);

            // --- Metadata block: Bill To vs. From ---
            PdfPTable metaTable = new PdfPTable(2);
            metaTable.setWidthPercentage(100);
            metaTable.setWidths(new float[]{1.0f, 1.0f});
            metaTable.setSpacingAfter(30);

            Font sectionFont = new Font(Font.HELVETICA, 12, Font.BOLD, new Color(30, 41, 59));
            Font textFont = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(71, 85, 105));
            Font boldTextFont = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(15, 23, 42));

            // Column 1: Bill To (Student)
            PdfPCell studentCell = new PdfPCell();
            studentCell.setBorder(Rectangle.NO_BORDER);
            studentCell.addElement(new Paragraph("KIMGA TO'LANADI (TALABA):", sectionFont));
            studentCell.addElement(new Paragraph(student.getFullName() != null ? student.getFullName() : student.getUsername(), boldTextFont));
            studentCell.addElement(new Paragraph("Talaba ID: " + student.getId().toString().substring(0, 8), textFont));
            studentCell.addElement(new Paragraph("Tel: " + (student.getPhoneNumber() != null ? student.getPhoneNumber() : "—"), textFont));
            metaTable.addCell(studentCell);

            // Column 2: Bill From (Organization)
            PdfPCell orgCell = new PdfPCell();
            orgCell.setBorder(Rectangle.NO_BORDER);
            orgCell.addElement(new Paragraph("KIMDAN (TASHKILOT REKVIZITLARI):", sectionFont));
            orgCell.addElement(new Paragraph(orgName, boldTextFont));
            orgCell.addElement(new Paragraph("Email: " + orgEmail, textFont));
            orgCell.addElement(new Paragraph("Tel: " + orgPhone, textFont));
            orgCell.addElement(new Paragraph("Manzil: " + orgAddress, textFont));
            metaTable.addCell(orgCell);

            document.add(metaTable);

            // --- Itemized Billing Table ---
            Paragraph itemsTitle = new Paragraph("To'lov Shartlari va Tafsilotlari:", sectionFont);
            itemsTitle.setSpacingAfter(10);
            document.add(itemsTitle);

            PdfPTable itemsTable = new PdfPTable(4);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new float[]{1.5f, 3.5f, 2.0f, 2.0f});
            itemsTable.setSpacingAfter(20);

            // Headers
            Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD, Color.WHITE);
            Color headerBg = new Color(30, 41, 59);

            itemsTable.addCell(createStyledCell("Schot raqami", headerFont, headerBg, Element.ALIGN_CENTER, 8));
            itemsTable.addCell(createStyledCell("Tavsif (Xizmat turi)", headerFont, headerBg, Element.ALIGN_LEFT, 8));
            itemsTable.addCell(createStyledCell("Muddati", headerFont, headerBg, Element.ALIGN_CENTER, 8));
            itemsTable.addCell(createStyledCell("Miqdor", headerFont, headerBg, Element.ALIGN_RIGHT, 8));

            Font cellFont = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(15, 23, 42));
            Color altBg = new Color(248, 250, 252);
            BigDecimal totalAmount = BigDecimal.ZERO;

            if (invoices == null || invoices.isEmpty()) {
                // Fallback course payment
                BigDecimal amount = new BigDecimal("600000");
                totalAmount = amount;
                String formatted = String.format("%,.0f UZS", amount);

                itemsTable.addCell(createStyledCell("INV-MOCK", cellFont, Color.WHITE, Element.ALIGN_CENTER, 8));
                itemsTable.addCell(createStyledCell("LMSHub Premium Oylik Ta'lim Kursi To'lovi", cellFont, Color.WHITE, Element.ALIGN_LEFT, 8));
                itemsTable.addCell(createStyledCell(LocalDateTime.now().plusDays(10).format(DateTimeFormatter.ofPattern("yyyy-MM-dd")), cellFont, Color.WHITE, Element.ALIGN_CENTER, 8));
                itemsTable.addCell(createStyledCell(formatted, cellFont, Color.WHITE, Element.ALIGN_RIGHT, 8));
            } else {
                boolean rowAlt = false;
                for (Invoice inv : invoices) {
                    BigDecimal amount = inv.getAmount() != null ? inv.getAmount() : BigDecimal.ZERO;
                    if (inv.getStatus() != InvoiceStatus.PAID && inv.getStatus() != InvoiceStatus.CANCELLED) {
                        totalAmount = totalAmount.add(amount);
                    }

                    String statusText = inv.getStatus() != null ? inv.getStatus().name() : "PENDING";
                    String desc = "Oylik kurs to'lovi (" + statusText + ")";
                    String formatted = String.format("%,.0f UZS", amount);
                    String dueDateStr = inv.getDueDate() != null ? inv.getDueDate().toString() : "—";
                    Color bg = rowAlt ? altBg : Color.WHITE;

                    itemsTable.addCell(createStyledCell(inv.getInvoiceNumber() != null ? inv.getInvoiceNumber() : "INV-N/A", cellFont, bg, Element.ALIGN_CENTER, 8));
                    itemsTable.addCell(createStyledCell(desc, cellFont, bg, Element.ALIGN_LEFT, 8));
                    itemsTable.addCell(createStyledCell(dueDateStr, cellFont, bg, Element.ALIGN_CENTER, 8));
                    itemsTable.addCell(createStyledCell(formatted, cellFont, bg, Element.ALIGN_RIGHT, 8));
                    rowAlt = !rowAlt;
                }
            }

            document.add(itemsTable);

            // --- Invoice Total Summary ---
            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(100);
            summaryTable.setWidths(new float[]{4.0f, 1.0f});
            summaryTable.setSpacingAfter(40);

            Font totalFont = new Font(Font.HELVETICA, 12, Font.BOLD, new Color(30, 41, 59));
            String totalFormatted = String.format("%,.0f UZS", totalAmount);

            PdfPCell totalLabelCell = new PdfPCell(new Phrase("UMUMIY TO'LOV BALANSI (JAMI PENDING):", totalFont));
            totalLabelCell.setBorder(Rectangle.NO_BORDER);
            totalLabelCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            summaryTable.addCell(totalLabelCell);

            PdfPCell totalValCell = new PdfPCell(new Phrase(totalFormatted, totalFont));
            totalValCell.setBorder(Rectangle.NO_BORDER);
            totalValCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            summaryTable.addCell(totalValCell);

            document.add(summaryTable);

            // --- Footer / Signatures ---
            Paragraph signatureIntro = new Paragraph("Imzo va Muhr o'rni:", sectionFont);
            signatureIntro.setSpacingAfter(15);
            document.add(signatureIntro);

            PdfPTable signatureTable = new PdfPTable(2);
            signatureTable.setWidthPercentage(100);
            signatureTable.setWidths(new float[]{1.0f, 1.0f});

            PdfPCell parentSigCell = new PdfPCell();
            parentSigCell.setBorder(Rectangle.NO_BORDER);
            parentSigCell.addElement(new Paragraph("__________________________", boldTextFont));
            parentSigCell.addElement(new Paragraph("Talaba / Vasiy Imzosi", textFont));
            signatureTable.addCell(parentSigCell);

            PdfPCell orgSigCell = new PdfPCell();
            orgSigCell.setBorder(Rectangle.NO_BORDER);
            orgSigCell.addElement(new Paragraph("__________________________", boldTextFont));
            orgSigCell.addElement(new Paragraph("Mas'ul Shaxs Imzosi / Muhr", textFont));
            signatureTable.addCell(orgSigCell);

            document.add(signatureTable);

            // Disclaimer
            Paragraph disclaimer = new Paragraph("Ushbu to'lov schot-fakturasi LMSHub Billing tizimi tomonidan avtomatik generatsiya qilindi.", 
                    new Font(Font.HELVETICA, 8, Font.ITALIC, new Color(148, 163, 184)));
            disclaimer.setAlignment(Element.ALIGN_CENTER);
            disclaimer.setSpacingBefore(40);
            document.add(disclaimer);

            document.close();
            byte[] pdfBytes = out.toByteArray();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("filename", "LMSHub_Invoice_" + student.getUsername() + ".pdf");
            headers.setContentLength(pdfBytes.length);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);

        } catch (Exception e) {
            log.error("💥 OpenPDF Invoice generation error: ", e);
            throw new RuntimeException("Invoice PDF yaratishda xatolik yuz berdi: " + e.getMessage(), e);
        }
    }

    private PdfPCell createStyledCell(String text, Font font, Color bgColor, int alignment, float padding) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bgColor);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(padding);
        cell.setBorderColor(new Color(226, 232, 240));
        return cell;
    }
}
