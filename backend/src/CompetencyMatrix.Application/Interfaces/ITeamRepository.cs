using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface ITeamRepository
{
    Task<Team?> GetByIdAsync(int id);
    Task<IEnumerable<(Guid UserId, string UserName, string UserEmail, bool IsLeader)>> GetMemberDetailsAsync(int teamId);
    Task<IEnumerable<Team>> GetAllAsync();
    Task<IEnumerable<Team>> GetAllByCompanyAsync(int companyId);
    Task<int> CreateAsync(Team team);
    Task UpdateAsync(Team team);
    Task DeleteAsync(int id);
    Task SetMembersAsync(int teamId, IEnumerable<TeamMember> members);
    Task<IEnumerable<int>> GetTeamIdsForUserAsync(Guid userId);
    Task<IEnumerable<Guid>> GetUserIdsInTeamsAsync(IEnumerable<int> teamIds);
    Task<int> CountTeamsForUserAsync(Guid userId);
    Task<IEnumerable<Guid>> GetAssignedMemberIdsAsync(int? excludeTeamId = null);
    Task<IEnumerable<Guid>> GetAllTeamUserIdsAsync();
    Task<IEnumerable<int>> GetTeamCompetencyIdsAsync(int teamId);
    Task SetTeamCompetenciesAsync(int teamId, IEnumerable<int> skillIds);
    Task<IEnumerable<int>> GetSkillIdsForUserTeamsAsync(Guid userId);
}
