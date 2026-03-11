using System.Data;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using Dapper;

namespace CompetencyMatrix.Infrastructure.Repositories;

public class TeamRepository : ITeamRepository
{
    private readonly Data.DapperContext _ctx;

    public TeamRepository(Data.DapperContext ctx) => _ctx = ctx;

    public async Task<Team?> GetByIdAsync(int id)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT t.id, t.company_id, t.name, t.description, t.created_at, c.name AS company_name
            FROM teams t
            LEFT JOIN companies c ON c.id = t.company_id
            WHERE t.id = @id";
        var row = await conn.QueryFirstOrDefaultAsync<(int id, int company_id, string name, string? description, DateTime created_at, string? company_name)>(sql, new { id });
        if (row == default) return null;
        return new Team
        {
            Id          = row.id,
            CompanyId   = row.company_id,
            Name        = row.name,
            Description = row.description,
            CreatedAt   = row.created_at,
            Company     = row.company_name != null ? new Company { Id = row.company_id, Name = row.company_name } : null
        };
    }

    public async Task<IEnumerable<Team>> GetAllAsync()
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT t.id, t.company_id, t.name, t.description, t.created_at, c.name AS company_name
            FROM teams t
            LEFT JOIN companies c ON c.id = t.company_id
            ORDER BY c.name, t.name";
        var rows = await conn.QueryAsync<(int id, int company_id, string name, string? description, DateTime created_at, string? company_name)>(sql);
        return rows.Select(r => new Team
        {
            Id          = r.id,
            CompanyId   = r.company_id,
            Name        = r.name,
            Description = r.description,
            CreatedAt   = r.created_at,
            Company     = r.company_name != null ? new Company { Id = r.company_id, Name = r.company_name } : null
        });
    }

    public async Task<IEnumerable<Team>> GetAllByCompanyAsync(int companyId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT t.id, t.company_id, t.name, t.description, t.created_at
            FROM teams t
            WHERE t.company_id = @companyId
            ORDER BY t.name";
        return await conn.QueryAsync<Team>(sql, new { companyId });
    }

    public async Task<IEnumerable<(Guid UserId, string UserName, string UserEmail, bool IsLeader)>> GetMemberDetailsAsync(int teamId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT tm.user_id AS UserId, u.name AS UserName, u.email AS UserEmail, tm.is_leader AS IsLeader
            FROM team_members tm
            INNER JOIN users u ON u.id = tm.user_id
            WHERE tm.team_id = @teamId
            ORDER BY tm.is_leader DESC, u.name";
        return await conn.QueryAsync<(Guid, string, string, bool)>(sql, new { teamId });
    }

    public async Task<int> CreateAsync(Team team)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            INSERT INTO teams (company_id, name, description, created_at)
            VALUES (@CompanyId, @Name, @Description, @CreatedAt)
            RETURNING id";
        return await conn.ExecuteScalarAsync<int>(sql, team);
    }

    public async Task UpdateAsync(Team team)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            UPDATE teams
            SET name = @Name, description = @Description
            WHERE id = @Id";
        await conn.ExecuteAsync(sql, team);
    }

    public async Task DeleteAsync(int id)
    {
        using var conn = _ctx.CreateConnection();
        await conn.ExecuteAsync("DELETE FROM team_members WHERE team_id = @id", new { id });
        await conn.ExecuteAsync("DELETE FROM teams WHERE id = @id", new { id });
    }

    public async Task SetMembersAsync(int teamId, IEnumerable<TeamMember> members)
    {
        using var conn = _ctx.CreateConnection();
        await conn.ExecuteAsync("DELETE FROM team_members WHERE team_id = @teamId", new { teamId });
        foreach (var m in members)
        {
            await conn.ExecuteAsync(
                "INSERT INTO team_members (team_id, user_id, is_leader) VALUES (@TeamId, @UserId, @IsLeader)",
                new { TeamId = teamId, m.UserId, m.IsLeader });
        }
    }

    public async Task<IEnumerable<int>> GetTeamIdsForUserAsync(Guid userId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = "SELECT team_id FROM team_members WHERE user_id = @userId";
        return await conn.QueryAsync<int>(sql, new { userId });
    }

    public async Task<IEnumerable<Guid>> GetUserIdsInTeamsAsync(IEnumerable<int> teamIds)
    {
        var ids = teamIds.ToList();
        if (ids.Count == 0) return Enumerable.Empty<Guid>();
        using var conn = _ctx.CreateConnection();
        return await conn.QueryAsync<Guid>(
            "SELECT DISTINCT user_id FROM team_members WHERE team_id = ANY(@ids)",
            new { ids });
    }

    public async Task<int> CountTeamsForUserAsync(Guid userId)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM team_members WHERE user_id = @userId",
            new { userId });
    }

    public async Task<IEnumerable<Guid>> GetAssignedMemberIdsAsync(int? excludeTeamId = null)
    {
        using var conn = _ctx.CreateConnection();
        if (excludeTeamId.HasValue)
        {
            return await conn.QueryAsync<Guid>(
                "SELECT DISTINCT user_id FROM team_members WHERE is_leader = false AND team_id != @excludeTeamId",
                new { excludeTeamId = excludeTeamId.Value });
        }
        return await conn.QueryAsync<Guid>(
            "SELECT DISTINCT user_id FROM team_members WHERE is_leader = false");
    }

    public async Task<IEnumerable<Guid>> GetAllTeamUserIdsAsync()
    {
        using var conn = _ctx.CreateConnection();
        return await conn.QueryAsync<Guid>(
            "SELECT DISTINCT user_id FROM team_members");
    }

    public async Task<IEnumerable<int>> GetTeamCompetencyIdsAsync(int teamId)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.QueryAsync<int>(
            "SELECT skill_id FROM team_competencies WHERE team_id = @teamId",
            new { teamId });
    }

    public async Task SetTeamCompetenciesAsync(int teamId, IEnumerable<int> skillIds)
    {
        var ids = skillIds.ToList();
        using var conn = _ctx.CreateConnection();
        conn.Open();
        using var tx = conn.BeginTransaction();

        await conn.ExecuteAsync(
            "DELETE FROM team_competencies WHERE team_id = @teamId",
            new { teamId }, tx);

        if (ids.Count > 0)
        {
            var rows = ids.Select(sid => new { teamId, skillId = sid });
            await conn.ExecuteAsync(
                "INSERT INTO team_competencies (team_id, skill_id) VALUES (@teamId, @skillId)",
                rows, tx);
        }

        tx.Commit();
    }

    public async Task<IEnumerable<int>> GetSkillIdsForUserTeamsAsync(Guid userId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT DISTINCT tc.skill_id
            FROM team_members tm
            JOIN team_competencies tc ON tc.team_id = tm.team_id
            WHERE tm.user_id = @userId";
        return await conn.QueryAsync<int>(sql, new { userId });
    }
}
