using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Services;

public class TeamService : ITeamService
{
    private readonly ITeamRepository _teamRepo;
    private readonly IUserRepository _userRepo;
    private readonly ICompanyRepository _companyRepo;

    public TeamService(ITeamRepository teamRepo, IUserRepository userRepo, ICompanyRepository companyRepo)
    {
        _teamRepo   = teamRepo;
        _userRepo   = userRepo;
        _companyRepo = companyRepo;
    }

    public async Task<TeamResponse?> GetByIdAsync(int id)
    {
        var team = await _teamRepo.GetByIdAsync(id);
        if (team is null) return null;
        var members = await _teamRepo.GetMemberDetailsAsync(id);
        var competencyIds = (await _teamRepo.GetTeamCompetencyIdsAsync(id)).ToList();
        return MapToResponse(team, members, competencyIds);
    }

    public async Task<IEnumerable<TeamListItemResponse>> GetAllAsync(Guid? currentUserId = null)
    {
        if (currentUserId.HasValue)
        {
            var currentUser = await _userRepo.GetByIdAsync(currentUserId.Value);
            if (currentUser is not null && !currentUser.IsAdmin)
            {
                if (currentUser.IsCoordinator && !currentUser.IsManager)
                {
                    var myTeamIds = (await _teamRepo.GetTeamIdsForUserAsync(currentUserId.Value)).ToHashSet();
                    if (!currentUser.CompanyId.HasValue)
                        return Enumerable.Empty<TeamListItemResponse>();
                    var companyTeams = await GetAllByCompanyAsync(currentUser.CompanyId.Value);
                    return companyTeams.Where(t => myTeamIds.Contains(t.Id));
                }

                if (currentUser.CompanyId.HasValue)
                    return await GetAllByCompanyAsync(currentUser.CompanyId.Value);
            }
        }

        var teams = await _teamRepo.GetAllAsync();
        var list = new List<TeamListItemResponse>();
        foreach (var t in teams)
        {
            var members = await _teamRepo.GetMemberDetailsAsync(t.Id);
            var leader = members.FirstOrDefault(m => m.IsLeader);
            list.Add(new TeamListItemResponse(
                t.Id,
                t.CompanyId,
                t.Company?.Name,
                t.Name,
                t.Description,
                members.Count(m => !m.IsLeader),
                leader.UserName,
                t.CreatedAt
            ));
        }
        return list;
    }

    public async Task<IEnumerable<TeamListItemResponse>> GetAllByCompanyAsync(int companyId)
    {
        var teams = await _teamRepo.GetAllByCompanyAsync(companyId);
        var list = new List<TeamListItemResponse>();
        foreach (var t in teams)
        {
            var members = await _teamRepo.GetMemberDetailsAsync(t.Id);
            var leader = members.FirstOrDefault(m => m.IsLeader);
            list.Add(new TeamListItemResponse(
                t.Id,
                t.CompanyId,
                null,
                t.Name,
                t.Description,
                members.Count(m => !m.IsLeader),
                leader.UserName,
                t.CreatedAt
            ));
        }
        return list;
    }

    public async Task<int> CreateAsync(CreateTeamRequest request)
    {
        await ValidateMembersAsync(request.Members, teamId: null, companyId: request.CompanyId);
        var company = await _companyRepo.GetByIdAsync(request.CompanyId)
            ?? throw new KeyNotFoundException($"Empresa {request.CompanyId} não encontrada.");

        var team = new Team
        {
            CompanyId   = request.CompanyId,
            Name        = request.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            CreatedAt   = DateTime.UtcNow
        };
        var id = await _teamRepo.CreateAsync(team);
        var members = request.Members.Select(m => new TeamMember
        {
            TeamId   = id,
            UserId   = m.UserId,
            IsLeader = m.IsLeader
        }).ToList();
        await _teamRepo.SetMembersAsync(id, members);

        if (request.CompetencyIds is { Count: > 0 })
            await _teamRepo.SetTeamCompetenciesAsync(id, request.CompetencyIds);

        return id;
    }

    public async Task UpdateAsync(int id, UpdateTeamRequest request)
    {
        var team = await _teamRepo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Time {id} não encontrado.");
        await ValidateMembersAsync(request.Members, teamId: id, companyId: team.CompanyId);

        team.Name        = request.Name.Trim();
        team.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        await _teamRepo.UpdateAsync(team);

        var members = request.Members.Select(m => new TeamMember
        {
            TeamId   = id,
            UserId   = m.UserId,
            IsLeader = m.IsLeader
        }).ToList();
        await _teamRepo.SetMembersAsync(id, members);

        if (request.CompetencyIds is not null)
            await _teamRepo.SetTeamCompetenciesAsync(id, request.CompetencyIds);
    }

    public Task DeleteAsync(int id) => _teamRepo.DeleteAsync(id);

    public Task<IEnumerable<Guid>> GetAssignedMemberIdsAsync(int? excludeTeamId = null) =>
        _teamRepo.GetAssignedMemberIdsAsync(excludeTeamId);

    private async Task ValidateMembersAsync(List<TeamMemberRequest> members, int? teamId, int companyId)
    {
        if (members is null || members.Count == 0)
            throw new InvalidOperationException("O time deve ter pelo menos um membro.");

        var leaders = members.Where(m => m.IsLeader).ToList();
        if (leaders.Count == 0)
            throw new InvalidOperationException("O time deve ter pelo menos um líder (coordenador).");

        foreach (var leader in leaders)
        {
            var user = await _userRepo.GetByIdAsync(leader.UserId)
                ?? throw new KeyNotFoundException($"Usuário {leader.UserId} não encontrado.");
            if (!user.IsCoordinator)
                throw new InvalidOperationException($"O líder do time deve ser um colaborador com perfil de Coordenador. ({user.Name})");
            if (user.CompanyId != companyId)
                throw new InvalidOperationException($"O líder deve pertencer à mesma empresa do time. ({user.Name})");
        }

        foreach (var m in members.Where(x => !x.IsLeader))
        {
            var user = await _userRepo.GetByIdAsync(m.UserId)
                ?? throw new KeyNotFoundException($"Usuário {m.UserId} não encontrado.");
            if (user.IsCoordinator) continue;
            var count = await _teamRepo.CountTeamsForUserAsync(m.UserId);
            if (teamId.HasValue)
            {
                var teamIds = await _teamRepo.GetTeamIdsForUserAsync(m.UserId);
                var otherTeamsCount = teamIds.Count(tid => tid != teamId.Value);
                if (otherTeamsCount >= 1)
                    throw new InvalidOperationException($"Colaborador {user.Name} já pertence a outro time. Um colaborador (não coordenador) só pode fazer parte de um time por vez.");
            }
            else
            {
                if (count > 0)
                    throw new InvalidOperationException($"Colaborador {user.Name} já pertence a um time. Um colaborador (não coordenador) só pode fazer parte de um time por vez.");
            }
        }
    }

    private static TeamResponse MapToResponse(
        Team team,
        IEnumerable<(Guid UserId, string UserName, string UserEmail, bool IsLeader)> members,
        List<int> competencyIds)
    {
        return new TeamResponse(
            team.Id,
            team.CompanyId,
            team.Company?.Name,
            team.Name,
            team.Description,
            team.CreatedAt,
            members.Select(m => new TeamMemberResponse(m.UserId, m.UserName, m.UserEmail, m.IsLeader)).ToList(),
            competencyIds
        );
    }
}
