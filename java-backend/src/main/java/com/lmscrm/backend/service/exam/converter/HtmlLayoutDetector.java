package com.lmscrm.backend.service.exam.converter;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

/**
 * HtmlLayoutDetector — Auto-detects the source layout format of incoming HTML files.
 *
 * Supported Layouts:
 *   - LMSHUB_V1        (Native LMSHub v1 spec with <lmshub-section>)
 *   - CAMBRIDGE_IELTS   (Cambridge IELTS 1-19 HTML exports)
 *   - BRITISH_COUNCIL  (British Council Online CBT layout)
 *   - FOZILBEK_IELTS   (Fozilbek / IELTS Ready CBT layout)
 *   - GENERIC_IELTS    (Generic IELTS HTML layouts)
 */
@Component
public class HtmlLayoutDetector {

    public enum HtmlLayoutType {
        LMSHUB_V1,
        CAMBRIDGE_IELTS,
        BRITISH_COUNCIL,
        FOZILBEK_IELTS,
        GENERIC_IELTS
    }

    public HtmlLayoutType detectLayout(String html) {
        if (html == null || html.isBlank()) {
            return HtmlLayoutType.GENERIC_IELTS;
        }

        Document doc = Jsoup.parse(html);

        // 1. LMSHub v1 Specification
        Element htmlEl = doc.selectFirst("html");
        if (htmlEl != null && "lmshub-v1".equalsIgnoreCase(htmlEl.attr("data-format"))) {
            return HtmlLayoutType.LMSHUB_V1;
        }
        if (!doc.select("lmshub-section").isEmpty()) {
            return HtmlLayoutType.LMSHUB_V1;
        }

        // 2. Fozilbek / IELTS Ready Layout
        if (html.contains("fozilbek") || !doc.select(".fozilbek-q, [data-fozilbek], .ielts-ready").isEmpty()) {
            return HtmlLayoutType.FOZILBEK_IELTS;
        }

        // 3. British Council CBT Layout
        if (html.contains("britishcouncil") || !doc.select(".bc-question, .bc-passage, #bc-test").isEmpty()) {
            return HtmlLayoutType.BRITISH_COUNCIL;
        }

        // 4. Cambridge IELTS Export Layout
        if (html.contains("cambridge") || !doc.select(".cambridge-passage, .cambridge-q, .c-question, .ielts-passage").isEmpty()) {
            return HtmlLayoutType.CAMBRIDGE_IELTS;
        }

        // 5. Generic IELTS Layout
        return HtmlLayoutType.GENERIC_IELTS;
    }
}
