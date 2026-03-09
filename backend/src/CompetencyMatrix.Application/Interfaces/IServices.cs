using CompetencyMatrix.Application.DTOs;

namespace CompetencyMatrix.Application.Interfaces;

public interface IUserService
{
    Task<UserResponse?>          GetByIdAsync(Guid id);
    Task<IEnumerable<UserResponse>> GetAllAsync();
    Task<Guid>                   CreateAsync(CreateUserRequest request);
    Task                         UpdateAsync(Guid id, UpdateUserRequest request);
    Task                         ResetPasswordAsync(Guid id, string newPassword);
    Task                         DeleteAsync(Guid id);
}

public interface ISkillService
{
    Task<SkillResponse?>             GetByIdAsync(int id);
    Task<IEnumerable<SkillResponse>> GetAllAsync();
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
