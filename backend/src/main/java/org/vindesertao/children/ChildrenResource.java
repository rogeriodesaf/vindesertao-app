package org.vindesertao.children;

import io.quarkus.panache.common.Page;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.vindesertao.auth.CurrentUser;
import org.vindesertao.common.PageResponse;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Path("/children")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({"admin", "lider", "projetista"})
public class ChildrenResource {
    private static final String XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final DateTimeFormatter BRAZIL_DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @Inject
    ChildrenService service;

    @Inject
    CurrentUser currentUser;

    @GET
    public PageResponse<ChildrenDtos.ChildResponse> list(@QueryParam("page") @DefaultValue("0") int page,
                                                         @QueryParam("size") @DefaultValue("20") int size,
                                                         @QueryParam("activityName") String activityName,
                                                         @QueryParam("responsibleUserId") Long responsibleUserId,
                                                         @QueryParam("neighborhood") String neighborhood,
                                                         @QueryParam("from") String from,
                                                         @QueryParam("to") String to) {
        var query = service.filtered(activityName, responsibleUserId, neighborhood, parseDate(from), parseDate(to));
        long total = query.count();
        var items = query.page(Page.of(page, size)).list().stream()
                .map(ChildrenDtos.ChildResponse::from)
                .toList();
        int pages = (int) Math.ceil(total / (double) size);
        return new PageResponse<>(items, total, page, size, pages);
    }

    @GET
    @Path("/summary")
    public ChildrenDtos.ChildrenSummary summary(@QueryParam("activityName") String activityName,
                                                @QueryParam("responsibleUserId") Long responsibleUserId,
                                                @QueryParam("neighborhood") String neighborhood,
                                                @QueryParam("from") String from,
                                                @QueryParam("to") String to) {
        return service.summary(activityName, responsibleUserId, neighborhood, parseDate(from), parseDate(to));
    }

    @GET
    @Path("/{id}")
    public ChildrenDtos.ChildResponse get(@PathParam("id") Long id) {
        return ChildrenDtos.ChildResponse.from(service.getAllowed(id, false, currentUser.entity()));
    }

    @POST
    public ChildrenDtos.ChildResponse create(@Valid ChildrenDtos.ChildRequest request) {
        return ChildrenDtos.ChildResponse.from(service.create(request));
    }

    @PUT
    @Path("/{id}")
    public ChildrenDtos.ChildResponse update(@PathParam("id") Long id, @Valid ChildrenDtos.ChildRequest request) {
        return ChildrenDtos.ChildResponse.from(service.update(id, request));
    }

    @GET
    @Path("/export.xlsx")
    @Produces(XLSX_MEDIA_TYPE)
    public Response exportXlsx(@QueryParam("activityName") String activityName,
                               @QueryParam("responsibleUserId") Long responsibleUserId,
                               @QueryParam("neighborhood") String neighborhood,
                               @QueryParam("from") String from,
                               @QueryParam("to") String to) {
        var rows = service.filtered(activityName, responsibleUserId, neighborhood, parseDate(from), parseDate(to)).list();
        return Response.ok(workbook(rows))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=relatorio-infantil.xlsx")
                .build();
    }

    private OffsetDateTime parseDate(String value) {
        return value == null || value.isBlank() ? null : OffsetDateTime.parse(value);
    }

    private byte[] workbook(List<ChildRecord> records) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(out, StandardCharsets.UTF_8)) {
                writeEntry(zip, "[Content_Types].xml", """
                        <?xml version="1.0" encoding="UTF-8"?>
                        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                          <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                          <Default Extension="xml" ContentType="application/xml"/>
                          <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                          <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                          <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
                        </Types>
                        """);
                writeEntry(zip, "_rels/.rels", """
                        <?xml version="1.0" encoding="UTF-8"?>
                        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
                        </Relationships>
                        """);
                writeEntry(zip, "xl/workbook.xml", """
                        <?xml version="1.0" encoding="UTF-8"?>
                        <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                          <sheets><sheet name="Infantil" sheetId="1" r:id="rId1"/></sheets>
                        </workbook>
                        """);
                writeEntry(zip, "xl/_rels/workbook.xml.rels", """
                        <?xml version="1.0" encoding="UTF-8"?>
                        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
                          <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
                        </Relationships>
                        """);
                writeEntry(zip, "xl/styles.xml", stylesXml());
                writeEntry(zip, "xl/worksheets/sheet1.xml", sheetXml(records));
            }
            return out.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Nao foi possivel gerar o arquivo Excel.", exception);
        }
    }

    private String sheetXml(List<ChildRecord> records) {
        List<List<String>> rows = new ArrayList<>();
        rows.add(Arrays.asList("Crianca", "Responsavel", "Telefone", "Idade", "Bairro", "Cidade",
                "Atividade", "Observacoes", "Cadastrado por", "Cadastrado em"));
        records.forEach(record -> rows.add(Arrays.asList(
                text(record.childName),
                text(record.guardianName),
                text(record.guardianPhone),
                text(record.age),
                text(record.neighborhood),
                text(record.city),
                text(record.activityName),
                text(record.notes),
                record.responsibleUser == null ? "" : text(record.responsibleUser.name),
                formatDate(record.createdAt)
        )));

        String lastColumn = columnName(rows.get(0).size());
        StringBuilder xml = new StringBuilder("""
                <?xml version="1.0" encoding="UTF-8"?>
                <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                  <sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
                  <sheetFormatPr defaultRowHeight="18"/>
                  <cols>
                    <col min="1" max="3" width="24" customWidth="1"/>
                    <col min="4" max="6" width="16" customWidth="1"/>
                    <col min="7" max="8" width="30" customWidth="1"/>
                    <col min="9" max="10" width="24" customWidth="1"/>
                  </cols>
                  <sheetData>
                    <row r="1"><c r="A1" s="1" t="inlineStr"><is><t>Relatorio do departamento infantil</t></is></c></row>
                    <row r="2"><c r="A2" s="2" t="inlineStr"><is><t>Gerado em %s | Total de criancas: %s</t></is></c></row>
                """.formatted(formatDate(OffsetDateTime.now()), records.size()));
        for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
            int excelRow = rowIndex + 3;
            xml.append("<row r=\"").append(excelRow).append("\">");
            List<String> row = rows.get(rowIndex);
            for (int columnIndex = 0; columnIndex < row.size(); columnIndex++) {
                String cell = columnName(columnIndex + 1) + excelRow;
                int style = rowIndex == 0 ? 3 : 4;
                xml.append("<c r=\"").append(cell).append("\" s=\"").append(style).append("\" t=\"inlineStr\"><is><t xml:space=\"preserve\">")
                        .append(xml(row.get(columnIndex)))
                        .append("</t></is></c>");
            }
            xml.append("</row>");
        }
        xml.append("""
                  </sheetData>
                  <autoFilter ref="A3:%s%s"/>
                  <mergeCells count="1"><mergeCell ref="A1:%s1"/></mergeCells>
                </worksheet>
                """.formatted(lastColumn, rows.size() + 2, lastColumn));
        return xml.toString();
    }

    private String stylesXml() {
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                  <fonts count="4">
                    <font><sz val="11"/><color rgb="FF1D2A24"/><name val="Calibri"/></font>
                    <font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
                    <font><i/><sz val="10"/><color rgb="FF607168"/><name val="Calibri"/></font>
                    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
                  </fonts>
                  <fills count="4">
                    <fill><patternFill patternType="none"/></fill>
                    <fill><patternFill patternType="gray125"/></fill>
                    <fill><patternFill patternType="solid"><fgColor rgb="FF276749"/><bgColor indexed="64"/></patternFill></fill>
                    <fill><patternFill patternType="solid"><fgColor rgb="FFEAF3EC"/><bgColor indexed="64"/></patternFill></fill>
                  </fills>
                  <borders count="2">
                    <border><left/><right/><top/><bottom/><diagonal/></border>
                    <border><left style="thin"><color rgb="FFD9E2DD"/></left><right style="thin"><color rgb="FFD9E2DD"/></right><top style="thin"><color rgb="FFD9E2DD"/></top><bottom style="thin"><color rgb="FFD9E2DD"/></bottom><diagonal/></border>
                  </borders>
                  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
                  <cellXfs count="5">
                    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
                    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>
                    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
                    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" wrapText="1"/></xf>
                    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center"/></xf>
                  </cellXfs>
                  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
                </styleSheet>
                """;
    }

    private void writeEntry(ZipOutputStream zip, String name, String content) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private String columnName(int index) {
        StringBuilder name = new StringBuilder();
        while (index > 0) {
            index--;
            name.insert(0, (char) ('A' + (index % 26)));
            index /= 26;
        }
        return name.toString();
    }

    private String text(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String formatDate(OffsetDateTime value) {
        return value == null ? "" : value.format(BRAZIL_DATE_TIME);
    }

    private String xml(String value) {
        return value == null ? "" : value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}
