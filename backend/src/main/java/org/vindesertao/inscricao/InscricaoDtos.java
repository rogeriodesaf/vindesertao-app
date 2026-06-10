package org.vindesertao.inscricao;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class InscricaoDtos {
    public record InscricaoRequest(
            @NotBlank String nome,
            @Email @NotBlank String email,
            String telefone,
            String cidade,
            String igreja,
            String tamanhoCamisa,
            String observacoes,
            @NotNull @DecimalMin(value = "0.00") BigDecimal valor,
            StatusInscricao status,
            Long usuarioId
    ) {
    }

    public record StatusInscricaoRequest(
            @NotNull StatusInscricao status
    ) {
    }

    public record InscricaoResponse(
            Long id,
            String nome,
            String email,
            String telefone,
            String cidade,
            String igreja,
            String tamanhoCamisa,
            String observacoes,
            BigDecimal valor,
            StatusInscricao status,
            OffsetDateTime dataCriacao,
            OffsetDateTime dataAtualizacao,
            Long usuarioId,
            String usuarioNome
    ) {
        public static InscricaoResponse from(Inscricao inscricao) {
            return new InscricaoResponse(
                    inscricao.id,
                    inscricao.nome,
                    inscricao.email,
                    inscricao.telefone,
                    inscricao.cidade,
                    inscricao.igreja,
                    inscricao.tamanhoCamisa,
                    inscricao.observacoes,
                    inscricao.valor,
                    inscricao.status,
                    inscricao.dataCriacao,
                    inscricao.dataAtualizacao,
                    inscricao.usuario == null ? null : inscricao.usuario.id,
                    inscricao.usuario == null ? null : inscricao.usuario.name
            );
        }
    }
}
