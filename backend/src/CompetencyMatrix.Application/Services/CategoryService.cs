using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Services;

public class CategoryService : ICategoryService
{
    private const int MaxCategoriesPerCompany = 50;

    private readonly ICategoryRepository _repo;
    private readonly IUserRepository      _userRepo;
    private readonly IAuditService        _audit;

    public CategoryService(ICategoryRepository repo, IUserRepository userRepo, IAuditService audit)
    {
        _repo    = repo;
        _userRepo = userRepo;
        _audit   = audit;
    }

    public async Task<IEnumerable<CategoryResponse>> GetByCompanyIdAsync(int companyId)
    {
        var list = await _repo.GetByCompanyIdAsync(companyId);
        return list.Select(c => new CategoryResponse(c.Id, c.Name, c.CompanyId));
    }

    public async Task<CategoryResponse?> GetByIdAsync(int id)
    {
        var c = await _repo.GetByIdAsync(id);
        return c is null ? null : new CategoryResponse(c.Id, c.Name, c.CompanyId);
    }

    public async Task<int> CreateAsync(CreateCategoryRequest request, Guid? currentUserId = null)
    {
        await EnsureCanManageCategoriesForCompanyAsync(request.CompanyId, currentUserId);

        var count = await _repo.CountByCompanyIdAsync(request.CompanyId);
        if (count >= MaxCategoriesPerCompany)
            throw new InvalidOperationException($"Esta empresa já possui o número máximo de categorias ({MaxCategoriesPerCompany}).");

        var name = (request.Name ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("O nome da categoria é obrigatório.");

        var category = new Category
        {
            CompanyId = request.CompanyId,
            Name      = name
        };
        var id = await _repo.CreateAsync(category);

        await SafeAuditAsync(
            "Category",
            id.ToString(),
            "CREATE",
            before: null,
            after: new
            {
                Id        = id,
                category.CompanyId,
                category.Name,
            },
            companyId: category.CompanyId);

        return id;
    }

    public async Task UpdateAsync(int id, UpdateCategoryRequest request, Guid? currentUserId = null)
    {
        var category = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Categoria não encontrada.");

        await EnsureCanManageCategoriesForCompanyAsync(category.CompanyId, currentUserId);

        var name = (request.Name ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("O nome da categoria é obrigatório.");

        var before = new
        {
            category.Id,
            category.CompanyId,
            category.Name,
        };

        category.Name = name;
        await _repo.UpdateAsync(category);

        await SafeAuditAsync(
            "Category",
            id.ToString(),
            "UPDATE",
            before,
            after: new
            {
                category.Id,
                category.CompanyId,
                category.Name,
            },
            companyId: category.CompanyId);
    }

    public async Task DeleteAsync(int id, Guid? currentUserId = null)
    {
        var category = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Categoria não encontrada.");

        await EnsureCanManageCategoriesForCompanyAsync(category.CompanyId, currentUserId);

        var skillsCount = await _repo.CountSkillsByCategoryIdAsync(id);
        if (skillsCount > 0)
            throw new InvalidOperationException("Não é possível excluir a categoria: existem competências vinculadas a ela. Remova ou altere a categoria dessas competências primeiro.");

        await _repo.DeleteAsync(id);

        await SafeAuditAsync(
            "Category",
            id.ToString(),
            "DELETE",
            before: new
            {
                category.Id,
                category.CompanyId,
                category.Name,
            },
            after: null,
            companyId: category.CompanyId);
    }

    private async Task EnsureCanManageCategoriesForCompanyAsync(int companyId, Guid? currentUserId)
    {
        if (!currentUserId.HasValue)
            throw new UnauthorizedAccessException("Usuário não autenticado.");

        var user = await _userRepo.GetByIdAsync(currentUserId.Value);
        if (user is null)
            throw new UnauthorizedAccessException("Usuário não encontrado.");

        if (user.IsAdmin)
            return;

        if (user.IsManager && user.CompanyId.HasValue && user.CompanyId.Value == companyId)
            return;

        throw new UnauthorizedAccessException("Você não tem permissão para criar ou editar categorias nesta empresa.");
    }

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
