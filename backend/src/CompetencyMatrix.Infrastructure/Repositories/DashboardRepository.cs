using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using Dapper;

namespace CompetencyMatrix.Infrastructure.Repositories;

public class DashboardRepository : IDashboardRepository
{
    private readonly Data.DapperContext _ctx;

    public DashboardRepository(Data.DapperContext ctx) => _ctx = ctx;

    public async Task<AdminHealthStats> GetAdminHealthAsync()
    {
        using var conn = _ctx.CreateConnection();

        const string sql = @"
            SELECT
                (SELECT COUNT(*) FROM companies)                          AS CompaniesTotal,
                (SELECT COUNT(*) FROM companies WHERE is_active = true)   AS CompaniesActive,
                (SELECT COUNT(*) FROM users)                              AS UsersTotal,
                (SELECT COUNT(*) FROM users WHERE is_email_verified = true) AS UsersEmailVerified,
                (SELECT COUNT(*) FROM teams)                              AS TeamsTotal,
                (SELECT COUNT(*) FROM roles)                              AS RolesTotal,
                (SELECT COUNT(*) FROM grades)                             AS GradesTotal,
                (SELECT COUNT(*) FROM categories)                         AS CategoriesTotal,
                (SELECT COUNT(*) FROM skills)                             AS SkillsTotal,
                (SELECT COUNT(*) FROM skill_assessments)                  AS SkillAssessmentsTotal,
                (SELECT COUNT(*) FROM audit_logs)                         AS AuditLogsTotal,
                (SELECT COUNT(*) FROM email_logs)                         AS EmailLogsTotal
        ";

        return await conn.QuerySingleAsync<AdminHealthStats>(sql);
    }

    public async Task<ManagerCompanyDashboard> GetManagerCompanyDashboardAsync(int companyId, int topTeams = 5, int topSkills = 5, int topSkillsPerTeam = 5)
    {
        using var conn = _ctx.CreateConnection();

        const string companySql = "SELECT id AS CompanyId, name AS CompanyName FROM companies WHERE id = @companyId";
        var company = await conn.QueryFirstOrDefaultAsync<(int CompanyId, string CompanyName)>(companySql, new { companyId });
        if (company == default)
            throw new KeyNotFoundException($"Empresa {companyId} não encontrada.");

        // Sempre listar todos os times da empresa, mesmo sem dados para métricas ainda.
        const string summaryByTeamSql = @"
            WITH teamsList AS (
                SELECT t.id AS TeamId, t.name AS TeamName
                FROM teams t
                WHERE t.company_id = @companyId
            ),
            base AS (
                SELECT
                    t.id AS TeamId,
                    se.expected_level AS ExpectedLevel,
                    COALESCE(sa.current_level, 'DESCONHECE') AS CurrentLevel
                FROM teams t
                LEFT JOIN team_members tm ON tm.team_id = t.id
                LEFT JOIN users u ON u.id = tm.user_id
                LEFT JOIN team_competencies tc ON tc.team_id = t.id
                LEFT JOIN skill_expectations se
                    ON se.skill_id = tc.skill_id
                    AND se.role_id = u.role_id
                    AND se.grade_id = u.grade_id
                LEFT JOIN skill_assessments sa ON sa.user_id = u.id AND sa.skill_id = se.skill_id
                WHERE t.company_id = @companyId
                  AND u.role_id IS NOT NULL
                  AND u.grade_id IS NOT NULL
                  AND se.skill_id IS NOT NULL
            ),
            gaps AS (
                SELECT
                    TeamId,
                    (
                        CASE ExpectedLevel
                            WHEN 'DESCONHECE' THEN 0
                            WHEN 'BRONZE' THEN 1
                            WHEN 'PRATA' THEN 2
                            WHEN 'OURO' THEN 3
                            ELSE 0
                        END
                        -
                        CASE CurrentLevel
                            WHEN 'DESCONHECE' THEN 0
                            WHEN 'BRONZE' THEN 1
                            WHEN 'PRATA' THEN 2
                            WHEN 'OURO' THEN 3
                            ELSE 0
                        END
                    ) AS Gap
                FROM base
            ),
            agg AS (
                SELECT
                    TeamId,
                    COUNT(*)::int AS Total,
                    SUM(CASE WHEN Gap <= 0 THEN 1 ELSE 0 END)::int AS Ok,
                    SUM(CASE WHEN Gap = 1 THEN 1 ELSE 0 END)::int AS Gap1,
                    SUM(CASE WHEN Gap >= 2 THEN 1 ELSE 0 END)::int AS Gap2Plus,
                    COALESCE(ROUND(100.0 * SUM(CASE WHEN Gap <= 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0))::int, 0) AS AdherencePct,
                    COALESCE(AVG(GREATEST(Gap, 0))::numeric(10,2), 0) AS AvgGap
                FROM gaps
                GROUP BY TeamId
            )
            SELECT
                tl.TeamId,
                tl.TeamName,
                COALESCE(a.Total, 0) AS Total,
                COALESCE(a.Ok, 0) AS Ok,
                COALESCE(a.Gap1, 0) AS Gap1,
                COALESCE(a.Gap2Plus, 0) AS Gap2Plus,
                COALESCE(a.AdherencePct, 0) AS AdherencePct,
                COALESCE(a.AvgGap, 0) AS AvgGap
            FROM teamsList tl
            LEFT JOIN agg a ON a.TeamId = tl.TeamId
            ORDER BY tl.TeamName;
        ";

        var teamRows = (await conn.QueryAsync<(int TeamId, string TeamName, int Total, int Ok, int Gap1, int Gap2Plus, int AdherencePct, decimal AvgGap)>(
            summaryByTeamSql, new { companyId })).ToList();

        const string companySummarySql = @"
            WITH base AS (
                SELECT
                    se.expected_level AS ExpectedLevel,
                    COALESCE(sa.current_level, 'DESCONHECE') AS CurrentLevel
                FROM teams t
                LEFT JOIN team_members tm ON tm.team_id = t.id
                LEFT JOIN users u ON u.id = tm.user_id
                LEFT JOIN team_competencies tc ON tc.team_id = t.id
                LEFT JOIN skill_expectations se
                    ON se.skill_id = tc.skill_id
                    AND se.role_id = u.role_id
                    AND se.grade_id = u.grade_id
                LEFT JOIN skill_assessments sa ON sa.user_id = u.id AND sa.skill_id = se.skill_id
                WHERE t.company_id = @companyId
                  AND u.role_id IS NOT NULL
                  AND u.grade_id IS NOT NULL
                  AND se.skill_id IS NOT NULL
            ),
            gaps AS (
                SELECT
                    (
                        CASE ExpectedLevel
                            WHEN 'DESCONHECE' THEN 0
                            WHEN 'BRONZE' THEN 1
                            WHEN 'PRATA' THEN 2
                            WHEN 'OURO' THEN 3
                            ELSE 0
                        END
                        -
                        CASE CurrentLevel
                            WHEN 'DESCONHECE' THEN 0
                            WHEN 'BRONZE' THEN 1
                            WHEN 'PRATA' THEN 2
                            WHEN 'OURO' THEN 3
                            ELSE 0
                        END
                    ) AS Gap
                FROM base
            )
            SELECT
                COUNT(*)::int AS Total,
                SUM(CASE WHEN Gap <= 0 THEN 1 ELSE 0 END)::int AS Ok,
                SUM(CASE WHEN Gap = 1 THEN 1 ELSE 0 END)::int AS Gap1,
                SUM(CASE WHEN Gap >= 2 THEN 1 ELSE 0 END)::int AS Gap2Plus,
                COALESCE(ROUND(100.0 * SUM(CASE WHEN Gap <= 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0))::int, 0) AS AdherencePct,
                COALESCE(AVG(GREATEST(Gap, 0))::numeric(10,2), 0) AS AvgGap
            FROM gaps;
        ";

        var companySummaryRow = await conn.QuerySingleAsync<(int Total, int Ok, int Gap1, int Gap2Plus, int AdherencePct, decimal AvgGap)>(
            companySummarySql, new { companyId });

        var companySummary = new DashboardGapSummary(
            companySummaryRow.Total,
            companySummaryRow.Ok,
            companySummaryRow.Gap1,
            companySummaryRow.Gap2Plus,
            companySummaryRow.AdherencePct,
            companySummaryRow.AvgGap
        );

        var topCriticalTeams = teamRows
            .OrderBy(t => t.AdherencePct)
            .ThenByDescending(t => t.Gap2Plus)
            .ThenByDescending(t => t.AvgGap)
            .Take(Math.Max(1, topTeams))
            .Select(t => new DashboardTeamSummary(t.TeamId, t.TeamName, t.Total, t.Gap2Plus, t.AdherencePct, t.AvgGap))
            .ToList();

        const string topCriticalSkillsSql = @"
            WITH base AS (
                SELECT
                    se.expected_level AS ExpectedLevel,
                    COALESCE(sa.current_level, 'DESCONHECE') AS CurrentLevel,
                    s.id AS SkillId,
                    s.name AS SkillName,
                    c.name AS CategoryName
                FROM teams t
                LEFT JOIN team_members tm ON tm.team_id = t.id
                LEFT JOIN users u ON u.id = tm.user_id
                LEFT JOIN team_competencies tc ON tc.team_id = t.id
                LEFT JOIN skill_expectations se
                    ON se.skill_id = tc.skill_id
                    AND se.role_id = u.role_id
                    AND se.grade_id = u.grade_id
                LEFT JOIN skills s ON s.id = se.skill_id
                LEFT JOIN categories c ON c.id = s.category_id
                LEFT JOIN skill_assessments sa ON sa.user_id = u.id AND sa.skill_id = se.skill_id
                WHERE t.company_id = @companyId
                  AND u.role_id IS NOT NULL
                  AND u.grade_id IS NOT NULL
                  AND se.skill_id IS NOT NULL
            ),
            gaps AS (
                SELECT
                    SkillId,
                    SkillName,
                    CategoryName,
                    (
                        CASE ExpectedLevel
                            WHEN 'DESCONHECE' THEN 0
                            WHEN 'BRONZE' THEN 1
                            WHEN 'PRATA' THEN 2
                            WHEN 'OURO' THEN 3
                            ELSE 0
                        END
                        -
                        CASE CurrentLevel
                            WHEN 'DESCONHECE' THEN 0
                            WHEN 'BRONZE' THEN 1
                            WHEN 'PRATA' THEN 2
                            WHEN 'OURO' THEN 3
                            ELSE 0
                        END
                    ) AS Gap
                FROM base
            )
            , category_totals AS (
                SELECT
                    CategoryName,
                    COUNT(*)::int AS CategoryTotalPairs,
                    SUM(CASE WHEN Gap >= 2 THEN 1 ELSE 0 END)::int AS CategoryCriticalCount
                FROM gaps
                GROUP BY CategoryName
            )
            SELECT
                SkillId,
                SkillName,
                gaps.CategoryName,
                COUNT(*)::int AS CriticalCount,
                COALESCE(AVG(Gap)::numeric(10,2), 0) AS AvgCriticalGap,
                COALESCE(ct.CategoryTotalPairs, 0) AS CategoryTotalPairs,
                COALESCE(ct.CategoryCriticalCount, 0) AS CategoryCriticalCount
            FROM gaps
            JOIN category_totals ct ON ct.CategoryName = gaps.CategoryName
            WHERE Gap >= 2
            GROUP BY SkillId, SkillName, gaps.CategoryName, ct.CategoryTotalPairs, ct.CategoryCriticalCount
            ORDER BY CriticalCount DESC, AvgCriticalGap DESC
            LIMIT @topSkills;
        ";

        var topCriticalSkills = (await conn.QueryAsync<DashboardCriticalSkill>(
            topCriticalSkillsSql, new { companyId, topSkills = Math.Max(1, topSkills) })).ToList();

        const string criticalSkillsByTeamSql = @"
            WITH base AS (
                SELECT
                    t.id AS TeamId,
                    se.expected_level AS ExpectedLevel,
                    COALESCE(sa.current_level, 'DESCONHECE') AS CurrentLevel,
                    s.id AS SkillId,
                    s.name AS SkillName,
                    c.name AS CategoryName
                FROM teams t
                LEFT JOIN team_members tm ON tm.team_id = t.id
                LEFT JOIN users u ON u.id = tm.user_id
                LEFT JOIN team_competencies tc ON tc.team_id = t.id
                LEFT JOIN skill_expectations se
                    ON se.skill_id = tc.skill_id
                    AND se.role_id = u.role_id
                    AND se.grade_id = u.grade_id
                LEFT JOIN skills s ON s.id = se.skill_id
                LEFT JOIN categories c ON c.id = s.category_id
                LEFT JOIN skill_assessments sa ON sa.user_id = u.id AND sa.skill_id = se.skill_id
                WHERE t.company_id = @companyId
                  AND u.role_id IS NOT NULL
                  AND u.grade_id IS NOT NULL
                  AND se.skill_id IS NOT NULL
            ),
            gaps AS (
                SELECT
                    TeamId,
                    SkillId,
                    SkillName,
                    CategoryName,
                    (
                        CASE ExpectedLevel
                            WHEN 'DESCONHECE' THEN 0
                            WHEN 'BRONZE' THEN 1
                            WHEN 'PRATA' THEN 2
                            WHEN 'OURO' THEN 3
                            ELSE 0
                        END
                        -
                        CASE CurrentLevel
                            WHEN 'DESCONHECE' THEN 0
                            WHEN 'BRONZE' THEN 1
                            WHEN 'PRATA' THEN 2
                            WHEN 'OURO' THEN 3
                            ELSE 0
                        END
                    ) AS Gap
                FROM base
            ),
            category_totals AS (
                SELECT
                    TeamId,
                    CategoryName,
                    COUNT(*)::int AS CategoryTotalPairs,
                    SUM(CASE WHEN Gap >= 2 THEN 1 ELSE 0 END)::int AS CategoryCriticalCount
                FROM gaps
                GROUP BY TeamId, CategoryName
            ),
            critical AS (
                SELECT
                    TeamId,
                    SkillId,
                    SkillName,
                    CategoryName,
                    COUNT(*)::int AS CriticalCount,
                    COALESCE(AVG(Gap)::numeric(10,2), 0) AS AvgCriticalGap
                FROM gaps
                WHERE Gap >= 2
                GROUP BY TeamId, SkillId, SkillName, CategoryName
            ),
            ranked AS (
                SELECT
                    *,
                    ROW_NUMBER() OVER (PARTITION BY TeamId ORDER BY CriticalCount DESC, AvgCriticalGap DESC) AS Rn
                FROM critical
            )
            SELECT
                ranked.TeamId,
                ranked.SkillId,
                ranked.SkillName,
                ranked.CategoryName,
                ranked.CriticalCount,
                ranked.AvgCriticalGap,
                COALESCE(ct.CategoryTotalPairs, 0) AS CategoryTotalPairs,
                COALESCE(ct.CategoryCriticalCount, 0) AS CategoryCriticalCount
            FROM ranked
            LEFT JOIN category_totals ct
                ON ct.TeamId = ranked.TeamId
               AND ct.CategoryName = ranked.CategoryName
            WHERE Rn <= @topSkillsPerTeam
            ORDER BY TeamId, Rn;
        ";

        var criticalSkillsByTeam = (await conn.QueryAsync<(int TeamId, int SkillId, string SkillName, string CategoryName, int CriticalCount, decimal AvgCriticalGap, int CategoryTotalPairs, int CategoryCriticalCount)>(
            criticalSkillsByTeamSql,
            new { companyId, topSkillsPerTeam = Math.Max(1, topSkillsPerTeam) })).ToList();

        var criticalSkillsLookup = criticalSkillsByTeam
            .GroupBy(r => r.TeamId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<DashboardCriticalSkill>)g
                    .Select(r => new DashboardCriticalSkill(
                        r.SkillId,
                        r.SkillName,
                        r.CategoryName,
                        r.CriticalCount,
                        r.AvgCriticalGap,
                        r.CategoryTotalPairs,
                        r.CategoryCriticalCount
                    ))
                    .ToList()
            );

        var teams = teamRows
            .Select(t => new ManagerTeamDashboard(
                t.TeamId,
                t.TeamName,
                new DashboardGapSummary(t.Total, t.Ok, t.Gap1, t.Gap2Plus, t.AdherencePct, t.AvgGap),
                criticalSkillsLookup.TryGetValue(t.TeamId, out var list) ? list : Array.Empty<DashboardCriticalSkill>()
            ))
            .ToList();

        return new ManagerCompanyDashboard(
            company.CompanyId,
            company.CompanyName,
            companySummary,
            topCriticalTeams,
            topCriticalSkills,
            teams
        );
    }

    public async Task<CoordinatorTeamsDashboard> GetCoordinatorTeamsDashboardAsync(Guid coordinatorUserId, int topSkillsPerTeam = 5, int topPeoplePerTeam = 10)
    {
        using var conn = _ctx.CreateConnection();

        const string summaryByTeamSql = @"
            WITH myTeams AS (
                SELECT t.id AS TeamId, t.name AS TeamName, c.name AS CompanyName
                FROM team_members tm
                JOIN teams t ON t.id = tm.team_id
                LEFT JOIN companies c ON c.id = t.company_id
                WHERE tm.user_id = @coordinatorUserId
                  AND tm.is_leader = true
            ),
            base AS (
                SELECT
                    mt.TeamId,
                    mt.TeamName,
                    mt.CompanyName,
                    se.expected_level AS ExpectedLevel,
                    COALESCE(sa.current_level, 'DESCONHECE') AS CurrentLevel
                FROM myTeams mt
                JOIN team_members tm2 ON tm2.team_id = mt.TeamId
                JOIN users u ON u.id = tm2.user_id
                LEFT JOIN team_competencies tc ON tc.team_id = mt.TeamId
                LEFT JOIN skill_expectations se
                    ON se.skill_id = tc.skill_id
                    AND se.role_id = u.role_id
                    AND se.grade_id = u.grade_id
                LEFT JOIN skill_assessments sa ON sa.user_id = u.id AND sa.skill_id = se.skill_id
                WHERE u.role_id IS NOT NULL
                  AND u.grade_id IS NOT NULL
                  AND se.skill_id IS NOT NULL
            ),
            gaps AS (
                SELECT
                    TeamId,
                    TeamName,
                    CompanyName,
                    (
                        CASE ExpectedLevel
                            WHEN 'DESCONHECE' THEN 0
                            WHEN 'BRONZE' THEN 1
                            WHEN 'PRATA' THEN 2
                            WHEN 'OURO' THEN 3
                            ELSE 0
                        END
                        -
                        CASE CurrentLevel
                            WHEN 'DESCONHECE' THEN 0
                            WHEN 'BRONZE' THEN 1
                            WHEN 'PRATA' THEN 2
                            WHEN 'OURO' THEN 3
                            ELSE 0
                        END
                    ) AS Gap
                FROM base
            ),
            agg AS (
                SELECT
                    TeamId,
                    COUNT(*)::int AS Total,
                    SUM(CASE WHEN Gap <= 0 THEN 1 ELSE 0 END)::int AS Ok,
                    SUM(CASE WHEN Gap = 1 THEN 1 ELSE 0 END)::int AS Gap1,
                    SUM(CASE WHEN Gap >= 2 THEN 1 ELSE 0 END)::int AS Gap2Plus,
                    COALESCE(ROUND(100.0 * SUM(CASE WHEN Gap <= 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0))::int, 0) AS AdherencePct,
                    COALESCE(AVG(GREATEST(Gap, 0))::numeric(10,2), 0) AS AvgGap
                FROM gaps
                GROUP BY TeamId
            )
            SELECT
                mt.TeamId,
                mt.TeamName,
                mt.CompanyName,
                COALESCE(a.Total, 0) AS Total,
                COALESCE(a.Ok, 0) AS Ok,
                COALESCE(a.Gap1, 0) AS Gap1,
                COALESCE(a.Gap2Plus, 0) AS Gap2Plus,
                COALESCE(a.AdherencePct, 0) AS AdherencePct,
                COALESCE(a.AvgGap, 0) AS AvgGap
            FROM myTeams mt
            LEFT JOIN agg a ON a.TeamId = mt.TeamId
            ORDER BY mt.TeamName;
        ";

        var teams = (await conn.QueryAsync<(int TeamId, string TeamName, string? CompanyName, int Total, int Ok, int Gap1, int Gap2Plus, int AdherencePct, decimal AvgGap)>(
            summaryByTeamSql, new { coordinatorUserId })).ToList();

        const string criticalSkillsByTeamSql = @"
            WITH myTeams AS (
                SELECT t.id AS TeamId, t.name AS TeamName
                FROM team_members tm
                JOIN teams t ON t.id = tm.team_id
                WHERE tm.user_id = @coordinatorUserId
                  AND tm.is_leader = true
            ),
            base AS (
                SELECT
                    mt.TeamId,
                    se.expected_level AS ExpectedLevel,
                    COALESCE(sa.current_level, 'DESCONHECE') AS CurrentLevel,
                    s.id AS SkillId,
                    s.name AS SkillName,
                    c.name AS CategoryName
                FROM myTeams mt
                JOIN team_members tm2 ON tm2.team_id = mt.TeamId
                JOIN users u ON u.id = tm2.user_id
                LEFT JOIN team_competencies tc ON tc.team_id = mt.TeamId
                LEFT JOIN skill_expectations se
                    ON se.skill_id = tc.skill_id
                    AND se.role_id = u.role_id
                    AND se.grade_id = u.grade_id
                LEFT JOIN skills s ON s.id = se.skill_id
                LEFT JOIN categories c ON c.id = s.category_id
                LEFT JOIN skill_assessments sa ON sa.user_id = u.id AND sa.skill_id = se.skill_id
                WHERE u.role_id IS NOT NULL
                  AND u.grade_id IS NOT NULL
                  AND se.skill_id IS NOT NULL
            ),
            gaps AS (
                SELECT
                    TeamId,
                    SkillId,
                    SkillName,
                    CategoryName,
                    (
                        CASE ExpectedLevel
                            WHEN 'DESCONHECE' THEN 0
                            WHEN 'BRONZE' THEN 1
                            WHEN 'PRATA' THEN 2
                            WHEN 'OURO' THEN 3
                            ELSE 0
                        END
                        -
                        CASE CurrentLevel
                            WHEN 'DESCONHECE' THEN 0
                            WHEN 'BRONZE' THEN 1
                            WHEN 'PRATA' THEN 2
                            WHEN 'OURO' THEN 3
                            ELSE 0
                        END
                    ) AS Gap
                FROM base
            ),
            category_totals AS (
                SELECT
                    TeamId,
                    CategoryName,
                    COUNT(*)::int AS CategoryTotalPairs,
                    SUM(CASE WHEN Gap >= 2 THEN 1 ELSE 0 END)::int AS CategoryCriticalCount
                FROM gaps
                GROUP BY TeamId, CategoryName
            ),
            critical AS (
                SELECT
                    TeamId,
                    SkillId,
                    SkillName,
                    CategoryName,
                    COUNT(*)::int AS CriticalCount,
                    COALESCE(AVG(Gap)::numeric(10,2), 0) AS AvgCriticalGap
                FROM gaps
                WHERE Gap >= 2
                GROUP BY TeamId, SkillId, SkillName, CategoryName
            ),
            ranked AS (
                SELECT
                    *,
                    ROW_NUMBER() OVER (PARTITION BY TeamId ORDER BY CriticalCount DESC, AvgCriticalGap DESC) AS Rn
                FROM critical
            )
            SELECT
                ranked.TeamId,
                ranked.SkillId,
                ranked.SkillName,
                ranked.CategoryName,
                ranked.CriticalCount,
                ranked.AvgCriticalGap,
                COALESCE(ct.CategoryTotalPairs, 0) AS CategoryTotalPairs,
                COALESCE(ct.CategoryCriticalCount, 0) AS CategoryCriticalCount
            FROM ranked
            LEFT JOIN category_totals ct
                ON ct.TeamId = ranked.TeamId
               AND ct.CategoryName = ranked.CategoryName
            WHERE Rn <= @topSkillsPerTeam
            ORDER BY TeamId, Rn;
        ";

        var skillsRows = (await conn.QueryAsync<(int TeamId, int SkillId, string SkillName, string CategoryName, int CriticalCount, decimal AvgCriticalGap, int CategoryTotalPairs, int CategoryCriticalCount)>(
            criticalSkillsByTeamSql, new { coordinatorUserId, topSkillsPerTeam = Math.Max(1, topSkillsPerTeam) })).ToList();

        var skillsLookup = skillsRows
            .GroupBy(r => r.TeamId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<DashboardCriticalSkill>)g
                    .Select(r => new DashboardCriticalSkill(
                        r.SkillId,
                        r.SkillName,
                        r.CategoryName,
                        r.CriticalCount,
                        r.AvgCriticalGap,
                        r.CategoryTotalPairs,
                        r.CategoryCriticalCount
                    ))
                    .ToList()
            );

        const string criticalPeopleByTeamSql = @"
            WITH myTeams AS (
                SELECT t.id AS TeamId, t.name AS TeamName
                FROM team_members tm
                JOIN teams t ON t.id = tm.team_id
                WHERE tm.user_id = @coordinatorUserId
                  AND tm.is_leader = true
            ),
            base AS (
                SELECT
                    mt.TeamId,
                    mt.TeamName,
                    u.id AS UserId,
                    u.name AS Name,
                    r.name AS RoleName,
                    se.expected_level AS ExpectedLevel,
                    COALESCE(sa.current_level, 'DESCONHECE') AS CurrentLevel
                FROM myTeams mt
                JOIN team_members tm2 ON tm2.team_id = mt.TeamId
                JOIN users u ON u.id = tm2.user_id
                LEFT JOIN roles r ON r.id = u.role_id
                LEFT JOIN team_competencies tc ON tc.team_id = mt.TeamId
                LEFT JOIN skill_expectations se
                    ON se.skill_id = tc.skill_id
                    AND se.role_id = u.role_id
                    AND se.grade_id = u.grade_id
                LEFT JOIN skill_assessments sa ON sa.user_id = u.id AND sa.skill_id = se.skill_id
                WHERE u.role_id IS NOT NULL
                  AND u.grade_id IS NOT NULL
                  AND se.skill_id IS NOT NULL
            ),
            gaps AS (
                SELECT
                    TeamId,
                    TeamName,
                    UserId,
                    Name,
                    RoleName,
                    (
                        CASE ExpectedLevel
                            WHEN 'DESCONHECE' THEN 0
                            WHEN 'BRONZE' THEN 1
                            WHEN 'PRATA' THEN 2
                            WHEN 'OURO' THEN 3
                            ELSE 0
                        END
                        -
                        CASE CurrentLevel
                            WHEN 'DESCONHECE' THEN 0
                            WHEN 'BRONZE' THEN 1
                            WHEN 'PRATA' THEN 2
                            WHEN 'OURO' THEN 3
                            ELSE 0
                        END
                    ) AS Gap
                FROM base
            ),
            perUser AS (
                SELECT
                    TeamId,
                    TeamName,
                    UserId,
                    Name,
                    RoleName,
                    COUNT(*)::int AS Total,
                    SUM(CASE WHEN Gap >= 2 THEN 1 ELSE 0 END)::int AS Gap2Plus,
                    COALESCE(ROUND(100.0 * SUM(CASE WHEN Gap <= 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0))::int, 0) AS AdherencePct,
                    COALESCE(AVG(GREATEST(Gap, 0))::numeric(10,2), 0) AS AvgGap
                FROM gaps
                GROUP BY TeamId, TeamName, UserId, Name, RoleName
            ),
            ranked AS (
                SELECT
                    *,
                    ROW_NUMBER() OVER (PARTITION BY TeamId ORDER BY AdherencePct ASC, Gap2Plus DESC, AvgGap DESC, Total DESC) AS Rn
                FROM perUser
            )
            SELECT TeamId, TeamName, UserId, Name, RoleName, Total, Gap2Plus, AdherencePct, AvgGap
            FROM ranked
            WHERE Rn <= @topPeoplePerTeam
            ORDER BY TeamName, Rn;
        ";

        var peopleRows = (await conn.QueryAsync<(int TeamId, string TeamName, Guid UserId, string Name, string? RoleName, int Total, int Gap2Plus, int AdherencePct, decimal AvgGap)>(
            criticalPeopleByTeamSql, new { coordinatorUserId, topPeoplePerTeam = Math.Max(1, topPeoplePerTeam) })).ToList();

        var peopleLookup = peopleRows
            .GroupBy(r => r.TeamId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<DashboardCriticalPerson>)g
                    .Select(r => new DashboardCriticalPerson(r.UserId, r.Name, r.RoleName, r.Total, r.Gap2Plus, r.AdherencePct, r.AvgGap))
                    .ToList()
            );

        var resultTeams = teams
            .Select(t => new CoordinatorTeamDashboard(
                t.TeamId,
                t.TeamName,
                t.CompanyName,
                new DashboardGapSummary(t.Total, t.Ok, t.Gap1, t.Gap2Plus, t.AdherencePct, t.AvgGap),
                skillsLookup.TryGetValue(t.TeamId, out var skills) ? skills : Array.Empty<DashboardCriticalSkill>(),
                peopleLookup.TryGetValue(t.TeamId, out var people) ? people : Array.Empty<DashboardCriticalPerson>()
            ))
            .ToList();

        return new CoordinatorTeamsDashboard(resultTeams);
    }
}

