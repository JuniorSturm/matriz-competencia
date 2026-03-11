using CompetencyMatrix.Application.DTOs;

namespace CompetencyMatrix.Application.Interfaces;

public interface IUserService
{
    Task<UserResponse?>          GetByIdAsync(Guid id);
    Task<IEnumerable<UserResponse>> GetAllAsync(Guid? currentUserId = null);
    Task<IEnumerable<UserResponse>> GetAllByCompanyAsync(int companyId);
    Task<Guid>                   CreateAsync(CreateUserRequest request, Guid? currentUserId = null);
    Task                         UpdateAsync(Guid id, UpdateUserRequest request, Guid? currentUserId = null);
    Task                         ResetPasswordAsync(Guid id, string newPassword);
    Task                         DeleteAsync(Guid id);
    Task<bool>                    CanSeeUserAsync(Guid currentUserId, Guid targetUserId);
}

public interface ISkillService
{
    Task<SkillResponse?>             GetByIdAsync(int id);
    Task<IEnumerable<SkillResponse>> GetAllAsync();
    Task<IEnumerable<SkillResponse>> GetAllByCompanyAsync(int companyId);
    Task<IEnumerable<SkillResponse>> GetByRoleAsync(int roleId);
    Task<int>                        CreateAsync(CreateSkillRequest request);
    Task                             UpdateAsync(int id, UpdateSkillRequest request);
    Task                             DeleteAsync(int id);
    Task                             UpsertExpectationAsync(UpsertExpectationRequest request);
    Task<IEnumerable<SkillExpectationDto>> GetExpectationsBySkillAsync(int skillId);
    Task                             DeleteExpectationAsync(int skillId, int roleId, int gradeId);
    Task<IEnumerable<SkillDescriptionDto>> GetDescriptionsAsync(int skillId);
    Task                             UpsertDescriptionAsync(UpsertDescriptionRequest request);
}

public interface IAssessmentService
{
    Task<IEnumerable<AssessmentResponse>> GetByUserAsync(Guid userId);
    Task                                  UpsertAsync(UpsertAssessmentRequest request);
    Task<IEnumerable<ComparisonRow>>      CompareAsync(Guid userAId, Guid userBId, Guid? userCId = null);
}

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
}

public interface IRoleGradeService
{
    Task<IEnumerable<CategoryResponse>> GetAllCategoriesAsync();
    Task<IEnumerable<RoleResponse>>  GetAllRolesAsync();
    Task<IEnumerable<GradeResponse>> GetAllGradesAsync();
}

public interface ICompanyService
{
    Task<CompanyResponse?>             GetByIdAsync(int id);
    Task<IEnumerable<CompanyResponse>> GetAllAsync();
    Task<int>                          CreateAsync(CreateCompanyRequest request);
    Task                               UpdateAsync(int id, UpdateCompanyRequest request);
    Task                               DeleteAsync(int id);
    Task                               AddUserAsync(int companyId, Guid userId);
    Task                               RemoveUserAsync(int companyId, Guid userId);
}

public interface ITeamService
{
    Task<TeamResponse?>                  GetByIdAsync(int id);
    Task<IEnumerable<TeamListItemResponse>> GetAllAsync(Guid? currentUserId = null);
    Task<IEnumerable<TeamListItemResponse>> GetAllByCompanyAsync(int companyId);
    Task<IEnumerable<Guid>>              GetAssignedMemberIdsAsync(int? excludeTeamId = null);
    Task<int>                            CreateAsync(CreateTeamRequest request);
    Task                                 UpdateAsync(int id, UpdateTeamRequest request);
    Task                                 DeleteAsync(int id);
}
