using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Services;

public class RoleService : IRoleService
{
    private readonly IRoleGradeRepository _roleRepo;
    private readonly IUserRepository      _userRepo;
    private readonly ICompanyRepository   _companyRepo;
    private readonly ISkillRepository     _skillRepo;

    public RoleService(
        IRoleGradeRepository roleRepo,
        IUserRepository userRepo,
        ICompanyRepository companyRepo,
        ISkillRepository skillRepo)
    {
        _roleRepo    = roleRepo;
        _userRepo    = userRepo;
        _companyRepo = companyRepo;
        _skillRepo   = skillRepo;
    }

    public async Task<IEnumerable<RoleDetailResponse>> GetAllAsync(Guid? currentUserId, int? companyId = null)
    {
        var scopeCompanyId = await ResolveScopeCompanyIdAsync(currentUserId, companyId);
        if (scopeCompanyId.HasValue)
        {
            var roles = await _roleRepo.GetRolesByCompanyAsync(scopeCompanyId.Value);
            var companyName = await _companyRepo.GetNameByIdAsync(scopeCompanyId.Value);
            return roles.Select(r => MapDetail(r, companyName));
        }
        var all = await _roleRepo.GetAllRolesAsync();
        var list = all.ToList();
        var companyNames = await Task.WhenAll(list.Select(r => _companyRepo.GetNameByIdAsync(r.CompanyId)));
        return list.Zip(companyNames, (r, name) => MapDetail(r, name));
    }

    public async Task<PagedResult<RoleDetailResponse>> GetPagedAsync(Guid? currentUserId, int? companyId, int page, int pageSize)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 50;

        var skip = (page - 1) * pageSize;

        var scopeCompanyId = await ResolveScopeCompanyIdAsync(currentUserId, companyId);
        if (scopeCompanyId.HasValue)
        {
            var roles = (await _roleRepo.GetRolesByCompanyAsync(scopeCompanyId.Value)).ToList();
            var total = roles.Count;
            var pageRoles = roles.Skip(skip).Take(pageSize).ToList();
            var companyName = await _companyRepo.GetNameByIdAsync(scopeCompanyId.Value);
            var items = pageRoles.Select(r => MapDetail(r, companyName));
            return new PagedResult<RoleDetailResponse>(items, total);
        }

        var all = (await _roleRepo.GetAllRolesAsync()).ToList();
        var totalAll = all.Count;
        var pageAll = all.Skip(skip).Take(pageSize).ToList();
        var companyNames = await Task.WhenAll(pageAll.Select(r => _companyRepo.GetNameByIdAsync(r.CompanyId)));
        var mapped = pageAll.Zip(companyNames, (r, name) => MapDetail(r, name));
        return new PagedResult<RoleDetailResponse>(mapped, totalAll);
    }

    public async Task<IEnumerable<RoleResponse>> GetByCompanyAsync(int companyId, Guid? currentUserId = null)
    {
        if (currentUserId.HasValue)
        {
            var user = await _userRepo.GetByIdAsync(currentUserId.Value);
            if (user is not null && !user.IsAdmin && user.CompanyId.HasValue && user.CompanyId != companyId)
                return Enumerable.Empty<RoleResponse>();
        }
        var roles = await _roleRepo.GetRolesByCompanyAsync(companyId);
        return roles.Select(r => new RoleResponse(r.Id, r.Name));
    }

    public async Task<RoleDetailResponse?> GetByIdAsync(int id)
    {
        var role = await _roleRepo.GetRoleByIdAsync(id);
        if (role is null) return null;
        var company = await _companyRepo.GetByIdAsync(role.CompanyId);
        return MapDetail(role, company?.Name);
    }

    private const int RoleDescriptionMaxLength = 500;

    public async Task<int> CreateAsync(CreateRoleRequest request, Guid? currentUserId = null)
    {
        var companyId = await ResolveCompanyIdForCreateAsync(currentUserId, request.CompanyId);
        var desc = string.IsNullOrWhiteSpace(request.Descricao) ? null : request.Descricao.Trim();
        if (desc?.Length > RoleDescriptionMaxLength)
            throw new InvalidOperationException($"A descrição do cargo não pode ter mais de {RoleDescriptionMaxLength} caracteres.");
        var role = new Role
        {
            Name        = request.Nome.Trim(),
            Description = desc,
            CompanyId   = companyId
        };
        return await _roleRepo.CreateRoleAsync(role);
    }

    public async Task UpdateAsync(int id, UpdateRoleRequest request, Guid? currentUserId = null)
    {
        var existing = await _roleRepo.GetRoleByIdAsync(id)
            ?? throw new KeyNotFoundException($"Cargo {id} não encontrado.");
        await EnsureCanModifyAsync(currentUserId, existing.CompanyId);

        var desc = string.IsNullOrWhiteSpace(request.Descricao) ? null : request.Descricao.Trim();
        if (desc?.Length > RoleDescriptionMaxLength)
            throw new InvalidOperationException($"A descrição do cargo não pode ter mais de {RoleDescriptionMaxLength} caracteres.");
        existing.Name        = request.Nome.Trim();
        existing.Description = desc;
        await _roleRepo.UpdateRoleAsync(existing);
    }

    public async Task DeleteAsync(int id, Guid? currentUserId = null)
    {
        var existing = await _roleRepo.GetRoleByIdAsync(id)
            ?? throw new KeyNotFoundException($"Cargo {id} não encontrado.");
        await EnsureCanModifyAsync(currentUserId, existing.CompanyId);

        var userCount = await _userRepo.CountByRoleAsync(id);
        if (userCount > 0)
            throw new InvalidOperationException("Não é possível excluir o cargo: existem colaboradores vinculados. Reatribua ou remova os colaboradores antes de excluir.");

        var expCount = await _skillRepo.CountExpectationsByRoleAsync(id);
        if (expCount > 0)
            throw new InvalidOperationException("Não é possível excluir o cargo: existem expectativas de competência vinculadas. Remova as expectativas antes de excluir o cargo.");

        var descCount = await _skillRepo.CountDescriptionsByRoleAsync(id);
        if (descCount > 0)
            throw new InvalidOperationException("Não é possível excluir o cargo: existem descrições de competência vinculadas. Remova as descrições antes de excluir o cargo.");

        await _roleRepo.DeleteRoleAsync(id);
    }

    private async Task<int?> ResolveScopeCompanyIdAsync(Guid? currentUserId, int? companyId)
    {
        if (currentUserId is null)
            return companyId;

        var user = await _userRepo.GetByIdAsync(currentUserId.Value);
        if (user is null) return companyId;
        if (user.IsAdmin)
            return companyId; // Admin: null = all, otherwise filter by companyId
        if (user.CompanyId.HasValue)
            return user.CompanyId.Value; // Gestor/Coordenador: sempre sua empresa
        return null;
    }

    private async Task<int> ResolveCompanyIdForCreateAsync(Guid? currentUserId, int? requestCompanyId)
    {
        if (currentUserId.HasValue)
        {
            var user = await _userRepo.GetByIdAsync(currentUserId.Value);
            if (user is not null && !user.IsAdmin && user.CompanyId.HasValue)
                return user.CompanyId.Value;
        }
        if (requestCompanyId.HasValue)
            return requestCompanyId.Value;
        throw new InvalidOperationException("Empresa é obrigatória para cadastro de cargo.");
    }

    private async Task EnsureCanModifyAsync(Guid? currentUserId, int roleCompanyId)
    {
        if (currentUserId is null) return;
        var user = await _userRepo.GetByIdAsync(currentUserId.Value);
        if (user is null) return;
        if (user.IsAdmin) return;
        if (user.CompanyId == roleCompanyId) return;
        throw new UnauthorizedAccessException("Sem permissão para alterar cargo de outra empresa.");
    }

    private static RoleDetailResponse MapDetail(Role r, string? companyName) =>
        new(r.Id, r.Name, r.Description, r.CompanyId, companyName);
}
