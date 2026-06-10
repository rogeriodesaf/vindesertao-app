package org.vindesertao.inscricao;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Parameters;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.vindesertao.audit.AuditService;
import org.vindesertao.user.AppUser;
import org.vindesertao.user.UserRepository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class InscricaoService {
    @Inject
    InscricaoRepository inscricoes;

    @Inject
    UserRepository users;

    @Inject
    AuditService auditService;

    @Transactional
    public Inscricao create(InscricaoDtos.InscricaoRequest request) {
        Inscricao inscricao = new Inscricao();
        apply(request, inscricao);
        inscricao.status = request.status() == null ? StatusInscricao.RASCUNHO : request.status();
        inscricao.dataCriacao = OffsetDateTime.now();
        inscricoes.persist(inscricao);
        auditService.log("CREATE", "INSCRICAO", inscricao.id, null, snapshot(inscricao));
        return inscricao;
    }

    @Transactional
    public Inscricao update(Long id, InscricaoDtos.InscricaoRequest request) {
        Inscricao inscricao = get(id);
        String before = snapshot(inscricao);
        apply(request, inscricao);
        if (request.status() != null) {
            inscricao.status = request.status();
        }
        inscricao.dataAtualizacao = OffsetDateTime.now();
        auditService.log("UPDATE", "INSCRICAO", inscricao.id, before, snapshot(inscricao));
        return inscricao;
    }

    @Transactional
    public Inscricao updateStatus(Long id, InscricaoDtos.StatusInscricaoRequest request) {
        Inscricao inscricao = get(id);
        String before = snapshot(inscricao);
        inscricao.status = request.status();
        inscricao.dataAtualizacao = OffsetDateTime.now();
        auditService.log("UPDATE", "INSCRICAO", inscricao.id, before, snapshot(inscricao));
        return inscricao;
    }

    public Inscricao get(Long id) {
        return inscricoes.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Inscricao nao encontrada."));
    }

    public PanacheQuery<Inscricao> filtered(StatusInscricao status, String nome, String email, String cidade) {
        List<String> where = new ArrayList<>();
        Parameters params = new Parameters();

        if (status != null) {
            where.add("status = :status");
            params.and("status", status);
        }
        if (nome != null && !nome.isBlank()) {
            where.add("lower(nome) like :nome");
            params.and("nome", "%" + nome.toLowerCase() + "%");
        }
        if (email != null && !email.isBlank()) {
            where.add("lower(email) like :email");
            params.and("email", "%" + email.toLowerCase() + "%");
        }
        if (cidade != null && !cidade.isBlank()) {
            where.add("lower(cidade) like :cidade");
            params.and("cidade", "%" + cidade.toLowerCase() + "%");
        }

        String query = where.isEmpty() ? "order by dataCriacao desc" : String.join(" and ", where) + " order by dataCriacao desc";
        Map<String, Object> map = params.map();
        return map.isEmpty() ? inscricoes.find(query) : inscricoes.find(query, map);
    }

    private void apply(InscricaoDtos.InscricaoRequest request, Inscricao inscricao) {
        inscricao.nome = request.nome();
        inscricao.email = request.email().trim().toLowerCase();
        inscricao.telefone = request.telefone();
        inscricao.cidade = request.cidade();
        inscricao.igreja = request.igreja();
        inscricao.tamanhoCamisa = request.tamanhoCamisa();
        inscricao.observacoes = request.observacoes();
        inscricao.valor = request.valor() == null ? BigDecimal.ZERO : request.valor();
        inscricao.usuario = findUser(request.usuarioId());
    }

    private AppUser findUser(Long usuarioId) {
        if (usuarioId == null) {
            return null;
        }
        return users.findByIdOptional(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario vinculado a inscricao nao encontrado."));
    }

    private String snapshot(Inscricao inscricao) {
        return "{\"nome\":\"" + safe(inscricao.nome)
                + "\",\"email\":\"" + safe(inscricao.email)
                + "\",\"cidade\":\"" + safe(inscricao.cidade)
                + "\",\"igreja\":\"" + safe(inscricao.igreja)
                + "\",\"tamanhoCamisa\":\"" + safe(inscricao.tamanhoCamisa)
                + "\",\"valor\":\"" + safe(String.valueOf(inscricao.valor))
                + "\",\"status\":\"" + safe(String.valueOf(inscricao.status))
                + "\",\"usuario\":\"" + safe(inscricao.usuario == null ? null : inscricao.usuario.email) + "\"}";
    }

    private String safe(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
