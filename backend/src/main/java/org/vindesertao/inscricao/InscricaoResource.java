package org.vindesertao.inscricao;

import io.quarkus.panache.common.Page;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.vindesertao.common.PageResponse;

@Path("/inscricoes")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed("admin")
public class InscricaoResource {
    @Inject
    InscricaoService service;

    @GET
    public PageResponse<InscricaoDtos.InscricaoResponse> list(@QueryParam("page") @DefaultValue("0") int page,
                                                              @QueryParam("size") @DefaultValue("20") int size,
                                                              @QueryParam("status") StatusInscricao status,
                                                              @QueryParam("nome") String nome,
                                                              @QueryParam("email") String email,
                                                              @QueryParam("cidade") String cidade) {
        var query = service.filtered(status, nome, email, cidade);
        long total = query.count();
        var items = query.page(Page.of(page, size)).list().stream()
                .map(InscricaoDtos.InscricaoResponse::from)
                .toList();
        int pages = (int) Math.ceil(total / (double) size);
        return new PageResponse<>(items, total, page, size, pages);
    }

    @GET
    @Path("/{id}")
    public InscricaoDtos.InscricaoResponse get(@PathParam("id") Long id) {
        return InscricaoDtos.InscricaoResponse.from(service.get(id));
    }

    @POST
    public InscricaoDtos.InscricaoResponse create(@Valid InscricaoDtos.InscricaoRequest request) {
        return InscricaoDtos.InscricaoResponse.from(service.create(request));
    }

    @PUT
    @Path("/{id}")
    public InscricaoDtos.InscricaoResponse update(@PathParam("id") Long id,
                                                  @Valid InscricaoDtos.InscricaoRequest request) {
        return InscricaoDtos.InscricaoResponse.from(service.update(id, request));
    }

    @PATCH
    @Path("/{id}/status")
    public InscricaoDtos.InscricaoResponse updateStatus(@PathParam("id") Long id,
                                                        @Valid InscricaoDtos.StatusInscricaoRequest request) {
        return InscricaoDtos.InscricaoResponse.from(service.updateStatus(id, request));
    }
}
