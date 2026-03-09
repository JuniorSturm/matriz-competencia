using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Services;

public class SkillService : ISkillService
{
    private readonly ISkillRepository _repo;

    public SkillService(ISkillRepository repo) => _repo = repo;

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

    public async Task<IEnumerable<SkillResponse>> GetByRoleAsync(int roleId)
    {
        var list = await _repo.GetByRoleAsync(roleId);
        return list.Select(Map);
    }

    public async Task<int> CreateAsync(CreateSkillRequest request)
    {
        var skill = new Skill
        {
            Name     = request.Name,
            Category = request.Category
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

    public Task DeleteAsync(int id) => _repo.DeleteAsync(id);

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

    public async Task UpsertDescriptionAsync(UpsertDescriptionRequest request)
    {
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
        new(s.Id, s.Name, s.Category);
}
