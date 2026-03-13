using System.Linq;
using CompetencyMatrix.Application;
using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using BC = BCrypt.Net.BCrypt;

namespace CompetencyMatrix.Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository       _repo;
    private readonly ITeamRepository       _teamRepo;
    private readonly ICompanyRepository    _companyRepo;
    private readonly IAssessmentRepository _assessmentRepo;
    private readonly IAuditService         _audit;

    public UserService(
        IUserRepository       repo,
        ITeamRepository       teamRepo,
        ICompanyRepository    companyRepo,
        IAssessmentRepository assessmentRepo,
        IAuditService         audit)
    {
        _repo           = repo;
        _teamRepo       = teamRepo;
        _companyRepo    = companyRepo;
        _assessmentRepo = assessmentRepo;
        _audit          = audit;
    }

    public async Task<UserResponse?> GetByIdAsync(Guid id)
    {
        var u = await _repo.GetByIdAsync(id);
        return u is null ? null : Map(u);
    }

    public async Task<IEnumerable<UserResponse>> GetAllAsync(Guid? currentUserId = null)
    {
        if (currentUserId is null)
            return (await _repo.GetAllAsync()).Select(Map);

        var currentUser = await _repo.GetByIdAsync(currentUserId.Value);
        if (currentUser is null)
            return (await _repo.GetAllAsync()).Select(Map);

        if (currentUser.IsAdmin)
            return (await _repo.GetAllAsync()).Select(Map);

        if (currentUser.IsCoordinator && !currentUser.IsManager)
        {
            if (!currentUser.CompanyId.HasValue)
                return Enumerable.Empty<UserResponse>();

            var companyUsersTask = _repo.GetAllByCompanyAsync(currentUser.CompanyId.Value);
            var myTeamIdsTask    = _teamRepo.GetTeamIdsForUserAsync(currentUserId.Value);
            var allInTeamsTask   = _teamRepo.GetAllTeamUserIdsAsync();

            await Task.WhenAll(companyUsersTask, myTeamIdsTask, allInTeamsTask);

            var companyUsers = companyUsersTask.Result.ToList();
            var myTeamUserIds = (await _teamRepo.GetUserIdsInTeamsAsync(myTeamIdsTask.Result)).ToHashSet();
            var allInTeams = allInTeamsTask.Result.ToHashSet();

            return companyUsers
                .Where(u => myTeamUserIds.Contains(u.Id) || !allInTeams.Contains(u.Id))
                .Select(Map);
        }

        if (currentUser.IsManager)
        {
            if (currentUser.CompanyId.HasValue)
                return (await _repo.GetAllByCompanyAsync(currentUser.CompanyId.Value)).Select(Map);
            return Enumerable.Empty<UserResponse>();
        }

        if (!currentUser.IsAdmin && !currentUser.IsManager && !currentUser.IsCoordinator && !currentUser.CompanyId.HasValue)
            return Enumerable.Empty<UserResponse>();

        return (await _repo.GetAllAsync()).Select(Map);
    }

    public async Task<IEnumerable<UserResponse>> GetAllByCompanyAsync(int companyId)
    {
        var list = await _repo.GetAllByCompanyAsync(companyId);
        return list.Select(Map);
    }

    public async Task<PagedResult<UserResponse>> GetPagedAsync(Guid? currentUserId, int page, int pageSize, string? nameFilter, bool onlyCollaborators)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = PaginationDefaults.DefaultPageSize;

        pageSize = Math.Min(pageSize, PaginationDefaults.MaxPageSize);

        var all = await GetAllAsync(currentUserId);
        var query = all.AsQueryable();

        if (onlyCollaborators)
        {
            query = query.Where(u => !u.IsAdmin && !u.IsManager && !u.IsCoordinator);
        }

        if (!string.IsNullOrWhiteSpace(nameFilter))
        {
            var lower = nameFilter.ToLowerInvariant();
            query = query.Where(u => u.Name.ToLower().Contains(lower));
        }

        var total = query.Count();
        var skip  = (page - 1) * pageSize;
        var items = query.Skip(skip).Take(pageSize).ToList();

        return new PagedResult<UserResponse>(items, total);
    }

    public async Task<Guid> CreateAsync(CreateUserRequest request, Guid? currentUserId = null)
    {
        User? caller = currentUserId.HasValue
            ? await _repo.GetByIdAsync(currentUserId.Value)
            : null;

        var isManager     = request.IsManager;
        var isCoordinator = request.IsCoordinator;
        var roleId        = request.RoleId;
        var gradeId       = request.GradeId;
        var companyId     = request.CompanyId;

        if (caller is { IsCoordinator: true, IsAdmin: false, IsManager: false })
        {
            isManager     = false;
            isCoordinator = false;
        }

        if (isManager || isCoordinator)
        {
            roleId  = null;
            gradeId = null;
        }

        if (caller is not null && !caller.IsAdmin && caller.CompanyId.HasValue)
            companyId = caller.CompanyId.Value;

        var user = new User
        {
            Id            = Guid.NewGuid(),
            Name          = request.Name,
            Email         = request.Email,
            Password      = BC.HashPassword(request.Password),
            RoleId        = roleId,
            GradeId       = gradeId,
            IsManager     = isManager,
            IsAdmin       = false,
            IsCoordinator = isCoordinator,
            CompanyId     = companyId,
            CreatedAt     = DateTime.UtcNow
        };
        var newId = await _repo.CreateAsync(user);

        // Se for gestor e tiver empresa vinculada, garante associação na empresa
        if (user.IsManager && user.CompanyId.HasValue)
        {
            await _companyRepo.AddUserToCompanyAsync(user.CompanyId.Value, user.Id);
        }

        await SafeAuditAsync(
            "User",
            user.Id.ToString(),
            "CREATE",
            before: null,
            after: new
            {
                user.Id,
                user.Name,
                user.Email,
                user.IsManager,
                user.IsAdmin,
                user.IsCoordinator,
                user.CompanyId,
            },
            companyId: user.CompanyId);

        return newId;
    }

    public async Task UpdateAsync(Guid id, UpdateUserRequest request, Guid? currentUserId = null)
    {
        var user = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Usuário {id} não encontrado.");

        var before = new
        {
            user.Id,
            user.Name,
            user.Email,
            user.IsManager,
            user.IsAdmin,
            user.IsCoordinator,
            user.CompanyId,
        };

        User? caller = currentUserId.HasValue
            ? await _repo.GetByIdAsync(currentUserId.Value)
            : null;

        var isManager     = request.IsManager;
        var isCoordinator = request.IsCoordinator;
        var roleId        = request.RoleId;
        var gradeId       = request.GradeId;
        var companyId     = request.CompanyId ?? user.CompanyId;

        if (caller is { IsCoordinator: true, IsAdmin: false, IsManager: false })
        {
            if (user.IsManager || user.IsCoordinator || user.IsAdmin)
                throw new UnauthorizedAccessException("Coordenador não pode editar usuários com perfil.");
            isManager     = false;
            isCoordinator = false;
        }

        if (isManager || isCoordinator)
        {
            roleId  = null;
            gradeId = null;
        }

        if (caller is not null && !caller.IsAdmin && caller.CompanyId.HasValue)
            companyId = caller.CompanyId.Value;

        user.Name          = request.Name;
        user.RoleId        = roleId;
        user.GradeId       = gradeId;
        user.IsManager     = isManager;
        user.IsCoordinator = isCoordinator;
        user.CompanyId     = companyId;

        await _repo.UpdateAsync(user);

        // Se passar a ser gestor e tiver empresa, garante associação na empresa
        if (user.IsManager && user.CompanyId.HasValue)
        {
            await _companyRepo.AddUserToCompanyAsync(user.CompanyId.Value, user.Id);
        }

        await SafeAuditAsync(
            "User",
            user.Id.ToString(),
            "UPDATE",
            before,
            new
            {
                user.Id,
                user.Name,
                user.Email,
                user.IsManager,
                user.IsAdmin,
                user.IsCoordinator,
                user.CompanyId,
            },
            companyId: user.CompanyId);
    }

    public async Task ResetPasswordAsync(Guid id, string newPassword)
    {
        var user = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Usuário {id} não encontrado.");

        var hashed = BC.HashPassword(newPassword);
        await _repo.UpdatePasswordAsync(id, hashed);

        await SafeAuditAsync(
            "User",
            id.ToString(),
            "RESET_PASSWORD",
            before: null,
            after: new { Changed = true },
            companyId: user.CompanyId);
    }

    public async Task DeleteAsync(Guid id)
    {
        var user = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Usuário {id} não encontrado.");

        var teamCount = await _teamRepo.CountTeamsForUserAsync(id);
        if (teamCount > 0)
            throw new InvalidOperationException("Não é possível excluir o colaborador: ele está vinculado a um ou mais times. Remova-o dos times antes de excluir.");

        var assessments = await _assessmentRepo.GetByUserAsync(id);
        if (assessments.Any())
            throw new InvalidOperationException("Não é possível excluir o colaborador: existem avaliações de competência vinculadas. Remova as avaliações antes de excluir.");

        await _repo.DeleteAsync(id);

        await SafeAuditAsync(
            "User",
            id.ToString(),
            "DELETE",
            before: new
            {
                user.Id,
                user.Name,
                user.Email,
                user.IsManager,
                user.IsAdmin,
                user.IsCoordinator,
                user.CompanyId,
            },
            after: null,
            companyId: user.CompanyId);
    }

    public async Task<bool> CanSeeUserAsync(Guid currentUserId, Guid targetUserId)
    {
        if (currentUserId == targetUserId) return true;
        var currentUser = await _repo.GetByIdAsync(currentUserId);
        if (currentUser is null) return false;
        // Para os endpoints de avaliação/comparação, qualquer usuário com perfil de
        // Admin / Gestor / Coordenador pode enxergar os colaboradores que aparecem no picker.
        if (currentUser.IsAdmin || currentUser.IsManager || currentUser.IsCoordinator)
            return true;

        return false;
    }

    private static UserResponse Map(User u) => new(
        u.Id,
        u.Name,
        u.Email,
        u.RoleId,
        u.Role?.Name,
        u.GradeId,
        u.Grade?.Name,
        u.IsManager,
        u.IsAdmin,
        u.IsCoordinator,
        u.CompanyId,
        u.Company?.Name,
        u.CreatedAt
    );

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
