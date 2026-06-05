package org.vindesertao.analytics;

import java.util.List;

public class AnalyticsDtos {
    public record CountItem(String label, long total) {
    }

    public record TeamReportItem(
            Long teamId,
            String teamName,
            long totalVisits,
            long wantsVisitsYes,
            long wantsVisitsNo
    ) {
    }

    public record DashboardResponse(
            long totalVisits,
            long wantsVisitsYes,
            long wantsVisitsNo,
            List<CountItem> byProjectist,
            List<CountItem> byTeam,
            List<CountItem> byNeighborhood,
            List<CountItem> byPeriod,
            List<TeamReportItem> teamReports
    ) {
    }
}
