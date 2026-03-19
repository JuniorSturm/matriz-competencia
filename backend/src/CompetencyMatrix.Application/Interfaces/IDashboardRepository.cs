using CompetencyMatrix.Application.DTOs;

namespace CompetencyMatrix.Application.Interfaces;

public interface IDashboardRepository
{
    Task<AdminHealthStats> GetAdminHealthAsync();
    Task<ManagerCompanyDashboard> GetManagerCompanyDashboardAsync(int companyId, int topTeams = 5, int topSkills = 5, int topSkillsPerTeam = 5);
    Task<CoordinatorTeamsDashboard> GetCoordinatorTeamsDashboardAsync(Guid coordinatorUserId, int topSkillsPerTeam = 5, int topPeoplePerTeam = 10);
}

