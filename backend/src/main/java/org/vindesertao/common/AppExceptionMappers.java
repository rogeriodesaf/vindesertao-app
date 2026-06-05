package org.vindesertao.common;

import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Provider
public class AppExceptionMappers implements ExceptionMapper<Throwable> {
    @Context
    UriInfo uriInfo;

    @Override
    public Response toResponse(Throwable exception) {
        if (exception instanceof ConstraintViolationException validation) {
            Map<String, String> errors = new LinkedHashMap<>();
            validation.getConstraintViolations().forEach(v ->
                    errors.put(v.getPropertyPath().toString(), v.getMessage()));
            return problem(Response.Status.BAD_REQUEST, "Validacao invalida", "Revise os campos enviados.", errors);
        }
        if (exception instanceof NotFoundException) {
            return problem(Response.Status.NOT_FOUND, "Nao encontrado", exception.getMessage(), Map.of());
        }
        if (exception instanceof WebApplicationException web) {
            Response.Status status = Response.Status.fromStatusCode(web.getResponse().getStatus());
            return problem(status == null ? Response.Status.BAD_REQUEST : status, "Erro na requisicao", web.getMessage(), Map.of());
        }
        if (exception instanceof IllegalArgumentException) {
            return problem(Response.Status.BAD_REQUEST, "Requisicao invalida", exception.getMessage(), Map.of());
        }
        if (exception instanceof SecurityException) {
            return problem(Response.Status.FORBIDDEN, "Acesso negado", exception.getMessage(), Map.of());
        }
        return problem(Response.Status.INTERNAL_SERVER_ERROR, "Erro interno", "Nao foi possivel concluir a operacao.", Map.of());
    }

    private Response problem(Response.Status status, String title, String detail, Map<String, String> errors) {
        ProblemDetails body = new ProblemDetails(
                "about:blank",
                title,
                status.getStatusCode(),
                detail,
                uriInfo == null ? "" : uriInfo.getPath(),
                OffsetDateTime.now(),
                errors
        );
        return Response.status(status).entity(body).type("application/problem+json").build();
    }
}
