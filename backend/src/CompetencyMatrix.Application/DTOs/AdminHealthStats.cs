namespace CompetencyMatrix.Application.DTOs;

public record AdminHealthStats(
    long CompaniesTotal,
    long CompaniesActive,
    long UsersTotal,
    long UsersEmailVerified,
    long TeamsTotal,
    long RolesTotal,
    long GradesTotal,
    long CategoriesTotal,
    long SkillsTotal,
    long SkillAssessmentsTotal,
    long AuditLogsTotal,
    long EmailLogsTotal
);

