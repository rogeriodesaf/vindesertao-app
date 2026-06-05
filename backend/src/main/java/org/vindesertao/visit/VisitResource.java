package org.vindesertao.visit;

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

@Path("/visits")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({"admin", "lider", "projetista"})
public class VisitResource {
    private static final String XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final DateTimeFormatter BRAZIL_DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @Inject
    VisitService visitService;

    @Inject
    CurrentUser currentUser;

    @GET
    public PageResponse<VisitDtos.VisitResponse> list(@QueryParam("page") @DefaultValue("0") int page,
                                                       @QueryParam("size") @DefaultValue("20") int size,
                                                       @QueryParam("neighborhood") String neighborhood,
                                                       @QueryParam("wantsVisits") Boolean wantsVisits,
                                                       @QueryParam("responsibleUserId") Long responsibleUserId,
                                                       @QueryParam("teamId") Long teamId,
                                                       @QueryParam("from") String from,
                                                       @QueryParam("to") String to) {
        var query = visitService.filtered(neighborhood, wantsVisits, responsibleUserId, teamId, parseDate(from), parseDate(to));
        long total = query.count();
        List<VisitDtos.VisitResponse> items = query.page(Page.of(page, size)).list()
                .stream()
                .map(VisitDtos.VisitResponse::summary)
                .toList();
        int pages = (int) Math.ceil(total / (double) size);
        return new PageResponse<>(items, total, page, size, pages);
    }

    @GET
    @Path("/{id}")
    public VisitDtos.VisitResponse get(@PathParam("id") Long id) {
        return VisitDtos.VisitResponse.from(visitService.getAllowed(id, false, currentUser.entity()));
    }

    @POST
    public VisitDtos.VisitResponse create(@Valid VisitDtos.VisitRequest request) {
        return VisitDtos.VisitResponse.from(visitService.create(request));
    }

    @PUT
    @Path("/{id}")
    public VisitDtos.VisitResponse update(@PathParam("id") Long id, @Valid VisitDtos.VisitRequest request) {
        return VisitDtos.VisitResponse.from(visitService.update(id, request));
    }

    @GET
    @Path("/export.csv")
    @Produces("text/csv")
    public Response exportCsv(@QueryParam("neighborhood") String neighborhood,
                              @QueryParam("wantsVisits") Boolean wantsVisits,
                              @QueryParam("responsibleUserId") Long responsibleUserId,
                              @QueryParam("teamId") Long teamId,
                              @QueryParam("from") String from,
                              @QueryParam("to") String to) {
        var rows = visitService.filtered(neighborhood, wantsVisits, responsibleUserId, teamId, parseDate(from), parseDate(to)).list();
        StringBuilder csv = new StringBuilder("id,nome,telefone,rua,numero,bairro,cidade,latitude,longitude,aceita_visitas,idade,moradores,ponto_referencia,pedido_oracao,proxima_visita,observacoes,foto_anexada,foto_url,projetista,equipe,criada_em\n");
        rows.forEach(visit -> csv.append(escape(visit.id)).append(',')
                .append(escape(visit.personName)).append(',')
                .append(escape(visit.phone)).append(',')
                .append(escape(visit.street)).append(',')
                .append(escape(visit.number)).append(',')
                .append(escape(visit.neighborhood)).append(',')
                .append(escape(visit.city)).append(',')
                .append(escape(visit.latitude)).append(',')
                .append(escape(visit.longitude)).append(',')
                .append(escape(visit.wantsVisits)).append(',')
                .append(escape(visit.personAge)).append(',')
                .append(escape(visit.householdSize)).append(',')
                .append(escape(visit.referencePoint)).append(',')
                .append(escape(visit.prayerRequest)).append(',')
                .append(escape(visit.nextVisitAt)).append(',')
                .append(escape(visit.notes)).append(',')
                .append(escape(hasPhoto(visit) ? "Sim" : "Nao")).append(',')
                .append(escape(visit.photoUrl)).append(',')
                .append(escape(visit.responsibleUser == null ? "" : visit.responsibleUser.name)).append(',')
                .append(escape(visit.team == null ? "" : visit.team.name)).append(',')
                .append(escape(visit.createdAt)).append('\n'));
        return Response.ok(csv.toString().getBytes(StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=visitas.csv")
                .build();
    }

    @GET
    @Path("/export.xlsx")
    @Produces(XLSX_MEDIA_TYPE)
    public Response exportXlsx(@QueryParam("neighborhood") String neighborhood,
                               @QueryParam("wantsVisits") Boolean wantsVisits,
                               @QueryParam("responsibleUserId") Long responsibleUserId,
                               @QueryParam("teamId") Long teamId,
                               @QueryParam("from") String from,
                               @QueryParam("to") String to) {
        var rows = visitService.filtered(neighborhood, wantsVisits, responsibleUserId, teamId, parseDate(from), parseDate(to)).list();
        byte[] workbook = workbook(rows);
        return Response.ok(workbook)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=visitas.xlsx")
                .build();
    }

    private OffsetDateTime parseDate(String value) {
        return value == null || value.isBlank() ? null : OffsetDateTime.parse(value);
    }

    private String escape(Object value) {
        String text = value == null ? "" : String.valueOf(value);
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }

    private byte[] workbook(List<HouseholdVisit> visits) {
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
                          <sheets>
                            <sheet name="Fichas de visita" sheetId="1" r:id="rId1"/>
                          </sheets>
                        </workbook>
                        """);
                writeEntry(zip, "xl/_rels/workbook.xml.rels", """
                        <?xml version="1.0" encoding="UTF-8"?>
                        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
                        </Relationships>
                        """);
                writeEntry(zip, "xl/worksheets/sheet1.xml", sheetXml(visits));
            }
            return out.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Nao foi possivel gerar o arquivo Excel.", exception);
        }
    }

    private String sheetXml(List<HouseholdVisit> visits) {
        List<List<String>> rows = new ArrayList<>();
        rows.add(Arrays.asList("ID", "Nome", "Telefone", "Rua", "Numero", "Bairro", "Cidade", "Latitude", "Longitude",
                "Aceita visitas", "Idade", "Moradores", "Ponto de referencia", "Pedido de oracao", "Proxima visita",
                "Observacoes", "Foto anexada", "URL da foto", "Projetista", "Equipe", "Criada em"));
        visits.forEach(visit -> rows.add(Arrays.asList(
                text(visit.id),
                text(visit.personName),
                text(visit.phone),
                text(visit.street),
                text(visit.number),
                text(visit.neighborhood),
                text(visit.city),
                text(visit.latitude),
                text(visit.longitude),
                visit.wantsVisits ? "Sim" : "Nao",
                text(visit.personAge),
                text(visit.householdSize),
                text(visit.referencePoint),
                text(visit.prayerRequest),
                formatDate(visit.nextVisitAt),
                text(visit.notes),
                hasPhoto(visit) ? "Sim" : "Nao",
                text(visit.photoUrl),
                visit.responsibleUser == null ? "" : text(visit.responsibleUser.name),
                visit.team == null ? "" : text(visit.team.name),
                formatDate(visit.createdAt)
        )));

        StringBuilder xml = new StringBuilder("""
                <?xml version="1.0" encoding="UTF-8"?>
                <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                  <sheetData>
                """);
        for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
            int excelRow = rowIndex + 1;
            xml.append("<row r=\"").append(excelRow).append("\">");
            List<String> row = rows.get(rowIndex);
            for (int columnIndex = 0; columnIndex < row.size(); columnIndex++) {
                String cell = columnName(columnIndex + 1) + excelRow;
                xml.append("<c r=\"").append(cell).append("\" t=\"inlineStr\"><is><t>")
                        .append(xml(row.get(columnIndex)))
                        .append("</t></is></c>");
            }
            xml.append("</row>");
        }
        xml.append("""
                  </sheetData>
                </worksheet>
                """);
        return xml.toString();
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

    private boolean hasPhoto(HouseholdVisit visit) {
        return (visit.photoUrl != null && !visit.photoUrl.isBlank())
                || (visit.photoData != null && !visit.photoData.isBlank());
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
