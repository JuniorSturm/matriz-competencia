namespace CompetencyMatrix.Application.DTOs;

public record CreateTeamRequest(
    int    CompanyId,
    string Name,
    string? Description,
    List<TeamMemberRequest> Members,
    List<int>? CompetencyIds = null
);

public record TeamMemberRequest(Guid UserId, bool IsLeader);

public record UpdateTeamRequest(
    string Name,
    string? Description,
    List<TeamMemberRequest> Members,
    List<int>? CompetencyIds = null
);

public record TeamResponse(
    int      Id,
    int      CompanyId,
    string?  CompanyName,
    string   Name,
    string?  Description,
    DateTime CreatedAt,
    List<TeamMemberResponse> Members,
    List<int> CompetencyIds
);

public record TeamMemberResponse(
    Guid   UserId,
    string UserName,
    string UserEmail,
    bool   IsLeader
);

public record TeamListItemResponse(
    int      Id,
    int      CompanyId,
    string?  CompanyName,
    string   Name,
    string?  Description,
    int      MemberCount,
    string?  LeaderName,
    DateTime CreatedAt
);
