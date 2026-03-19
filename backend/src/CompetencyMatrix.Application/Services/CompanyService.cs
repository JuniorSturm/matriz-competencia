using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Services;

public class CompanyService : ICompanyService
{
    private readonly ICompanyRepository   _repo;
    private readonly IUserRepository      _userRepo;
    private readonly ITeamRepository      _teamRepo;
    private readonly IRoleGradeRepository _roleRepo;
    private readonly ISkillRepository     _skillRepo;
    private readonly ICategoryRepository  _categoryRepo;
    private readonly IAuditService        _audit;

    public CompanyService(
        ICompanyRepository repo,
        IUserRepository userRepo,
        ITeamRepository teamRepo,
        IRoleGradeRepository roleRepo,
        ISkillRepository skillRepo,
        ICategoryRepository categoryRepo,
        IAuditService audit)
    {
        _repo      = repo;
        _userRepo  = userRepo;
        _teamRepo  = teamRepo;
        _roleRepo  = roleRepo;
        _skillRepo = skillRepo;
        _categoryRepo = categoryRepo;
        _audit     = audit;
    }

    public async Task<CompanyResponse?> GetByIdAsync(int id)
    {
        var c = await _repo.GetByIdAsync(id);
        return c is null ? null : Map(c);
    }

    public async Task<PagedResult<CompanyOptionResponse>> GetFilterOptionsPagedAsync(int page, int pageSize, string? name)
    {
        if (pageSize <= 0) pageSize = 50;
        pageSize = Math.Min(pageSize, 100);
        var (items, total) = await _repo.GetFilterOptionsPagedAsync(page, pageSize, name?.Trim());
        return new PagedResult<CompanyOptionResponse>(items, total);
    }

    public async Task<IEnumerable<CompanyResponse>> GetAllAsync()
    {
        var list = await _repo.GetAllAsync();
        return list.Select(Map);
    }

    public async Task<PagedResult<CompanyListItemResponse>> GetPagedAsync(int page, int pageSize, string? name)
    {
        if (pageSize <= 0) pageSize = 50;
        pageSize = Math.Min(pageSize, 100);
        var (items, total) = await _repo.GetPagedAsync(page, pageSize, name?.Trim());
        var list = items.Take(pageSize).ToList();
        return new PagedResult<CompanyListItemResponse>(list, total);
    }

    public async Task<int> CreateAsync(CreateCompanyRequest request)
    {
        var userIds = request.UserIds ?? new List<Guid>();
        foreach (var uid in userIds)
        {
            var u = await _userRepo.GetByIdAsync(uid)
                ?? throw new KeyNotFoundException($"Usuário {uid} não encontrado.");
            if (u.CompanyId is not null)
                throw new InvalidOperationException($"Usuário \"{u.Name}\" já pertence a outra empresa.");
        }

        var company = new Company
        {
            Name      = request.Name,
            Document  = request.Document,
            Email     = request.Email,
            Phone     = request.Phone,
            IsActive  = true,
            CreatedAt = DateTime.UtcNow
        };
        var id = await _repo.CreateAsync(company);

        foreach (var uid in userIds)
            await _repo.AddUserToCompanyAsync(id, uid);

        await SafeAuditAsync(
            "Company",
            id.ToString(),
            "CREATE",
            before: null,
            after: new
            {
                Id        = id,
                company.Name,
                company.Document,
                company.Email,
                company.Phone,
                company.IsActive,
                Users = userIds,
            });

        return id;
    }

    public async Task UpdateAsync(int id, UpdateCompanyRequest request)
    {
        var company = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Empresa {id} não encontrada.");

        var before = new
        {
            company.Id,
            company.Name,
            company.Document,
            company.Email,
            company.Phone,
            company.IsActive,
            Users = company.Users.Select(u => u.Id).ToList(),
        };

        company.Name     = request.Name;
        company.Document = request.Document;
        company.Email    = request.Email;
        company.Phone    = request.Phone;
        company.IsActive = request.IsActive;

        await _repo.UpdateAsync(company);

        if (request.UserIds is not null)
        {
            var desiredIds = request.UserIds.ToHashSet();
            var currentIds = company.Users.Select(u => u.Id).ToHashSet();

            foreach (var uid in desiredIds)
            {
                if (currentIds.Contains(uid)) continue;
                var user = await _userRepo.GetByIdAsync(uid)
                    ?? throw new KeyNotFoundException($"Usuário {uid} não encontrado.");
                if (user.CompanyId is not null && user.CompanyId != id)
                    throw new InvalidOperationException($"Usuário \"{user.Name}\" já pertence a outra empresa.");
            }

            var toRemove = currentIds.Except(desiredIds);
            var toAdd    = desiredIds.Except(currentIds);

            foreach (var uid in toRemove)
                await _repo.RemoveUserFromCompanyAsync(id, uid);
            foreach (var uid in toAdd)
                await _repo.AddUserToCompanyAsync(id, uid);
        }

        await SafeAuditAsync(
            "Company",
            id.ToString(),
            "UPDATE",
            before,
            new
            {
                company.Id,
                company.Name,
                company.Document,
                company.Email,
                company.Phone,
                company.IsActive,
                Users = company.Users.Select(u => u.Id).ToList(),
            });
    }

    public async Task DeleteAsync(int id)
    {
        var company = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Empresa {id} não encontrada.");

        var users = await _repo.GetUsersByCompanyAsync(id);
        if (users.Any())
            throw new InvalidOperationException("Não é possível excluir a empresa: existem colaboradores vinculados. Remova ou reatribua os colaboradores antes de excluir.");

        // Não havendo usuários, fazemos limpeza completa para não deixar lixo órfão.
        // Ordem segura: Times -> Skills -> Roles -> Categorias -> Empresa
        // (para evitar violações de FK).
        var teams = await _teamRepo.GetAllByCompanyAsync(id);
        foreach (var t in teams)
            await _teamRepo.DeleteAsync(t.Id);

        var skills = await _skillRepo.GetAllByCompanyAsync(id);
        foreach (var s in skills)
            await _skillRepo.DeleteAsync(s.Id);

        var roles = await _roleRepo.GetRolesByCompanyAsync(id);
        foreach (var r in roles)
            await _roleRepo.DeleteRoleAsync(r.Id);

        var categoriesCount = await _categoryRepo.CountByCompanyIdAsync(id);
        if (categoriesCount > 0)
        {
            var categories = await _categoryRepo.GetByCompanyIdAsync(id);
            foreach (var c in categories)
                await _categoryRepo.DeleteAsync(c.Id);
        }

        await _repo.DeleteAsync(id);

        await SafeAuditAsync(
            "Company",
            id.ToString(),
            "DELETE",
            before: new
            {
                company.Id,
                company.Name,
                company.Document,
                company.Email,
                company.Phone,
                company.IsActive,
            },
            after: null);
    }

    public async Task AddUserAsync(int companyId, Guid userId)
    {
        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException($"Usuário {userId} não encontrado.");
        if (user.CompanyId is not null && user.CompanyId != companyId)
            throw new InvalidOperationException($"Usuário \"{user.Name}\" já pertence a outra empresa.");

        await _repo.AddUserToCompanyAsync(companyId, userId);

        await SafeAuditAsync(
            "CompanyUser",
            $"{companyId}:{userId}",
            "ADD",
            before: null,
            after: new { companyId, userId });
    }

    public async Task RemoveUserAsync(int companyId, Guid userId)
    {
        await _repo.RemoveUserFromCompanyAsync(companyId, userId);

        await SafeAuditAsync(
            "CompanyUser",
            $"{companyId}:{userId}",
            "REMOVE",
            before: new { companyId, userId },
            after: null);
    }

    private static CompanyResponse Map(Company c) => new(
        c.Id,
        c.Name,
        c.Document,
        c.Email,
        c.Phone,
        c.IsActive,
        c.CreatedAt,
        c.Users.Select(u => new CompanyUserResponse(u.Id, u.Name, u.Email, u.IsManager)).ToList()
    );

    private Task SafeAuditAsync(
        string  entityType,
        string  entityId,
        string  operation,
        object? before,
        object? after,
        int?    companyId = null)
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
