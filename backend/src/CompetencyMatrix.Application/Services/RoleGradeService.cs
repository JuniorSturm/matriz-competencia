using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;

namespace CompetencyMatrix.Application.Services;

public class RoleGradeService : IRoleGradeService
{
    private readonly IRoleGradeRepository _repo;

    public RoleGradeService(IRoleGradeRepository repo) => _repo = repo;

    public async Task<IEnumerable<RoleResponse>> GetAllRolesAsync()
    {
        var list = await _repo.GetAllRolesAsync();
        return list.Select(r => new RoleResponse(r.Id, r.Name));
    }

    public async Task<IEnumerable<GradeResponse>> GetAllGradesAsync()
    {
        var list = await _repo.GetAllGradesAsync();
        return list.Select(g => new GradeResponse(g.Id, g.Name, g.Ordinal));
    }

    public async Task<IEnumerable<CategoryResponse>> GetAllCategoriesAsync()
    {
        var list = await _repo.GetAllCategoriesAsync();
        return list.Select(c => new CategoryResponse(c.Id, c.Name));
    }
}
