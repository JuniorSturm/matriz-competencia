using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Services;

public class SkillService : ISkillService
{
    private readonly ISkillRepository      _repo;
    private readonly IAssessmentRepository _assessmentRepo;
    private readonly ITeamRepository       _teamRepo;
    private readonly IAuditService         _audit;

    public SkillService(
        ISkillRepository      repo,
        IAssessmentRepository assessmentRepo,
        ITeamRepository       teamRepo,
        IAuditService         audit)
    {
        _repo           = repo;
        _assessmentRepo = assessmentRepo;
        _teamRepo       = teamRepo;
        _audit          = audit;
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
        var id = await _repo.CreateAsync(skill);

        await SafeAuditAsync(
            "Skill",
            id.ToString(),
            "CREATE",
            before: null,
            after: new
            {
                Id        = id,
                skill.Name,
                skill.Category,
                skill.CompanyId,
            },
            companyId: skill.CompanyId);

        return id;
    }

    public async Task UpdateAsync(int id, UpdateSkillRequest request)
    {
        var skill = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Skill {id} não encontrada.");

        var before = new
        {
            skill.Id,
            skill.Name,
            skill.Category,
            skill.CompanyId,
        };

        skill.Name     = request.Name;
        skill.Category = request.Category;

        await _repo.UpdateAsync(skill);

        await SafeAuditAsync(
            "Skill",
            id.ToString(),
            "UPDATE",
            before,
            new
            {
                skill.Id,
                skill.Name,
                skill.Category,
                skill.CompanyId,
            },
            companyId: skill.CompanyId);
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

        await SafeAuditAsync(
            "Skill",
            id.ToString(),
            "DELETE",
            before: new
            {
                skill.Id,
                skill.Name,
                skill.Category,
                skill.CompanyId,
            },
            after: null,
            companyId: skill.CompanyId);
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

        var skill = await _repo.GetByIdAsync(request.SkillId);

        await SafeAuditAsync(
            "SkillExpectation",
            $"{request.SkillId}:{request.RoleId}:{request.GradeId}",
            "UPSERT",
            before: null,
            after: request,
            companyId: skill?.CompanyId);
    }

    public async Task<IEnumerable<SkillExpectationDto>> GetExpectationsBySkillAsync(int skillId)
    {
        var list = await _repo.GetExpectationsBySkillAsync(skillId);
        return list.Select(e => new SkillExpectationDto(e.Id, e.SkillId, e.RoleId, e.GradeId, e.ExpectedLevel, e.IsRequired));
    }

    public async Task DeleteExpectationAsync(int skillId, int roleId, int gradeId)
    {
        var skill = await _repo.GetByIdAsync(skillId);

        await _repo.DeleteExpectationAsync(skillId, roleId, gradeId);

        await SafeAuditAsync(
            "SkillExpectation",
            $"{skillId}:{roleId}:{gradeId}",
            "DELETE",
            before: new { skillId, roleId, gradeId },
            after: null,
            companyId: skill?.CompanyId);
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
            Description = request.Description ?? string.Empty
        };
        await _repo.UpsertDescriptionAsync(desc);

        var skill = await _repo.GetByIdAsync(request.SkillId);

        await SafeAuditAsync(
            "SkillDescription",
            $"{request.SkillId}:{request.RoleId}:{request.Level}",
            "UPSERT",
            before: null,
            after: request,
            companyId: skill?.CompanyId);
    }

    private static SkillResponse Map(Skill s) =>
        new(s.Id, s.Name, s.Category, s.CompanyId);

    private Task SafeAuditAsync(
        string  entityType,
        string  entityId,
        string  operation,
        object? before,
        object? after,
        int?    companyId)
    {
        try
        {
            return _audit.LogAsync(entityType, entityId, operation, before, after, companyId);
        }
        catch
        {
            return Task.CompletedTask;
        }
    }
}
