using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Services;

public class SkillService : ISkillService
{
    private readonly ISkillRepository      _repo;
    private readonly IAssessmentRepository _assessmentRepo;
    private readonly ITeamRepository       _teamRepo;

    public SkillService(ISkillRepository repo, IAssessmentRepository assessmentRepo, ITeamRepository teamRepo)
    {
        _repo           = repo;
        _assessmentRepo = assessmentRepo;
        _teamRepo       = teamRepo;
    }

    public async Task<SkillResponse?> GetByIdAsync(int id)
    {
        var s = await _repo.GetByIdAsync(id);
        return s is null ? null : Map(s);
    }

    public async Task<IEnumerable<SkillResponse>> GetAllAsync()
    {
        var list = await _repo.GetAllAsync();
        return list.Select(Map);
    }

    public async Task<IEnumerable<SkillResponse>> GetAllByCompanyAsync(int companyId)
    {
        var list = await _repo.GetAllByCompanyAsync(companyId);
        return list.Select(Map);
    }

    public async Task<PagedResult<SkillResponse>> GetPagedAsync(int page, int pageSize, int? companyId)
    {
        var (items, total) = await _repo.GetPagedAsync(page, pageSize, companyId);
        return new PagedResult<SkillResponse>(items.Select(Map), total);
    }

    public async Task<IEnumerable<SkillResponse>> GetByRoleAsync(int roleId)
    {
        var list = await _repo.GetByRoleAsync(roleId);
        return list.Select(Map);
    }

    public async Task<int> CreateAsync(CreateSkillRequest request)
    {
        var skill = new Skill
        {
            Name      = request.Name,
            Category  = request.Category,
            CompanyId = request.CompanyId ?? 0
        };
        return await _repo.CreateAsync(skill);
    }

    public async Task UpdateAsync(int id, UpdateSkillRequest request)
    {
        var skill = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Skill {id} não encontrada.");

        skill.Name     = request.Name;
        skill.Category = request.Category;

        await _repo.UpdateAsync(skill);
    }

    public async Task DeleteAsync(int id)
    {
        var skill = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Competência {id} não encontrada.");

        var expectations = await _repo.GetExpectationsBySkillAsync(id);
        if (expectations.Any())
            throw new InvalidOperationException("Não é possível excluir a competência: existem expectativas de nível vinculadas. Remova as expectativas antes de excluir.");

        var descriptions = await _repo.GetDescriptionsAsync(id);
        if (descriptions.Any())
            throw new InvalidOperationException("Não é possível excluir a competência: existem descrições vinculadas. Remova as descrições antes de excluir.");

        var assessmentCount = await _assessmentRepo.CountBySkillAsync(id);
        if (assessmentCount > 0)
            throw new InvalidOperationException("Não é possível excluir a competência: existem avaliações vinculadas. Remova as avaliações antes de excluir.");

        var teamCompCount = await _teamRepo.CountTeamCompetenciesBySkillAsync(id);
        if (teamCompCount > 0)
            throw new InvalidOperationException("Não é possível excluir a competência: ela está vinculada a um ou mais times. Remova a competência dos times antes de excluir.");

        await _repo.DeleteAsync(id);
    }

    public async Task UpsertExpectationAsync(UpsertExpectationRequest request)
    {
        var expectation = new SkillExpectation
        {
            SkillId       = request.SkillId,
            RoleId        = request.RoleId,
            GradeId       = request.GradeId,
            ExpectedLevel = request.ExpectedLevel,
            IsRequired    = request.IsRequired
        };
        await _repo.UpsertExpectationAsync(expectation);
    }

    public async Task<IEnumerable<SkillExpectationDto>> GetExpectationsBySkillAsync(int skillId)
    {
        var list = await _repo.GetExpectationsBySkillAsync(skillId);
        return list.Select(e => new SkillExpectationDto(e.Id, e.SkillId, e.RoleId, e.GradeId, e.ExpectedLevel, e.IsRequired));
    }

    public async Task DeleteExpectationAsync(int skillId, int roleId, int gradeId)
    {
        await _repo.DeleteExpectationAsync(skillId, roleId, gradeId);
    }

    public async Task<IEnumerable<SkillDescriptionDto>> GetDescriptionsAsync(int skillId)
    {
        var list = await _repo.GetDescriptionsAsync(skillId);
        return list.Select(d => new SkillDescriptionDto(d.Id, d.SkillId, d.RoleId, d.Level, d.Description));
    }

    private const int SkillDescriptionMaxLength = 5000;

    public async Task UpsertDescriptionAsync(UpsertDescriptionRequest request)
    {
        if (request.Description?.Length > SkillDescriptionMaxLength)
            throw new InvalidOperationException($"A descrição por nível não pode ter mais de {SkillDescriptionMaxLength} caracteres.");
        var desc = new SkillDescription
        {
            SkillId     = request.SkillId,
            RoleId      = request.RoleId,
            Level       = request.Level,
            Description = request.Description
        };
        await _repo.UpsertDescriptionAsync(desc);
    }

    private static SkillResponse Map(Skill s) =>
        new(s.Id, s.Name, s.Category, s.CompanyId);
}
