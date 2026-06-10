package org.vindesertao.inscricao;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.vindesertao.user.AppUser;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inscricoes")
public class Inscricao extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @NotBlank
    @Column(nullable = false, length = 160)
    public String nome;

    @Email
    @NotBlank
    @Column(nullable = false, length = 180)
    public String email;

    @Column(length = 40)
    public String telefone;

    @Column(length = 120)
    public String cidade;

    @Column(length = 160)
    public String igreja;

    @Column(name = "tamanho_camisa", length = 20)
    public String tamanhoCamisa;

    @Column(columnDefinition = "TEXT")
    public String observacoes;

    @NotNull
    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal valor = BigDecimal.ZERO;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    public StatusInscricao status = StatusInscricao.RASCUNHO;

    @Column(name = "data_criacao", nullable = false)
    public OffsetDateTime dataCriacao = OffsetDateTime.now();

    @Column(name = "data_atualizacao")
    public OffsetDateTime dataAtualizacao;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    public AppUser usuario;
}
