namespace CompetencyMatrix.Application.DTOs;

public record AssessmentResponse(
    int     SkillId,
    string  SkillName,
    string  ExpectedLevel,
    string  CurrentLevel,
    int     Gap,
    string? RoleName = null
);

public record UpsertAssessmentRequest(
    Guid   UserId,
    int    SkillId,
    string CurrentLevel
);

public record ComparisonRow(
    int     SkillId,
    string  SkillName,
    string  ExpectedLevel,
    string  UserALevel,
    string  UserBLevel,
    int     GapA,
    int     GapB,
    string? UserCLevel = null,
    int?    GapC       = null
);
