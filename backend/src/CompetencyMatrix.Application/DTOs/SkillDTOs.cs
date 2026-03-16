namespace CompetencyMatrix.Application.DTOs;

public record CreateSkillRequest(
    string  Name,
    int     CategoryId,
    int?    CompanyId = null
);

public record UpdateSkillRequest(
    string  Name,
    int     CategoryId
);

public record SkillResponse(
    int     Id,
    string  Name,
    string  Category,
    int     CategoryId,
    int     CompanyId
);

public record UpsertDescriptionRequest(
    int    SkillId,
    int    RoleId,
    string Level,
    string Description
);

public record SkillDescriptionDto(
    int    Id,
    int    SkillId,
    int    RoleId,
    string Level,
    string Description
);

public record SkillExpectationDto(
    int    Id,
    int    SkillId,
    int    RoleId,
    int    GradeId,
    string ExpectedLevel,
    bool   IsRequired
);

public record UpsertExpectationRequest(
    int    SkillId,
    int    RoleId,
    int    GradeId,
    string ExpectedLevel,
    bool   IsRequired
);
