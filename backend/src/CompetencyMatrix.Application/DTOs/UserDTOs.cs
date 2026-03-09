namespace CompetencyMatrix.Application.DTOs;

public record CreateUserRequest(
    string Name,
    string Email,
    string Password,
    int?   RoleId,
    int?   GradeId,
    bool   IsManager
);

public record UpdateUserRequest(
    string Name,
    int?   RoleId,
    int?   GradeId,
    bool   IsManager
);

public record ResetPasswordRequest(
    string Password
);

public record UserResponse(
    Guid    Id,
    string  Name,
    string  Email,
    int?    RoleId,
    string? RoleName,
    int?    GradeId,
    string? GradeName,
    bool    IsManager,
    DateTime CreatedAt
);
