package org.vindesertao.visit;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VisitExcelExportTest {
    @Test
    void exportsCloudinaryPhotoAsClickableExcelHyperlink() throws Exception {
        HouseholdVisit withPhoto = visit("Com foto");
        withPhoto.photoUrl = "https://res.cloudinary.com/test/image/upload/foto.jpg?v=1&source=visit";
        HouseholdVisit withoutPhoto = visit("Sem foto");

        Map<String, String> entries = entries(new VisitResource().workbook(List.of(withPhoto, withoutPhoto)));
        String sheet = entries.get("xl/worksheets/sheet1.xml");
        String relationships = entries.get("xl/worksheets/_rels/sheet1.xml.rels");
        String styles = entries.get("xl/styles.xml");

        assertTrue(sheet.contains("<c r=\"O5\" s=\"7\""));
        assertTrue(sheet.contains(">Ver foto</t>"));
        assertTrue(sheet.contains("<hyperlink ref=\"O5\" r:id=\"rId1\"/>"));
        assertTrue(sheet.contains("<c r=\"O6\" s=\"4\""));
        assertTrue(sheet.contains(">Sem foto</t>"));
        assertFalse(sheet.contains("ref=\"O6\" r:id="));
        assertTrue(relationships.contains("Target=\"https://res.cloudinary.com/test/image/upload/foto.jpg?v=1&amp;source=visit\""));
        assertTrue(relationships.contains("TargetMode=\"External\""));
        assertTrue(styles.contains("<u/><sz val=\"11\"/><color rgb=\"FF0563C1\""));
        assertDoesNotThrow(() -> parseXml(sheet));
        assertDoesNotThrow(() -> parseXml(relationships));
    }

    private HouseholdVisit visit(String name) {
        HouseholdVisit visit = new HouseholdVisit();
        visit.personName = name;
        visit.city = "Sertao";
        visit.wantsVisits = true;
        return visit;
    }

    private Map<String, String> entries(byte[] workbook) throws Exception {
        Map<String, String> entries = new HashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(workbook), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                entries.put(entry.getName(), new String(zip.readAllBytes(), StandardCharsets.UTF_8));
            }
        }
        return entries;
    }

    private void parseXml(String xml) throws Exception {
        var factory = javax.xml.parsers.DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
    }
}
