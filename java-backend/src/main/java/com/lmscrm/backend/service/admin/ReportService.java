package com.lmscrm.backend.service.admin;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.response.DashboardStatsResponse;
import com.lmscrm.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final DashboardService dashboardService;

    public byte[] generatePdfReport(User currentUser) {
        log.info("📄 Generating PDF Report for User: {} in Organization: {}", currentUser.getUsername(), currentUser.getOrganizationId());
        
        DashboardStatsResponse stats = dashboardService.getStats(currentUser);
        
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 54, 36);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            
            // Add custom page event for header and footer branding
            writer.setPageEvent(new PdfHeaderFooterHelper());
            
            document.open();
            
            // --- Title Block ---
            Font titleFont = new Font(Font.HELVETICA, 24, Font.BOLD, new Color(99, 102, 241)); // sleek indigo
            Paragraph title = new Paragraph("LMSHub - Tashkilot Sozlamalari & Hisoboti", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(10);
            document.add(title);
            
            // Divider line
            Paragraph line = new Paragraph("______________________________________________________________________________", 
                    new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(203, 213, 225)));
            line.setSpacingAfter(20);
            document.add(line);
            
            // --- Organization Metadata Block ---
            Font sectionTitleFont = new Font(Font.HELVETICA, 14, Font.BOLD, new Color(30, 41, 59));
            Paragraph orgSectionTitle = new Paragraph("1. Tashkilot Ma'lumotlari", sectionTitleFont);
            orgSectionTitle.setSpacingAfter(10);
            document.add(orgSectionTitle);
            
            // Safe metadata extraction
            String orgName = "PDP Academy";
            String orgEmail = "info@pdp.uz";
            String orgPhone = "+998 90 123 45 67";
            String orgAddress = "Toshkent sh, Yunusobod, O'zbekiston";
            
            if (stats != null && stats.getOrganization() != null) {
                if (stats.getOrganization().getName() != null) {
                    orgName = stats.getOrganization().getName();
                }
                if (stats.getOrganization().getEmail() != null) {
                    orgEmail = stats.getOrganization().getEmail();
                }
                if (stats.getOrganization().getPhone() != null) {
                    orgPhone = stats.getOrganization().getPhone();
                }
                if (stats.getOrganization().getAddress() != null) {
                    Object addr = stats.getOrganization().getAddress();
                    if (addr instanceof String) {
                        orgAddress = (String) addr;
                    } else if (addr instanceof com.lmscrm.backend.domain.entity.Address) {
                        com.lmscrm.backend.domain.entity.Address embeddedAddr = (com.lmscrm.backend.domain.entity.Address) addr;
                        orgAddress = String.format("%s, %s, %s", 
                            embeddedAddr.getRegion() != null ? embeddedAddr.getRegion() : "",
                            embeddedAddr.getDistrict() != null ? embeddedAddr.getDistrict() : "",
                            embeddedAddr.getStreetAddress() != null ? embeddedAddr.getStreetAddress() : ""
                        ).replaceAll("^, |,$", "").trim();
                    }
                }
            }
            
            Font labelFont = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(71, 85, 105));
            Font valueFont = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(15, 23, 42));
            
            PdfPTable metaTable = new PdfPTable(2);
            metaTable.setWidthPercentage(100);
            metaTable.setWidths(new float[]{1.5f, 4.0f});
            metaTable.setSpacingAfter(20);
            
            addMetaRow(metaTable, "Tashkilot Nomi:", orgName, labelFont, valueFont);
            addMetaRow(metaTable, "Aloqa Emaili:", orgEmail, labelFont, valueFont);
            addMetaRow(metaTable, "Telefon Nomer:", orgPhone, labelFont, valueFont);
            addMetaRow(metaTable, "Tashkilot Manzili:", orgAddress, labelFont, valueFont);
            addMetaRow(metaTable, "Hisobot Yaratuvchi:", currentUser.getFullName() != null ? currentUser.getFullName() : currentUser.getUsername(), labelFont, valueFont);
            addMetaRow(metaTable, "Yaratilgan Sana:", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")), labelFont, valueFont);
            
            document.add(metaTable);
            
            // --- Statistics Block ---
            Paragraph statsSectionTitle = new Paragraph("2. Tizim Ko'rsatkichlari (Statistika)", sectionTitleFont);
            statsSectionTitle.setSpacingAfter(10);
            document.add(statsSectionTitle);
            
            PdfPTable statsTable = new PdfPTable(3);
            statsTable.setWidthPercentage(100);
            statsTable.setWidths(new float[]{2.5f, 1.5f, 3.5f});
            statsTable.setSpacingAfter(15);
            
            // Header cells
            Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD, Color.WHITE);
            Color headerBg = new Color(79, 70, 229); // Professional Indigo Accent
            
            statsTable.addCell(createStyledCell("Ko'rsatkich Nomi", headerFont, headerBg, Element.ALIGN_LEFT, 8));
            statsTable.addCell(createStyledCell("Soni (Jami)", headerFont, headerBg, Element.ALIGN_CENTER, 8));
            statsTable.addCell(createStyledCell("Tavsif", headerFont, headerBg, Element.ALIGN_LEFT, 8));
            
            long tCount = stats != null ? stats.getTeachersCount() : 0;
            long sCount = stats != null ? stats.getStudentsCount() : 0;
            long pCount = stats != null ? stats.getParentsCount() : 0;
            long aCount = stats != null ? stats.getOrgAdminsCount() : 0;
            long gCount = stats != null ? stats.getGroupsCount() : 0;
            long eCount = stats != null ? stats.getEventsCount() : 0;
            
            Font dataFont = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(15, 23, 42));
            Color altRowBg = new Color(248, 250, 252);
            Color whiteBg = Color.WHITE;
            
            addStatsRow(statsTable, "O'qituvchilar (Teachers)", tCount, "Tashkilotda faol dars berayotgan o'qituvchilar tarkibi.", dataFont, whiteBg);
            addStatsRow(statsTable, "Talabalar (Students)", sCount, "Platformada tahsil olayotgan faol o'quvchilar soni.", dataFont, altRowBg);
            addStatsRow(statsTable, "Ota-onalar (Parents)", pCount, "Talabalarning bog'langan ota-onalari soni.", dataFont, whiteBg);
            addStatsRow(statsTable, "Administratorlar (Admins)", aCount, "Tashkilot boshqaruvi va modulyatsiyasi uchun mas'ullar.", dataFont, altRowBg);
            addStatsRow(statsTable, "Guruhlar (Groups)", gCount, "Tashkilotdagi faol ta'lim kurslari va dars guruhlari.", dataFont, whiteBg);
            addStatsRow(statsTable, "Tadbirlar (Events)", eCount, "Yaqinda tashkil etilgan yoki rejalashtirilgan voqealar.", dataFont, altRowBg);
            
            document.add(statsTable);
            
            // --- Footer / Disclaimer Section ---
            Paragraph note = new Paragraph("Ushbu hisobot avtomatik ravishda LMSHub CRM tizimi tomonidan generatsiya qilingan va yuridik kuchga ega.", 
                    new Font(Font.HELVETICA, 8, Font.ITALIC, new Color(148, 163, 184)));
            note.setAlignment(Element.ALIGN_CENTER);
            note.setSpacingBefore(30);
            document.add(note);
            
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("💥 OpenPDF Generation error: ", e);
            throw new RuntimeException("Hisobot PDF generatsiyasida xatolik yuz berdi: " + e.getMessage(), e);
        }
    }
    
    private void addMetaRow(PdfPTable table, String label, String val, Font lFont, Font vFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, lFont));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPadding(4);
        table.addCell(labelCell);
        
        PdfPCell valueCell = new PdfPCell(new Phrase(val, vFont));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPadding(4);
        table.addCell(valueCell);
    }
    
    private void addStatsRow(PdfPTable table, String label, long val, String desc, Font font, Color bg) {
        table.addCell(createStyledCell(label, font, bg, Element.ALIGN_LEFT, 6));
        table.addCell(createStyledCell(String.valueOf(val), new Font(Font.HELVETICA, 9, Font.BOLD, new Color(15, 23, 42)), bg, Element.ALIGN_CENTER, 6));
        table.addCell(createStyledCell(desc, font, bg, Element.ALIGN_LEFT, 6));
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
    
    // Custom PageEvent for dynamic header and footer branding
    private static class PdfHeaderFooterHelper extends PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            cb.saveState();
            
            // Footer Text
            String footerText = "Sahifa " + writer.getPageNumber() + " | LMSHub Premium CRM";
            Font footerFont = new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(148, 163, 184));
            
            cb.beginText();
            try {
                cb.setFontAndSize(BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, false), 8);
                cb.setColorFill(new Color(148, 163, 184));
                cb.showTextAligned(PdfContentByte.ALIGN_CENTER, footerText, 
                        (document.right() - document.left()) / 2 + document.leftMargin(), 
                        document.bottom() - 10, 0);
            } catch (Exception e) {
                log.error("Error drawing footer", e);
            }
            cb.endText();
            cb.restoreState();
        }
    }
}
