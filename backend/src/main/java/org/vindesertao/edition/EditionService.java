package org.vindesertao.edition;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import org.vindesertao.auth.CurrentUser;
import org.vindesertao.team.Team;
import org.vindesertao.team.TeamRepository;
import org.vindesertao.user.AppUser;
import org.vindesertao.user.UserRepository;

import java.time.OffsetDateTime;
import java.util.List;

@ApplicationScoped
public class EditionService {
    @Inject EditionRepository editions;
    @Inject EditionAccessRepository access;
    @Inject UserRepository users;
    @Inject TeamRepository teams;
    @Inject CurrentUser currentUser;

    public List<Edition> list() { requireAdmin(); return editions.find("order by year desc, id desc").list(); }
    public Edition active() {
        Edition edition = editions.active().orElseThrow(() -> new NotFoundException("Nenhuma edicao ativa configurada."));
        if (!currentUser.isAdmin()) requireOperationalAccess(currentUser.entity(), edition);
        return edition;
    }

    @Transactional
    public Edition create(EditionDtos.EditionRequest request) {
        requireAdmin();
        if (request.year() == null || request.name() == null || request.name().isBlank() || request.locality() == null || request.locality().isBlank())
            throw new IllegalArgumentException("Ano, nome e localidade sao obrigatorios.");
        Edition edition = new Edition(); edition.year = request.year(); edition.name = request.name().trim(); edition.locality = request.locality().trim();
        edition.startsOn = request.startsOn(); edition.endsOn = request.endsOn(); editions.persist(edition);
        editions.active().ifPresent(source -> teams.find("edition.id = ?1 order by name", source.id).list().forEach(existing -> {
            Team copy = new Team(); copy.edition = edition; copy.name = existing.name; copy.teamType = existing.teamType; copy.canRegisterVisits = existing.canRegisterVisits; teams.persist(copy);
        }));
        return edition;
    }

    @Transactional
    public Edition changeStatus(Long id, EditionStatus status) {
        requireAdmin(); Edition edition = find(id);
        if (status == EditionStatus.ACTIVE && editions.active().filter(other -> !other.id.equals(id)).isPresent())
            throw new IllegalStateException("Encerre a edicao ativa antes de ativar outra.");
        if (edition.status == EditionStatus.CLOSED && status != EditionStatus.ACTIVE)
            throw new IllegalStateException("Uma edicao encerrada so pode ser reaberta como ativa pelo administrador.");
        edition.status = status; edition.updatedAt = OffsetDateTime.now(); return edition;
    }

    @Transactional
    public EditionDtos.AccessResponse grantAccess(Long editionId, EditionDtos.AccessRequest request) {
        requireAdmin(); Edition edition = find(editionId);
        AppUser user = users.findByIdOptional(request.userId()).orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        Team team = request.teamId() == null ? null : teams.findByIdOptional(request.teamId()).orElseThrow(() -> new NotFoundException("Equipe nao encontrada."));
        EditionAccess item = access.find("edition.id = ?1 and user.id = ?2", editionId, user.id).firstResult();
        if (item == null) { item = new EditionAccess(); item.edition = edition; item.user = user; access.persist(item); }
        item.team = team;
        return new EditionDtos.AccessResponse(user.id, user.name, team == null ? null : team.id, team == null ? null : team.name);
    }

    public void requireOperationalAccess(AppUser user, Edition edition) {
        if (user.hasRole("admin")) return;
        if (edition.status != EditionStatus.ACTIVE || access.find("edition.id = ?1 and user.id = ?2", edition.id, user.id).firstResult() == null)
            throw new ForbiddenException("Voce nao esta autorizado nesta edicao ativa.");
    }

    public Edition find(Long id) { return editions.findByIdOptional(id).orElseThrow(() -> new NotFoundException("Edicao nao encontrada.")); }
    public Team teamFor(AppUser user, Edition edition) {
        return access.find("edition.id = ?1 and user.id = ?2", edition.id, user.id).firstResultOptional().map(item -> item.team).orElse(null);
    }
    private void requireAdmin() { if (!currentUser.isAdmin()) throw new ForbiddenException("Somente administradores podem gerenciar edicoes."); }
}
