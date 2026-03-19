namespace CompetencyMatrix.Application.DTOs;

public record DashboardGapSummary(
    int Total,
    int Ok,
    int Gap1,
    int Gap2Plus,
    int AdherencePct,
    decimal AvgGap
);

public record DashboardCriticalSkill(
    int SkillId,
    string SkillName,
    string CategoryName,
    int CriticalCount,
    decimal AvgCriticalGap,
    int CategoryTotalPairs,
    int CategoryCriticalCount
);

public record DashboardCriticalPerson(
    Guid UserId,
    string Name,
    string? RoleName,
    int Total,
    int Gap2Plus,
    int AdherencePct,
    decimal AvgGap
);

public record DashboardTeamSummary(
    int TeamId,
    string TeamName,
    int Total,
    int Gap2Plus,
    int AdherencePct,
    decimal AvgGap
);

public record ManagerTeamDashboard(
    int TeamId,
    string TeamName,
    DashboardGapSummary Summary,
    IReadOnlyList<DashboardCriticalSkill> CriticalSkills
);

public record ManagerCompanyDashboard(
    int CompanyId,
    string CompanyName,
    DashboardGapSummary Summary,
    IReadOnlyList<DashboardTeamSummary> TopCriticalTeams,
    IReadOnlyList<DashboardCriticalSkill> TopCriticalSkills,
    IReadOnlyList<ManagerTeamDashboard> Teams
);

public record CoordinatorTeamDashboard(
    int TeamId,
    string TeamName,
    string? CompanyName,
    DashboardGapSummary Summary,
    IReadOnlyList<DashboardCriticalSkill> CriticalSkills,
    IReadOnlyList<DashboardCriticalPerson> CriticalPeople
);

public record CoordinatorTeamsDashboard(
    IReadOnlyList<CoordinatorTeamDashboard> Teams
);

