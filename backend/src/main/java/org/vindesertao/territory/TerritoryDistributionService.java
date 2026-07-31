package org.vindesertao.territory;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.vindesertao.audit.AuditService;
import org.vindesertao.auth.CurrentUser;
import org.vindesertao.team.Team;
import org.vindesertao.team.TeamRepository;
import org.vindesertao.visit.HouseholdVisit;
import org.vindesertao.visit.VisitRepository;

import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.function.ToDoubleFunction;
import java.util.stream.Collectors;

@ApplicationScoped
public class TerritoryDistributionService {
    private static final String[] COLORS = {
            "#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#ca8a04", "#db2777",
            "#4f46e5", "#059669", "#7c3aed", "#c2410c", "#0f766e", "#be123c", "#4338ca", "#15803d"
    };

    @Inject VisitRepository visits;
    @Inject TeamRepository teams;
    @Inject TerritoryRepository territories;
    @Inject TerritoryDistributionDraftRepository drafts;
    @Inject CurrentUser currentUser;
    @Inject ObjectMapper objectMapper;
    @Inject AuditService auditService;

    @Transactional
    public TerritoryDtos.DistributionPlan generateDraft(TerritoryDtos.DistributionRequest request) {
        List<Team> selectedTeams = selectedTeams(request.teamIds());
        List<HouseholdVisit> allVisits = visits.find("order by id").list();
        if (allVisits.isEmpty()) {
            throw new IllegalArgumentException("Nao ha casas cadastradas para distribuir.");
        }
        long located = allVisits.stream().filter(this::located).count();
        if (located < selectedTeams.size()) {
            throw new IllegalArgumentException("Sao necessarias ao menos " + selectedTeams.size() + " casas com localizacao para formar territorios continuos.");
        }

        TerritoryDtos.DistributionPlan generated = buildPlan(selectedTeams, allVisits,
                request.visitAssignments() == null ? Map.of() : request.visitAssignments());
        TerritoryDistributionDraft draft = drafts.find("createdBy.id", currentUser.entity().id).firstResult();
        if (draft == null) {
            draft = new TerritoryDistributionDraft();
            draft.createdBy = currentUser.entity();
            draft.requestedTeamCount = selectedTeams.size();
            draft.payloadJson = "{}";
            drafts.persist(draft);
            drafts.flush();
        }
        TerritoryDtos.DistributionPlan plan = withDraftId(generated, draft.id);
        draft.requestedTeamCount = selectedTeams.size();
        draft.payloadJson = json(plan);
        draft.updatedAt = OffsetDateTime.now();
        return plan;
    }

    public TerritoryDtos.DistributionPlan currentDraft() {
        TerritoryDistributionDraft draft = drafts.find("createdBy.id", currentUser.entity().id).firstResult();
        if (draft == null) return null;
        try {
            return objectMapper.readValue(draft.payloadJson, TerritoryDtos.DistributionPlan.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("O rascunho salvo nao pode ser lido.", exception);
        }
    }

    @Transactional
    public void discardDraft() {
        drafts.delete("createdBy.id", currentUser.entity().id);
    }

    @Transactional
    public void publishDraft() {
        TerritoryDistributionDraft draft = drafts.find("createdBy.id", currentUser.entity().id).firstResult();
        if (draft == null) throw new NotFoundException("Nenhum rascunho de distribuicao foi salvo.");
        TerritoryDtos.DistributionPlan plan = currentDraft();
        List<HouseholdVisit> allVisits = visits.find("order by id").list();
        Map<Long, HouseholdVisit> byId = allVisits.stream().collect(Collectors.toMap(item -> item.id, item -> item));
        Set<Long> assigned = new HashSet<>();
        Map<Long, Team> selectedTeams = selectedTeams(plan.areas().stream().map(TerritoryDtos.DistributionArea::teamId).toList())
                .stream().collect(Collectors.toMap(item -> item.id, item -> item));

        for (TerritoryDtos.DistributionArea area : plan.areas()) {
            Team team = selectedTeams.get(area.teamId());
            for (TerritoryDtos.DistributionHouse house : area.houses()) {
                HouseholdVisit visit = byId.get(house.visitId());
                if (visit == null || !assigned.add(house.visitId())) {
                    throw new IllegalArgumentException("O rascunho ficou desatualizado. Refaca a distribuicao antes de publicar.");
                }
                visit.team = team;
                visit.updatedAt = OffsetDateTime.now();
                visit.updatedBy = currentUser.entity().email;
            }
        }
        if (assigned.size() != allVisits.size()) {
            throw new IllegalArgumentException("Ha novas casas fora do rascunho. Refaca a distribuicao antes de publicar.");
        }

        territories.delete("generated = true");
        OffsetDateTime publishedAt = OffsetDateTime.now();
        for (TerritoryDtos.DistributionArea area : plan.areas()) {
            Territory territory = new Territory();
            territory.name = "Territorio " + area.teamName();
            territory.team = selectedTeams.get(area.teamId());
            territory.color = area.color();
            territory.polygonGeoJson = area.polygonGeoJson();
            territory.active = true;
            territory.enforceForProjectists = true;
            territory.generated = true;
            territory.distributionVersion = plan.version();
            territory.publishedAt = publishedAt;
            territory.createdAt = publishedAt;
            territories.persist(territory);
        }
        auditService.log("PUBLISH", "TERRITORY_DISTRIBUTION", null, null,
                "{\"version\":\"" + plan.version() + "\",\"teams\":" + plan.areas().size() + ",\"houses\":" + plan.totalHouses() + "}");
        drafts.delete(draft);
    }

    private TerritoryDtos.DistributionPlan buildPlan(List<Team> selectedTeams, List<HouseholdVisit> allVisits,
                                                       Map<Long, Long> overrides) {
        List<HouseGroup> groups = grouped(allVisits);
        int target = Math.max(1, (int) Math.ceil((double) allVisits.size() / selectedTeams.size()));
        groups = splitHeavyGroups(groups, target);
        while (groups.stream().filter(HouseGroup::hasLocation).count() < selectedTeams.size()) {
            HouseGroup splittable = groups.stream().filter(item -> item.locatedCount() > 1)
                    .max(Comparator.comparingInt(HouseGroup::locatedCount)).orElseThrow();
            groups.remove(splittable);
            groups.addAll(split(splittable));
        }

        List<HouseGroup> spatial = groups.stream().filter(HouseGroup::hasLocation).collect(Collectors.toCollection(ArrayList::new));
        List<HouseGroup> unlocated = groups.stream().filter(item -> !item.hasLocation()).toList();
        Bounds root = bounds(spatial);
        Map<Long, AreaBuild> areas = new LinkedHashMap<>();
        partition(spatial, selectedTeams, root, areas);
        for (HouseGroup group : unlocated) lightest(areas.values()).groups.add(group);

        Map<Long, AreaBuild> visitArea = new HashMap<>();
        areas.values().forEach(area -> area.groups.forEach(group -> group.visits.forEach(visit -> visitArea.put(visit.id, area))));
        for (Map.Entry<Long, Long> override : overrides.entrySet()) {
            AreaBuild source = visitArea.get(override.getKey());
            AreaBuild targetArea = areas.get(override.getValue());
            HouseholdVisit visit = allVisits.stream().filter(item -> item.id.equals(override.getKey())).findFirst().orElse(null);
            if (source == null || targetArea == null || visit == null || source == targetArea) continue;
            source.remove(visit);
            targetArea.groups.add(HouseGroup.single(visit));
            visitArea.put(visit.id, targetArea);
        }

        List<TerritoryDtos.DistributionArea> responseAreas = new ArrayList<>();
        long min = Long.MAX_VALUE, max = 0;
        int colorIndex = 0;
        for (AreaBuild area : areas.values()) {
            List<HouseholdVisit> areaVisits = area.visits();
            long locatedCount = areaVisits.stream().filter(this::located).count();
            long covered = areaVisits.stream().filter(this::located)
                    .filter(visit -> area.bounds.contains(visit.latitude, visit.longitude)).count();
            String coverage = locatedCount == 0 ? "SEM_COORDENADAS" : covered == locatedCount ? "COMPLETA" : "PARCIAL";
            List<TerritoryDtos.DistributionHouse> houses = areaVisits.stream().map(visit -> new TerritoryDtos.DistributionHouse(
                    visit.id, visit.personName, visit.street, visit.number, visit.neighborhood,
                    visit.latitude, visit.longitude, area.team.id)).toList();
            responseAreas.add(new TerritoryDtos.DistributionArea(area.team.id, area.team.name, COLORS[colorIndex++ % COLORS.length],
                    area.bounds.geoJson(), areaVisits.size(), locatedCount, coverage, houses));
            min = Math.min(min, areaVisits.size());
            max = Math.max(max, areaVisits.size());
        }
        long located = allVisits.stream().filter(this::located).count();
        long tolerance = Math.max(2, Math.round((double) allVisits.size() / selectedTeams.size() * 0.20));
        return new TerritoryDtos.DistributionPlan(null, UUID.randomUUID().toString(), OffsetDateTime.now(), selectedTeams.size(),
                allVisits.size(), located, allVisits.size() - located, min == Long.MAX_VALUE ? 0 : min, max,
                max - (min == Long.MAX_VALUE ? 0 : min) > tolerance, responseAreas);
    }

    private void partition(List<HouseGroup> groups, List<Team> selectedTeams, Bounds cell, Map<Long, AreaBuild> result) {
        if (selectedTeams.size() == 1) {
            Team team = selectedTeams.get(0);
            result.put(team.id, new AreaBuild(team, cell, new ArrayList<>(groups)));
            return;
        }
        int leftSlots = selectedTeams.size() / 2;
        SplitChoice choice = bestSplit(groups, selectedTeams.size(), leftSlots);
        ToDoubleFunction<HouseGroup> coordinate = choice.longitudeAxis ? HouseGroup::longitude : HouseGroup::latitude;
        groups.sort(Comparator.comparingDouble(coordinate));
        List<HouseGroup> left = new ArrayList<>(groups.subList(0, choice.index));
        List<HouseGroup> right = new ArrayList<>(groups.subList(choice.index, groups.size()));
        Bounds[] split = cell.split(choice.longitudeAxis, choice.divider);
        partition(left, new ArrayList<>(selectedTeams.subList(0, leftSlots)), split[0], result);
        partition(right, new ArrayList<>(selectedTeams.subList(leftSlots, selectedTeams.size())), split[1], result);
    }

    private SplitChoice bestSplit(List<HouseGroup> groups, int teamSlots, int leftSlots) {
        int totalWeight = groups.stream().mapToInt(HouseGroup::size).sum();
        double target = (double) totalWeight * leftSlots / teamSlots;
        int minimumLeft = leftSlots;
        int maximumLeft = groups.size() - (teamSlots - leftSlots);
        SplitChoice best = null;
        for (boolean longitudeAxis : List.of(false, true)) {
            ToDoubleFunction<HouseGroup> center = longitudeAxis ? HouseGroup::longitude : HouseGroup::latitude;
            List<HouseGroup> ordered = groups.stream().sorted(Comparator.comparingDouble(center)).toList();
            int weight = 0;
            for (int index = 1; index < ordered.size(); index++) {
                weight += ordered.get(index - 1).size();
                if (index < minimumLeft || index > maximumLeft) continue;
                double leftMaximum = ordered.subList(0, index).stream()
                        .mapToDouble(item -> longitudeAxis ? item.maximumLongitude() : item.maximumLatitude()).max().orElseThrow();
                double rightMinimum = ordered.subList(index, ordered.size()).stream()
                        .mapToDouble(item -> longitudeAxis ? item.minimumLongitude() : item.minimumLatitude()).min().orElseThrow();
                if (leftMaximum > rightMinimum) continue;
                double difference = Math.abs(weight - target);
                if (best == null || difference < best.difference) {
                    best = new SplitChoice(longitudeAxis, index, (leftMaximum + rightMinimum) / 2, difference);
                }
            }
        }
        if (best != null) return best;

        boolean longitudeAxis = spread(groups, HouseGroup::longitude) >= spread(groups, HouseGroup::latitude);
        ToDoubleFunction<HouseGroup> coordinate = longitudeAxis ? HouseGroup::longitude : HouseGroup::latitude;
        List<HouseGroup> ordered = groups.stream().sorted(Comparator.comparingDouble(coordinate)).toList();
        int bestIndex = minimumLeft;
        int weight = 0;
        double difference = Double.MAX_VALUE;
        for (int index = 1; index < ordered.size(); index++) {
            weight += ordered.get(index - 1).size();
            if (index < minimumLeft || index > maximumLeft) continue;
            double candidate = Math.abs(weight - target);
            if (candidate < difference) { difference = candidate; bestIndex = index; }
        }
        double divider = (coordinate.applyAsDouble(ordered.get(bestIndex - 1)) + coordinate.applyAsDouble(ordered.get(bestIndex))) / 2;
        return new SplitChoice(longitudeAxis, bestIndex, divider, difference);
    }

    private List<HouseGroup> grouped(List<HouseholdVisit> allVisits) {
        Map<String, HouseGroup> grouped = new LinkedHashMap<>();
        for (HouseholdVisit visit : allVisits) {
            String street = normalized(visit.street);
            String key = street.isBlank() ? "visit:" + visit.id
                    : normalized(visit.city) + "|" + normalized(visit.neighborhood) + "|" + street;
            grouped.computeIfAbsent(key, ignored -> new HouseGroup(key, new ArrayList<>())).visits.add(visit);
        }
        return new ArrayList<>(grouped.values());
    }

    private List<HouseGroup> splitHeavyGroups(List<HouseGroup> groups, int target) {
        List<HouseGroup> result = new ArrayList<>();
        for (HouseGroup group : groups) {
            List<HouseGroup> pending = new ArrayList<>(List.of(group));
            while (pending.stream().anyMatch(item -> item.size() > Math.max(2, Math.ceil(target * 1.5)) && item.locatedCount() > 1)) {
                HouseGroup item = pending.stream().filter(value -> value.size() > Math.max(2, Math.ceil(target * 1.5)) && value.locatedCount() > 1).findFirst().orElseThrow();
                pending.remove(item);
                pending.addAll(split(item));
            }
            result.addAll(pending);
        }
        return result;
    }

    private List<HouseGroup> split(HouseGroup group) {
        List<HouseholdVisit> ordered = new ArrayList<>(group.visits);
        ordered.sort(Comparator.comparing((HouseholdVisit item) -> !located(item))
                .thenComparing(item -> item.latitude == null ? Double.MAX_VALUE : item.latitude)
                .thenComparing(item -> item.longitude == null ? Double.MAX_VALUE : item.longitude));
        int locatedCount = group.locatedCount();
        int cut = Math.max(1, locatedCount / 2);
        List<HouseholdVisit> left = new ArrayList<>(ordered.subList(0, cut));
        List<HouseholdVisit> right = new ArrayList<>(ordered.subList(cut, locatedCount));
        for (int index = locatedCount; index < ordered.size(); index++) {
            (left.size() <= right.size() ? left : right).add(ordered.get(index));
        }
        return List.of(new HouseGroup(group.key + ":a", left), new HouseGroup(group.key + ":b", right));
    }

    private List<Team> selectedTeams(List<Long> ids) {
        if (ids == null || ids.isEmpty() || ids.size() > 50) throw new IllegalArgumentException("Selecione entre 1 e 50 equipes.");
        List<Long> unique = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (unique.size() != ids.size()) throw new IllegalArgumentException("Nao repita equipes na distribuicao.");
        Map<Long, Team> found = teams.find("id in ?1 and canRegisterVisits = true", unique).list().stream()
                .collect(Collectors.toMap(item -> item.id, item -> item));
        if (found.size() != unique.size()) throw new IllegalArgumentException("Uma das equipes selecionadas nao registra visitas.");
        return unique.stream().map(found::get).toList();
    }

    private Bounds bounds(List<HouseGroup> groups) {
        double south = groups.stream().mapToDouble(HouseGroup::latitude).min().orElseThrow();
        double north = groups.stream().mapToDouble(HouseGroup::latitude).max().orElseThrow();
        double west = groups.stream().mapToDouble(HouseGroup::longitude).min().orElseThrow();
        double east = groups.stream().mapToDouble(HouseGroup::longitude).max().orElseThrow();
        double latMargin = Math.max(0.00035, (north - south) * 0.04);
        double lonMargin = Math.max(0.00035, (east - west) * 0.04);
        return new Bounds(south - latMargin, west - lonMargin, north + latMargin, east + lonMargin);
    }

    private double spread(List<HouseGroup> groups, ToDoubleFunction<HouseGroup> getter) {
        double min = groups.stream().mapToDouble(getter).min().orElse(0);
        double max = groups.stream().mapToDouble(getter).max().orElse(0);
        return max - min;
    }

    private AreaBuild lightest(Collection<AreaBuild> values) {
        return values.stream().min(Comparator.comparingInt(item -> item.visits().size())).orElseThrow();
    }

    private boolean located(HouseholdVisit visit) {
        return visit.latitude != null && visit.longitude != null && Double.isFinite(visit.latitude) && Double.isFinite(visit.longitude)
                && !(visit.latitude == 0 && visit.longitude == 0);
    }

    private String normalized(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replaceAll("\\s+", " ");
    }

    private String json(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Nao foi possivel salvar o rascunho.", exception); }
    }

    private TerritoryDtos.DistributionPlan withDraftId(TerritoryDtos.DistributionPlan plan, Long id) {
        return new TerritoryDtos.DistributionPlan(id, plan.version(), plan.generatedAt(), plan.requestedTeamCount(), plan.totalHouses(),
                plan.locatedHouses(), plan.unlocatedHouses(), plan.minimumHouses(), plan.maximumHouses(), plan.imbalanced(), plan.areas());
    }

    private static final class HouseGroup {
        final String key;
        final List<HouseholdVisit> visits;
        HouseGroup(String key, List<HouseholdVisit> visits) { this.key = key; this.visits = visits; }
        static HouseGroup single(HouseholdVisit visit) { return new HouseGroup("visit:" + visit.id, new ArrayList<>(List.of(visit))); }
        int size() { return visits.size(); }
        int locatedCount() { return (int) visits.stream().filter(item -> item.latitude != null && item.longitude != null
                && Double.isFinite(item.latitude) && Double.isFinite(item.longitude) && !(item.latitude == 0 && item.longitude == 0)).count(); }
        boolean hasLocation() { return locatedCount() > 0; }
        double latitude() { return visits.stream().filter(item -> item.latitude != null && item.longitude != null
                && Double.isFinite(item.latitude) && Double.isFinite(item.longitude) && !(item.latitude == 0 && item.longitude == 0))
                .mapToDouble(item -> item.latitude).average().orElse(0); }
        double longitude() { return visits.stream().filter(item -> item.latitude != null && item.longitude != null
                && Double.isFinite(item.latitude) && Double.isFinite(item.longitude) && !(item.latitude == 0 && item.longitude == 0))
                .mapToDouble(item -> item.longitude).average().orElse(0); }
        double minimumLatitude() { return visits.stream().filter(item -> item.latitude != null && item.longitude != null).mapToDouble(item -> item.latitude).min().orElse(0); }
        double maximumLatitude() { return visits.stream().filter(item -> item.latitude != null && item.longitude != null).mapToDouble(item -> item.latitude).max().orElse(0); }
        double minimumLongitude() { return visits.stream().filter(item -> item.latitude != null && item.longitude != null).mapToDouble(item -> item.longitude).min().orElse(0); }
        double maximumLongitude() { return visits.stream().filter(item -> item.latitude != null && item.longitude != null).mapToDouble(item -> item.longitude).max().orElse(0); }
    }

    private static final class AreaBuild {
        final Team team;
        final Bounds bounds;
        final List<HouseGroup> groups;
        AreaBuild(Team team, Bounds bounds, List<HouseGroup> groups) { this.team = team; this.bounds = bounds; this.groups = groups; }
        List<HouseholdVisit> visits() { return groups.stream().flatMap(group -> group.visits.stream()).toList(); }
        void remove(HouseholdVisit visit) {
            groups.forEach(group -> group.visits.removeIf(item -> item.id.equals(visit.id)));
            groups.removeIf(group -> group.visits.isEmpty());
        }
    }

    private record Bounds(double south, double west, double north, double east) {
        Bounds[] split(boolean longitudeAxis, double divider) {
            if (longitudeAxis) {
                double value = Math.max(west, Math.min(east, divider));
                return new Bounds[]{new Bounds(south, west, north, value), new Bounds(south, value, north, east)};
            }
            double value = Math.max(south, Math.min(north, divider));
            return new Bounds[]{new Bounds(south, west, value, east), new Bounds(value, west, north, east)};
        }
        boolean contains(double latitude, double longitude) {
            return latitude >= south && latitude <= north && longitude >= west && longitude <= east;
        }
        String geoJson() {
            return "{\"type\":\"Polygon\",\"coordinates\":[[[" + west + "," + south + "],[" + east + "," + south
                    + "],[" + east + "," + north + "],[" + west + "," + north + "],[" + west + "," + south + "]]]}";
        }
    }

    private record SplitChoice(boolean longitudeAxis, int index, double divider, double difference) {}
}
